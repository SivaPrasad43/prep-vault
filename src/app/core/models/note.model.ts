export interface CodeSnippet {
  language: string;
  code: string;
  filename?: string;
}

export interface Link {
  label: string;
  url: string;
}

export type ConfidenceLevel = 'need_practice' | 'getting_there' | 'confident';

export interface TextBlock {
  type: 'text';
  content: string;
}

export interface CodeBlock {
  type: 'code';
  language: string;
  code: string;
  filename?: string;
}

export interface LinkBlock {
  type: 'link';
  label: string;
  url: string;
}

export type ContentBlock = TextBlock | CodeBlock | LinkBlock;

export interface Note {
  id: string;
  user_id: string;
  title: string;
  category_id: string;
  description: string | null;
  code_snippets: CodeSnippet[];
  links: Link[];
  content_blocks: ContentBlock[] | null;
  body_markdown: string | null;
  confidence_level: ConfidenceLevel;
  is_favorite: boolean;
  /** Secret token for the public read-only link (/s/<token>); null = not shared. */
  share_token?: string | null;
  shared_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** What the public page gets for a shared note (via get_shared_note). */
export interface SharedNote {
  title: string;
  body_markdown: string | null;
  updated_at: string;
  author_name: string | null;
}

export interface CreateNotePayload {
  title: string;
  category_id: string;
  description?: string | null;
  code_snippets?: CodeSnippet[];
  links?: Link[];
  content_blocks?: ContentBlock[];
  body_markdown?: string;
  confidence_level?: ConfidenceLevel;
  is_favorite?: boolean;
}

export interface UpdateNotePayload extends Partial<CreateNotePayload> {
  share_token?: string | null;
  shared_at?: string | null;
}

export interface NoteStats {
  total: number;
  revisedToday: number;
  confident: number;
  needPractice: number;
  gettingThere: number;
  currentStreak: number;
}
