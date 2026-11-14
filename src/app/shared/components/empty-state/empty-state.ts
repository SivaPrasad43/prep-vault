import { Component, input } from '@angular/core';
import { ZardEmptyComponent } from '@/shared/ui/empty';
import { provideIcons } from '@ng-icons/core';
import { lucideNotebookPen } from '@ng-icons/lucide';

@Component({
  selector: 'app-empty-state',
  imports: [ZardEmptyComponent],
  template: `
    <z-empty class="py-16" zIcon="lucideNotebookPen" [zTitle]="title()" [zDescription]="message()" />
  `,
  viewProviders: [provideIcons({ lucideNotebookPen })],
})
export class EmptyState {
  readonly title = input('Nothing here yet');
  readonly message = input('');
}
