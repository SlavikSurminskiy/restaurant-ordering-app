import { AuthUserDomainModel } from '../../../shared/domain/auth/auth-domain.models';

export interface AuthState {
  user: AuthUserDomainModel | null;
}
