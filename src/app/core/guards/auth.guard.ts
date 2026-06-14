import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import type { CanActivate, UrlTree } from '@angular/router';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.validateSession().pipe(
      map((valid) => valid || this.router.createUrlTree(['/auth'])),
    );
  }
}
