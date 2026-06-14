export interface Revision {
  id: string;
  note_id: string;
  user_id: string;
  revised_at: string;
}

export interface RevisionDay {
  date: string;
  count: number;
}
