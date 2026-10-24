import { inject } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';

import { AuthDomainService } from '../../shared/domain/auth/auth-domain.service';

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
