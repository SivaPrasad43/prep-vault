import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, type CanActivateFn } from '@angular/router';
import { map } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** `/` shows the landing page to visitors; signed-in users go straight to their notes. */
export const landingGuard: CanActivateFn = () => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return of(true); // prerender: always the landing
  const router = inject(Router);
  return inject(AuthService)
    .validateSession()
    .pipe(map((signedIn) => (signedIn ? router.createUrlTree(['/notes']) : true)));
};
