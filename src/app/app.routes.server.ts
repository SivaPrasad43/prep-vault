import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Landing page: static HTML at build time for fast first paint and link previews.
    path: '',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'auth',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
