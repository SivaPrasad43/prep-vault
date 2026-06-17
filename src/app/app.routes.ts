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
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/analytics/analytics').then((m) => m.Analytics),
      },
      {
        path: 'notes/new',
        loadComponent: () =>
          import('./features/notes/note-form/note-form').then((m) => m.NoteForm),
      },
      {
        path: 'notes/:id',
        loadComponent: () =>
          import('./features/notes/note-detail/note-detail').then((m) => m.NoteDetail),
      },
      {
        path: 'notes/:id/edit',
        loadComponent: () =>
          import('./features/notes/note-form/note-form').then((m) => m.NoteForm),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
