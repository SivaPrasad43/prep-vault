import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { filter, first } from 'rxjs/operators';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideLoaderCircle, lucideVault } from '@ng-icons/lucide';
import { ZardCardImports } from '@/shared/ui/card';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth',
  imports: [NgIcon, ...ZardCardImports],
  templateUrl: './auth.html',
  viewProviders: [provideIcons({ lucideCircleAlert, lucideLoaderCircle, lucideVault })],
})
export class Auth implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  protected error = signal('');
  protected loading = signal(false);

  ngOnInit(): void {
    // Already signed in (or just returned from Google) → go straight to the vault.
    this.authService.authState$
      .pipe(
        filter((s) => !s.loading && s.user !== null),
        first(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.router.navigate(['/notes']));
  }

  protected signInWithGoogle(): void {
    this.error.set('');
    this.loading.set(true);

    // On success the browser leaves the page, so loading stays on.
    this.authService.signInWithGoogle().subscribe({
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Could not start Google sign-in');
      },
    });
  }
}
