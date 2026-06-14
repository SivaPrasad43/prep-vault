import { Component, input } from '@angular/core';
import { LucideFileText } from '@lucide/angular';

@Component({
  selector: 'app-empty-state',
  imports: [LucideFileText],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyState {
  readonly title = input('Nothing here yet');
  readonly message = input('');
}
