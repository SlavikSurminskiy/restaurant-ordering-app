import { inject } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';

import { AuthDomainService } from '@restaurant/frontend/domain/auth';

import { AuthStore } from './auth-store/auth.store';

export async function restoreSession(): Promise<void> {
  const store = inject(AuthStore);
  const user = await firstValueFrom(
    inject(AuthDomainService)
      .getCurrentUser()
      .pipe(catchError(() => of(null))),
  );

  store.setUser(user);
}
