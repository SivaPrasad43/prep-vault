import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type ThemeMode = 'light' | 'dark';

// v2 key: the old key auto-saved 'dark' for everyone (dark was the default), so it
// can't tell an explicit choice from the old default. Light is the default now.
const STORAGE_KEY = 'prep-vault-theme-v2';

/**
 * Light/dark mode via the `.dark` class on <html> (ZardUI/Tailwind tokens).
 * index.html applies the saved mode before first paint; this keeps it in sync.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly _mode = signal<ThemeMode>(this.loadSaved());

  readonly mode = this._mode.asReadonly();
  readonly isDark = computed(() => this._mode() === 'dark');

  constructor() {
    if (!this.isBrowser) return;
    effect(() => {
      const mode = this._mode();
      document.documentElement.classList.toggle('dark', mode === 'dark');
      document.documentElement.style.colorScheme = mode;
      localStorage.setItem(STORAGE_KEY, mode);
    });
  }

  toggle(): void {
    this._mode.update((m) => (m === 'light' ? 'dark' : 'light'));
  }

  setMode(mode: ThemeMode): void {
    this._mode.set(mode);
  }

  private loadSaved(): ThemeMode {
    if (!this.isBrowser) return 'light';
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  }
}
