import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { apiErrorInterceptor } from '@restaurant/frontend/core/http';

import { appRoutes } from './app.routes';
import { restoreSession } from './features/auth/restore-session';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([apiErrorInterceptor])),
    provideAppInitializer(restoreSession),
    provideRouter(appRoutes, withComponentInputBinding()),
  ],
};
