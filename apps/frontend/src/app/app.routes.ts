import { Route } from '@angular/router';

import { appResolver } from './app.resolver';
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
      { path: '', pathMatch: 'full', redirectTo: 'menu' },
      { path: '**', redirectTo: 'menu' },
    ],
  },
];
