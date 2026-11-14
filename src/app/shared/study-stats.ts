/**
 * Pure study-statistics helpers shared by the notes list (streak badge) and the
 * Progress page. Dates are bucketed by the user's *local* calendar day.
 */
import type { ConfidenceLevel } from '../core/models';

export interface StatNote {
  id: string;
  title: string;
  category_id: string;
  confidence_level: ConfidenceLevel;
  created_at: string;
}

export interface StatRevision {
  note_id: string;
  revised_at: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar day key, e.g. "2026-11-14". */
export function dayKey(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${day}`;
}

/** Local midnight for `d` (defaults to today). */
export function startOfDay(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Days with any study activity: a note created or any note revised. */
export function studyDays(createdAt: string[], revisedAt: string[]): Set<string> {
  return new Set([...createdAt, ...revisedAt].map(dayKey));
}

/** Consecutive study days ending today, or yesterday if today has no activity yet. */
export function currentStreak(days: Set<string>, today: Date = new Date()): number {
  let cursor = startOfDay(today);
  if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive study days ever. */
export function bestStreak(days: Set<string>): number {
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of sorted) {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    run = prev && Math.round((date.getTime() - prev.getTime()) / DAY_MS) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = date;
  }
  return best;
}

/** Number of timestamps within [from, to) (local days). */
export function countBetween(timestamps: string[], from: Date, to: Date): number {
  const a = from.getTime();
  const b = to.getTime();
  return timestamps.reduce((n, t) => {
    const v = new Date(t).getTime();
    return v >= a && v < b ? n + 1 : n;
  }, 0);
}

/** Percentage change vs previous period; null when there's nothing to compare against. */
export function trend(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export interface HeatCell {
  key: string;
  date: Date;
  notes: number;
  revisions: number;
  total: number;
  /** 0 = none … 4 = busiest; -1 = padding cell outside the range. */
  level: number;
}

/**
 * Activity calendar for the last `rangeDays` days (today included), laid out as
 * week columns (Mon → Sun rows), GitHub-style. Cells before the range are padding.
 */
export function heatmap(createdAt: string[], revisedAt: string[], rangeDays: number, today: Date = new Date()): HeatCell[][] {
  const end = startOfDay(today);
  const start = addDays(end, -(rangeDays - 1));
  const notes = new Map<string, number>();
  const revs = new Map<string, number>();
  for (const t of createdAt) notes.set(dayKey(t), (notes.get(dayKey(t)) ?? 0) + 1);
  for (const t of revisedAt) revs.set(dayKey(t), (revs.get(dayKey(t)) ?? 0) + 1);

  // Align the first column to Monday.
  const mondayOffset = (start.getDay() + 6) % 7;
  const gridStart = addDays(start, -mondayOffset);
  const cells: HeatCell[] = [];
  let max = 0;
  for (let d = gridStart; d.getTime() <= end.getTime(); d = addDays(d, 1)) {
    const key = dayKey(d);
    const inRange = d.getTime() >= start.getTime();
    const n = inRange ? (notes.get(key) ?? 0) : 0;
    const r = inRange ? (revs.get(key) ?? 0) : 0;
    max = Math.max(max, n + r);
    cells.push({ key, date: d, notes: n, revisions: r, total: n + r, level: inRange ? 0 : -1 });
  }
  for (const c of cells) {
    if (c.level === -1 || c.total === 0) continue;
    c.level = max <= 1 ? 4 : Math.min(4, Math.max(1, Math.ceil((c.total / max) * 4)));
  }
  const weeks: HeatCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export interface ReviewItem {
  note: StatNote;
  lastRevised: Date | null;
  daysSince: number;
  score: number;
}

const CONFIDENCE_WEIGHT: Record<ConfidenceLevel, number> = {
  need_practice: 3,
  getting_there: 2,
  confident: 1,
};

/**
 * Notes most in need of revision: weaker confidence and longer since last touched
 * rank higher. Confident notes only appear once they're 30+ days stale.
 */
export function reviewNext(notes: StatNote[], revisions: StatRevision[], limit = 5, today: Date = new Date()): ReviewItem[] {
  const last = new Map<string, number>();
  for (const r of revisions) {
    const t = new Date(r.revised_at).getTime();
    if (t > (last.get(r.note_id) ?? 0)) last.set(r.note_id, t);
  }
  const now = startOfDay(today).getTime();
  return notes
    .map((note) => {
      const lastT = last.get(note.id) ?? null;
      const since = lastT ?? new Date(note.created_at).getTime();
      const daysSince = Math.max(0, Math.floor((now - startOfDay(new Date(since)).getTime()) / DAY_MS));
      // +1 so a note touched today still ranks by confidence.
      const score = CONFIDENCE_WEIGHT[note.confidence_level] * (daysSince + 1) * (lastT ? 1 : 1.5);
      return { note, lastRevised: lastT ? new Date(lastT) : null, daysSince, score };
    })
    .filter((i) => i.note.confidence_level !== 'confident' || i.daysSince >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export interface CategoryConfidence {
  categoryId: string;
  total: number;
  need_practice: number;
  getting_there: number;
  confident: number;
}

/** Per-category confidence counts, weakest category (highest share of "need practice") first. */
export function confidenceByCategory(notes: StatNote[]): CategoryConfidence[] {
  const map = new Map<string, CategoryConfidence>();
  for (const n of notes) {
    const row = map.get(n.category_id) ?? {
      categoryId: n.category_id,
      total: 0,
      need_practice: 0,
      getting_there: 0,
      confident: 0,
    };
    row.total++;
    row[n.confidence_level]++;
    map.set(n.category_id, row);
  }
  const weakness = (r: CategoryConfidence) => (r.need_practice * 2 + r.getting_there) / r.total;
  return [...map.values()].sort((a, b) => weakness(b) - weakness(a) || b.total - a.total);
}
