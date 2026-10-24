import { Route } from '@angular/router';

import { appResolver } from './app.resolver';
import { guestGuard } from './features/auth/guards/auth.guards';
import { Shell } from './shell/shell';

export const appRoutes: Route[] = [
  {
    path: '',
    component: Shell,
    resolve: { appData: appResolver },
    children: [
      {
        path: 'menu',
        loadComponent: () => import('./features/menu/menu').then((m) => m.Menu),
      },
      {
        path: 'login',
        canMatch: [guestGuard],
        loadComponent: () =>
          import('./features/auth/login/login').then((m) => m.Login),
      },
      { path: '', pathMatch: 'full', redirectTo: 'menu' },
      { path: '**', redirectTo: 'menu' },
    ],
  },
];
