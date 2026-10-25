import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthenticatedRequest } from '../auth.models';
import { AuthCookieService } from '../utils/auth-cookie.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authCookie: AuthCookieService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.authCookie.extractUserFromCookie(request);

    if (!user) {
      throw new UnauthorizedException();
    }

    request.user = user;

    return true;
  }
}
