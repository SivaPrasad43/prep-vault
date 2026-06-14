import { Injectable, Inject, PLATFORM_ID, effect, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { lightTheme } from '../../theme/light-theme';
import { darkTheme } from '../../theme/dark-theme';
import type { Theme } from '../../theme/theme';

type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private _mode = signal<ThemeMode>('light');
  readonly mode = this._mode.asReadonly();

  private _theme = signal<Theme>(lightTheme);
  readonly theme = this._theme.asReadonly();

  readonly isDark = signal(false);
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      const saved = this.loadSavedTheme();
      this._mode.set(saved);
      this.applyTheme(saved);

      effect(() => {
        this.applyTheme(this._mode());
        this.saveTheme(this._mode());
      });
    }
  }

  toggle(): void {
    this._mode.update((m) => (m === 'light' ? 'dark' : 'light'));
    this.isDark.set(this._mode() === 'dark');
  }

  setMode(mode: ThemeMode): void {
    this._mode.set(mode);
    this.isDark.set(mode === 'dark');
  }

  private applyTheme(mode: ThemeMode): void {
    const t = mode === 'light' ? lightTheme : darkTheme;
    this._theme.set(t);
    this.isDark.set(mode === 'dark');

    if (!this.isBrowser) return;

    const root = document.documentElement;
    for (const [key, value] of Object.entries(t.colors)) {
      const cssVar = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    }

    for (const [key, value] of Object.entries(t.spacing)) {
      root.style.setProperty(`--spacing-${key}`, value);
    }

    for (const [key, value] of Object.entries(t.borderRadius)) {
      root.style.setProperty(`--radius-${key}`, value);
    }

    for (const [key, value] of Object.entries(t.fontSize)) {
      root.style.setProperty(`--font-${key}`, value);
    }

    for (const [key, value] of Object.entries(t.shadow)) {
      root.style.setProperty(`--shadow-${key}`, value);
    }

    for (const [key, value] of Object.entries(t.transition)) {
      root.style.setProperty(`--transition-${key}`, value);
    }

    root.setAttribute('data-theme', mode);
  }

  private loadSavedTheme(): ThemeMode {
    return (localStorage.getItem('prep-vault-theme') as ThemeMode) || 'light';
  }

  private saveTheme(mode: ThemeMode): void {
    localStorage.setItem('prep-vault-theme', mode);
  }
}
