import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { filter, first } from 'rxjs/operators';
import { LucideAlertCircle, LucideLoader } from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth',
  imports: [LucideAlertCircle, LucideLoader],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',
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
      .subscribe(() => this.router.navigate(['/my-notes']));
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
