import { Route } from '@angular/router';

import { UserRole } from '@restaurant/shared-api-types';

import { appResolver } from './app.resolver';
import {
  guestGuard,
  roleGuard,
  signedInGuard,
} from './features/auth/guards/auth.guards';
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
      {
        path: 'setup-menu',
        canMatch: [signedInGuard, roleGuard(UserRole.Admin)],
        loadComponent: () =>
          import('./features/setup-menu/setup-menu').then((m) => m.SetupMenu),
      },
      { path: '', pathMatch: 'full', redirectTo: 'menu' },
      { path: '**', redirectTo: 'menu' },
    ],
  },
];
