export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  note_count?: number;
}

export interface CreateTagPayload {
  name: string;
  color?: string;
}
