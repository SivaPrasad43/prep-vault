import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { switchMap, map, take } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  canActivate() {
    return this.authService.validateSession().pipe(
      switchMap((valid) => {
        console.log("sssss : ",valid)
        if (!valid) {
          this.router.navigate(['/auth']);
          return of(false);
        }
        return this.authService.isAuthenticated$.pipe(
          take(1),
          map((isAuthenticated) => {
            if (!isAuthenticated) {
              this.router.navigate(['/auth']);
              return false;
            }
            return true;
          }),
        );
      }),
    );
  }
}
