import { Component, input, output, HostListener } from '@angular/core';
import { LucideX } from '@lucide/angular';

@Component({
  selector: 'app-modal',
  imports: [LucideX],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
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
