import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideMail, LucideLock, LucideLogIn, LucideEye, LucideEyeOff, LucideAlertCircle, LucideVault, LucideLoader } from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth',
  imports: [FormsModule, LucideMail, LucideLock, LucideLogIn, LucideEye, LucideEyeOff, LucideAlertCircle, LucideVault, LucideLoader],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',
})
export class Auth {
  protected email = '';
  protected password = '';
  protected error = '';
  protected loading = false;
  protected passwordVisible = false;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  protected onSubmit(): void {
    this.error = '';
    this.loading = true;

    this.authService.signIn(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.message || 'An error occurred';
      },
    });
  }
}
