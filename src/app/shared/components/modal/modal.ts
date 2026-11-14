import { Component, input, output, HostListener } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';

@Component({
  selector: 'app-modal',
  imports: [NgIcon],
  templateUrl: './modal.html',
  viewProviders: [provideIcons({ lucideX })],
})
export class Modal {
  readonly open = input(false);
  readonly title = input('');
  readonly closable = input(true);
  readonly close = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open() && this.closable()) {
      this.close.emit();
    }
  }

  onOverlayClick(): void {
    if (this.closable()) {
      this.close.emit();
    }
  }
}
