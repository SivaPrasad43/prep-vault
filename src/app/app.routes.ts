import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { landingGuard } from './core/guards/landing.guard';

export const routes: Routes = [
  {
    // Public landing page for visitors; signed-in users are sent to their notes.
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
    canActivate: [landingGuard],
  },
  {
    // Public Support / Privacy / Terms (linked from the landing page), no sign-in.
    path: '',
    loadComponent: () => import('./features/public-info/public-info').then((m) => m.PublicInfo),
    children: (['support', 'privacy', 'terms'] as const).map((page) => ({
      path: page,
      loadComponent: () => import('./features/notes/guide/guide-page').then((m) => m.GuidePage),
      data: { page, backTo: '/' },
    })),
  },
  {
    // Public, read-only shared note — no sign-in required.
    path: 's/:token',
    loadComponent: () => import('./features/public-note/public-note').then((m) => m.PublicNote),
  },
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/auth').then((m) => m.Auth),
  },
  {
    path: '',
    loadComponent: () => import('./layout/layout').then((m) => m.Layout),
    canActivate: [AuthGuard],
    children: [
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
          // Built-in, read-only guide (shipped with the app, not a DB note). Must precede ':id'.
          {
            path: 'guide',
            loadComponent: () =>
              import('./features/notes/guide/guide-page').then((m) => m.GuidePage),
            data: { page: 'guide' },
          },
          // Footer pages: same read-only page component, different content.
          ...(['support', 'privacy', 'terms'] as const).map((page) => ({
            path: page,
            loadComponent: () =>
              import('./features/notes/guide/guide-page').then((m) => m.GuidePage),
            data: { page },
          })),
          // Absolute redirects: relative ones resolve wrongly in SSR on full page loads
          // (e.g. /notes/abc/edit -> /notes/abc/:id).
          { path: 'guide/edit', redirectTo: '/notes/guide' },
          // Edit and read are the same page now.
          { path: ':id/edit', redirectTo: ({ params }) => `/notes/${params['id']}` },
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
