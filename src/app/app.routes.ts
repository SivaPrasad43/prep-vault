import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/auth').then((m) => m.Auth),
  },
  {
    path: '',
    loadComponent: () => import('./layout/layout').then((m) => m.Layout),
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'my-notes', pathMatch: 'full' },
      {
        path: 'my-notes',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/analytics/analytics').then((m) => m.Analytics),
      },
      // Edit and read are the same page now.
      { path: 'notes/:id/edit', redirectTo: 'notes/:id' },
      {
        // Also serves `notes/new`: one route so the component (and editor focus) survives the
        // redirect from /notes/new to /notes/:id after the note is first saved.
        path: 'notes/:id',
        loadComponent: () =>
          import('./features/notes/note-page/note-page').then((m) => m.NotePage),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'my-notes',
  },
];
