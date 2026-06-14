import { Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideSearch, LucideX } from '@lucide/angular';

@Component({
  selector: 'app-search-bar',
  imports: [FormsModule, LucideSearch, LucideX],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.scss',
})
export class SearchBar {
  readonly searchChange = output<string>();
  protected query = signal('');

  protected onInput(value: string): void {
    this.query.set(value);
    this.searchChange.emit(value);
  }

  protected clear(): void {
    this.query.set('');
    this.searchChange.emit('');
  }
}
