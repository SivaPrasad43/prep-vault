import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject } from 'rxjs';
import { ProgressService } from './progress.service';
import { NotesService } from './notes.service';
import { RevisionsService } from './revisions.service';
import { AuthService } from './auth.service';
import type { StatNote, StatRevision } from '../../shared/study-stats';
import {
  DEFAULT_DAILY_GOAL, STREAK_MILESTONES, XP, nextMilestone, summary, thisWeek, type Achievement, type LevelInfo,
} from '../../shared/gamification';

export type Celebration =
  | { kind: 'toast'; emoji: string; title: string; text?: string }
  | { kind: 'milestone'; streak: number }
  | { kind: 'level'; level: LevelInfo }
  | { kind: 'achievement'; achievement: Achievement };

interface Celebrated {
  days: string[]; // study days already announced ("streak extended")
  goalDays: string[]; // days whose "goal met" toast was shown
  milestones: number[];
  level: number;
  achievements: string[];
}

const GOAL_KEY = 'prepday-daily-goal';
const celebratedKey = (uid: string) => `prepday-celebrated:${uid}`;

/**
 * Live streak / XP / level / achievement state derived from notes + revisions,
 * plus a queue of celebrations for newly reached milestones (shown once per user).
 */
@Injectable({ providedIn: 'root' })
export class GamificationService {
  private progress = inject(ProgressService);
  private notesService = inject(NotesService);
  private revisionsService = inject(RevisionsService);
  private auth = inject(AuthService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly notes = signal<StatNote[]>([]);
  private readonly revisions = signal<StatRevision[]>([]);
  readonly loaded = signal(false);
  readonly goal = signal(this.readGoal());
  /** Ticks every minute so "today" and the evening nudge stay current. */
  private readonly now = signal(new Date());

  private readonly _celebrations = new Subject<Celebration>();
  readonly celebrations$ = this._celebrations.asObservable();
  /** XP gained by the latest action (for the "+5 XP" float). */
  readonly lastGain = signal<{ xp: number; goalMet: boolean; at: number } | null>(null);

  private readonly snap = computed(() => summary(this.notes(), this.revisions(), this.goal(), this.now()));

  readonly streak = computed(() => this.snap().streak);
  readonly best = computed(() => this.snap().best);
  readonly todayCount = computed(() => this.snap().todayCount);
  readonly todayDone = computed(() => this.snap().todayDone);
  readonly goalMet = computed(() => this.snap().goalMet);
  readonly goalPct = computed(() => Math.min(100, Math.round((this.todayCount() / this.goal()) * 100)));
  readonly xp = computed(() => this.snap().xp);
  readonly level = computed(() => this.snap().level);
  readonly achievements = computed(() => this.snap().achievements);
  readonly unlockedCount = computed(() => this.achievements().filter((a) => a.unlocked).length);
  readonly week = computed(() => thisWeek(this.snap().perDay, this.goal(), this.now()));
  readonly nextMilestone = computed(() => nextMilestone(this.streak()));
  /** Evening, has a streak, but nothing studied today yet. */
  readonly atRisk = computed(() => this.now().getHours() >= 18 && this.streak() > 0 && !this.todayDone());

  private started = false;
  private userId: string | null = null;

  /** Load once and keep live. Safe to call from several components. */
  init(): void {
    if (!this.isBrowser || this.started) return;
    const uid = this.auth.userId;
    if (!uid) return;
    this.started = true;
    this.userId = uid;

    setInterval(() => this.now.set(new Date()), 60_000);

    this.progress.load().subscribe({
      next: ({ notes, revisions }) => {
        this.notes.set(notes);
        this.revisions.set(revisions);
        this.loaded.set(true);
        this.check(true); // seed silently: never celebrate history
      },
      error: () => this.loaded.set(true),
    });

    this.notesService.changes$.subscribe((change) => {
      if (change.type === 'delete') {
        this.notes.update((ns) => ns.filter((n) => n.id !== change.id));
        this.revisions.update((rs) => rs.filter((r) => r.note_id !== change.id));
        return;
      }
      const n = change.note;
      const row: StatNote = {
        id: n.id, title: n.title, category_id: n.category_id, confidence_level: n.confidence_level, created_at: n.created_at,
      };
      const isNew = !this.notes().some((x) => x.id === n.id);
      this.notes.update((ns) => (isNew ? [...ns, row] : ns.map((x) => (x.id === n.id ? row : x))));
      if (isNew) this.gain(XP.note);
      this.check(false);
    });

    this.revisionsService.logged$.subscribe((rev) => {
      this.revisions.update((rs) => [...rs, { note_id: rev.note_id, revised_at: rev.revised_at }]);
      this.gain(XP.revision);
      this.check(false);
    });
  }

  setGoal(n: number): void {
    const goal = Math.min(10, Math.max(1, Math.round(n)));
    this.goal.set(goal);
    if (this.isBrowser) localStorage.setItem(GOAL_KEY, String(goal));
  }

  /** Top review-next note id for the at-risk nudge (weakest, longest untouched). */
  readonly weakestNoteId = computed(() => {
    const order = { need_practice: 0, getting_there: 1, confident: 2 } as const;
    const last = new Map<string, number>();
    for (const r of this.revisions()) last.set(r.note_id, Math.max(last.get(r.note_id) ?? 0, new Date(r.revised_at).getTime()));
    return [...this.notes()]
      .sort((a, b) => order[a.confidence_level] - order[b.confidence_level] || (last.get(a.id) ?? 0) - (last.get(b.id) ?? 0))[0]?.id ?? null;
  });

  private gain(xp: number): void {
    const s = this.snap();
    this.lastGain.set({ xp, goalMet: s.goalMet && s.todayCount === this.goal(), at: Date.now() });
  }

  private readGoal(): number {
    if (typeof localStorage === 'undefined') return DEFAULT_DAILY_GOAL;
    const v = Number(localStorage.getItem(GOAL_KEY));
    return v >= 1 && v <= 10 ? v : DEFAULT_DAILY_GOAL;
  }

  private readCelebrated(): Celebrated | null {
    try {
      const raw = localStorage.getItem(celebratedKey(this.userId!));
      return raw ? (JSON.parse(raw) as Celebrated) : null;
    } catch {
      return null;
    }
  }

  /** Compare current state with what was already celebrated; queue anything new. */
  private check(seed: boolean): void {
    if (!this.userId) return;
    const s = this.snap();
    const stored = this.readCelebrated();
    const reachedMilestones = STREAK_MILESTONES.filter((m) => s.streak >= m);
    const unlocked = s.achievements.filter((a) => a.unlocked).map((a) => a.id);

    if (seed || !stored) {
      // Page load (or first time ever): remember the present state silently, so history
      // and progress made on other devices never trigger a burst of celebrations.
      const base: Celebrated = stored ?? { days: [], goalDays: [], milestones: [], level: 1, achievements: [] };
      const next: Celebrated = {
        days: s.todayDone ? [...new Set([...base.days, s.todayKey])].slice(-60) : base.days,
        goalDays: s.goalMet ? [...new Set([...base.goalDays, s.todayKey])].slice(-60) : base.goalDays,
        milestones: [...new Set([...base.milestones, ...reachedMilestones])],
        level: Math.max(base.level, s.level.level),
        achievements: [...new Set([...base.achievements, ...unlocked])],
      };
      localStorage.setItem(celebratedKey(this.userId), JSON.stringify(next));
      return;
    }

    const c = stored;
    if (s.todayDone && !c.days.includes(s.todayKey)) {
      c.days = [...c.days.slice(-60), s.todayKey];
      this._celebrations.next({
        kind: 'toast',
        emoji: '🔥',
        title: s.streak > 1 ? `Day ${s.streak}, streak extended!` : 'Streak started!',
        text: s.streak > 1 ? 'Keep it going tomorrow.' : 'Come back tomorrow to make it 2.',
      });
    }
    if (s.goalMet && !c.goalDays.includes(s.todayKey)) {
      c.goalDays = [...c.goalDays.slice(-60), s.todayKey];
      this._celebrations.next({ kind: 'toast', emoji: '🎯', title: 'Daily goal met!', text: `+${XP.goalDay} XP bonus` });
    }
    for (const m of reachedMilestones) {
      if (!c.milestones.includes(m)) {
        c.milestones.push(m);
        this._celebrations.next({ kind: 'milestone', streak: m });
      }
    }
    if (s.level.level > c.level) {
      c.level = s.level.level;
      this._celebrations.next({ kind: 'level', level: s.level });
    }
    for (const a of s.achievements) {
      if (a.unlocked && !c.achievements.includes(a.id)) {
        c.achievements.push(a.id);
        this._celebrations.next({ kind: 'achievement', achievement: a });
      }
    }
    localStorage.setItem(celebratedKey(this.userId), JSON.stringify(c));
  }

}
