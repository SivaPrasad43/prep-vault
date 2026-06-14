import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from './sidebar/sidebar';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Sidebar],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  protected readonly sidebarOpen = signal(false);

  protected onToggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  protected onCloseSidebar(): void {
    this.sidebarOpen.set(false);
  }
}
