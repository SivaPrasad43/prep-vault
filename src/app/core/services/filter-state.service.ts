import { Injectable, signal, computed } from '@angular/core';
import type { NoteFilters, SortOption, SmartFilter, ConfidenceLevel } from '../models';

@Injectable({
  providedIn: 'root',
})
export class FilterStateService {
  private _categoryId = signal<string | null>(null);
  private _searchQuery = signal<string>('');
  private _confidenceLevel = signal<ConfidenceLevel | null>(null);
  private _smartFilter = signal<SmartFilter | null>(null);
  private _tagIds = signal<string[]>([]);
  private _sortBy = signal<SortOption>('recent');

  readonly categoryId = this._categoryId.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly confidenceLevel = this._confidenceLevel.asReadonly();
  readonly smartFilter = this._smartFilter.asReadonly();
  readonly tagIds = this._tagIds.asReadonly();
  readonly sortBy = this._sortBy.asReadonly();

  readonly filters = computed<NoteFilters>(() => ({
    categoryId: this._categoryId(),
    searchQuery: this._searchQuery(),
    confidenceLevel: this._confidenceLevel(),
    smartFilter: this._smartFilter(),
    tagIds: this._tagIds(),
    sortBy: this._sortBy(),
  }));

  readonly hasActiveFilters = computed(() => {
    return (
      this._categoryId() !== null ||
      this._searchQuery() !== '' ||
      this._confidenceLevel() !== null ||
      this._smartFilter() !== null ||
      this._tagIds().length > 0
    );
  });

  setCategoryId(id: string | null): void {
    this._categoryId.set(id);
  }

  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  setConfidenceLevel(level: ConfidenceLevel | null): void {
    this._confidenceLevel.set(level);
  }

  setSmartFilter(filter: SmartFilter | null): void {
    this._smartFilter.set(filter);
  }

  toggleTag(tagId: string): void {
    this._tagIds.update((ids) =>
      ids.includes(tagId) ? ids.filter((id) => id !== tagId) : [...ids, tagId],
    );
  }

  setSortBy(sort: SortOption): void {
    this._sortBy.set(sort);
  }

  resetFilters(): void {
    this._categoryId.set(null);
    this._searchQuery.set('');
    this._confidenceLevel.set(null);
    this._smartFilter.set(null);
    this._tagIds.set([]);
    this._sortBy.set('recent');
  }
}
