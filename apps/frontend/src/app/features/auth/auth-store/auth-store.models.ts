import { AuthUserDomainModel } from '@restaurant/frontend/domain/auth';

export interface AuthState {
  user: AuthUserDomainModel | null;
}
