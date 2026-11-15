/**
 * Gamification rules (pure, derived from notes + revisions; no stored XP).
 * Study action = a note created or a note revised. Days are local calendar days.
 */
import {
  addDays, bestStreak, currentStreak, dayKey, startOfDay, studyDays,
  type StatNote, type StatRevision,
} from './study-stats';

export const DEFAULT_DAILY_GOAL = 3;
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100];

export const XP = {
  note: 10,
  revision: 5,
  confident: 15,
  goalDay: 20,
  streakDay: 2,
} as const;

export const LEVELS: { level: number; name: string; xp: number }[] = [
  { level: 1, name: 'Rookie', xp: 0 },
  { level: 2, name: 'Note-taker', xp: 100 },
  { level: 3, name: 'Grinder', xp: 250 },
  { level: 4, name: 'Problem-solver', xp: 500 },
  { level: 5, name: 'Pattern-spotter', xp: 900 },
  { level: 6, name: 'System-thinker', xp: 1400 },
  { level: 7, name: 'Whiteboard-ready', xp: 2100 },
  { level: 8, name: 'Interview-ready', xp: 3000 },
  { level: 9, name: 'Offer-magnet', xp: 4200 },
  { level: 10, name: 'Legend', xp: 6000 },
];

/** Study actions (notes written + revisions) per local day. */
export function actionsPerDay(notes: StatNote[], revisions: StatRevision[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const n of notes) m.set(dayKey(n.created_at), (m.get(dayKey(n.created_at)) ?? 0) + 1);
  for (const r of revisions) m.set(dayKey(r.revised_at), (m.get(dayKey(r.revised_at)) ?? 0) + 1);
  return m;
}

export function totalXp(notes: StatNote[], revisions: StatRevision[], goal: number): number {
  const perDay = actionsPerDay(notes, revisions);
  const goalDays = [...perDay.values()].filter((c) => c >= goal).length;
  const days = studyDays(notes.map((n) => n.created_at), revisions.map((r) => r.revised_at));
  const confident = notes.filter((n) => n.confidence_level === 'confident').length;
  return (
    notes.length * XP.note +
    revisions.length * XP.revision +
    confident * XP.confident +
    goalDays * XP.goalDay +
    days.size * XP.streakDay
  );
}

export interface LevelInfo {
  level: number;
  name: string;
  xp: number;
  /** XP at the start of this level and at the next one (null at max level). */
  floor: number;
  next: number | null;
  nextName: string | null;
  /** 0–100 progress towards the next level. */
  pct: number;
}

export function levelFor(xp: number): LevelInfo {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].xp) idx = i;
  const cur = LEVELS[idx];
  const nxt = LEVELS[idx + 1] ?? null;
  const pct = nxt ? Math.min(100, Math.round(((xp - cur.xp) / (nxt.xp - cur.xp)) * 100)) : 100;
  return { level: cur.level, name: cur.name, xp, floor: cur.xp, next: nxt?.xp ?? null, nextName: nxt?.name ?? null, pct };
}

export interface WeekDay {
  key: string;
  label: string;
  isToday: boolean;
  isFuture: boolean;
  count: number;
  goalMet: boolean;
}

/** Mon–Sun of the current week with activity counts. */
export function thisWeek(perDay: Map<string, number>, goal: number, today: Date = new Date()): WeekDay[] {
  const t = startOfDay(today);
  const monday = addDays(t, -((t.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i);
    const key = dayKey(d);
    const count = perDay.get(key) ?? 0;
    return {
      key,
      label: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
      isToday: key === dayKey(t),
      isFuture: d.getTime() > t.getTime(),
      count,
      goalMet: count >= goal,
    };
  });
}

export function nextMilestone(streak: number): { target: number; remaining: number; prev: number } | null {
  const target = STREAK_MILESTONES.find((m) => m > streak);
  if (!target) return null;
  const prev = [...STREAK_MILESTONES].reverse().find((m) => m <= streak) ?? 0;
  return { target, remaining: target - streak, prev };
}

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  unlocked: boolean;
}

export function achievements(
  notes: StatNote[],
  revisions: StatRevision[],
  goal: number,
): Achievement[] {
  const days = studyDays(notes.map((n) => n.created_at), revisions.map((r) => r.revised_at));
  const best = bestStreak(days);
  const confident = notes.filter((n) => n.confidence_level === 'confident').length;
  const categories = new Set(notes.map((n) => n.category_id)).size;
  const goalDays = [...actionsPerDay(notes, revisions).values()].filter((c) => c >= goal).length;
  const hours = revisions.map((r) => new Date(r.revised_at).getHours());
  const nightOwl = hours.some((h) => h >= 0 && h < 5) ? 1 : 0;
  const earlyBird = hours.some((h) => h >= 5 && h < 8) ? 1 : 0;

  const a = (id: string, emoji: string, title: string, description: string, progress: number, target: number): Achievement => ({
    id, emoji, title, description, progress: Math.min(progress, target), target, unlocked: progress >= target,
  });

  return [
    a('first-note', '✍️', 'First note', 'Write your first note', notes.length, 1),
    a('notes-10', '📚', 'Bookworm', 'Write 10 notes', notes.length, 10),
    a('notes-50', '🏛️', 'Librarian', 'Write 50 notes', notes.length, 50),
    a('first-revision', '🔁', 'First revision', 'Mark a note revised', revisions.length, 1),
    a('revisions-50', '💪', 'Repetition', 'Revise 50 times', revisions.length, 50),
    a('revisions-200', '🧠', 'Spaced pro', 'Revise 200 times', revisions.length, 200),
    a('streak-3', '🔥', 'Warming up', 'Reach a 3-day streak', best, 3),
    a('streak-7', '🗓️', 'One week strong', 'Reach a 7-day streak', best, 7),
    a('streak-30', '🏆', 'Month of focus', 'Reach a 30-day streak', best, 30),
    a('streak-100', '💯', 'Unstoppable', 'Reach a 100-day streak', best, 100),
    a('confident-10', '🎯', 'Confident ×10', 'Have 10 notes marked Confident', confident, 10),
    a('polyglot', '🧭', 'Polyglot', 'Write notes in 5 categories', categories, 5),
    a('goal-7', '⭐', 'Goal getter', 'Hit your daily goal on 7 days', goalDays, 7),
    a('night-owl', '🦉', 'Night owl', 'Revise between midnight and 5 am', nightOwl, 1),
    a('early-bird', '🐦', 'Early bird', 'Revise between 5 and 8 am', earlyBird, 1),
  ];
}

/** Snapshot used to detect what's new since the last celebration. */
export function summary(notes: StatNote[], revisions: StatRevision[], goal: number, today: Date = new Date()) {
  const days = studyDays(notes.map((n) => n.created_at), revisions.map((r) => r.revised_at));
  const perDay = actionsPerDay(notes, revisions);
  const todayCount = perDay.get(dayKey(today)) ?? 0;
  const xp = totalXp(notes, revisions, goal);
  return {
    streak: currentStreak(days, today),
    best: bestStreak(days),
    todayKey: dayKey(today),
    todayCount,
    todayDone: todayCount > 0,
    goalMet: todayCount >= goal,
    perDay,
    xp,
    level: levelFor(xp),
    achievements: achievements(notes, revisions, goal),
  };
}
