import type { ConfidenceLevel } from './note.model';

export type SortOption = 'recent' | 'edited' | 'title';
export type SmartFilter = 'favorites' | 'pinned' | 'recently_added' | 'recently_edited';

export interface NoteFilters {
  categoryId: string | null;
  searchQuery: string;
  confidenceLevel: ConfidenceLevel | null;
  smartFilter: SmartFilter | null;
  tagIds: string[];
  sortBy: SortOption;
}
