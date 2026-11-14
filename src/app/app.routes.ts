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
      { path: '', redirectTo: 'notes', pathMatch: 'full' },
      // Old URL; the notes list now lives at /notes.
      { path: 'my-notes', redirectTo: 'notes', pathMatch: 'full' },
      {
        // Gmail-style workspace: note list + reading/editing pane.
        path: 'notes',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.Dashboard),
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/notes/note-empty/note-empty').then((m) => m.NoteEmpty),
          },
          // Edit and read are the same page now.
          { path: ':id/edit', redirectTo: ':id' },
          {
            // Also serves `notes/new`: one route so the component (and editor focus) survives the
            // redirect from /notes/new to /notes/:id after the note is first saved.
            path: ':id',
            loadComponent: () =>
              import('./features/notes/note-page/note-page').then((m) => m.NotePage),
          },
        ],
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/analytics/analytics').then((m) => m.Analytics),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'notes',
  },
];
