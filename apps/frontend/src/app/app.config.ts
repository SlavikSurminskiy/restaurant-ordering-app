import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { appRoutes } from './app.routes';
import { apiErrorInterceptor } from './core/http/api-error.interceptor';
import { restoreSession } from './features/auth/restore-session';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([apiErrorInterceptor])),
    provideAppInitializer(restoreSession),
    provideRouter(appRoutes, withComponentInputBinding()),
  ],
};
