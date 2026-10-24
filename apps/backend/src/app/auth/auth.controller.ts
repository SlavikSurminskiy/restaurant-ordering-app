import {
  Res,
  Get,
  Body,
  Post,
  HttpCode,
  UseGuards,
  Controller,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

import { authCookieBaseOptions, authCookieOptions } from './auth.config';
import { AUTH_COOKIE } from './auth.constants';
import { AuthUserResponseDto, LoginRequestDto } from './auth.dto';
import { RequestUser } from './auth.models';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthUserResponseDto> {
    if (!isLoginRequest(body)) {
      throw new BadRequestException('Email and password are required.');
    }

    const result = await this.auth.login(body.email, body.password);

    if (!result) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    response.cookie(AUTH_COOKIE, result.token, authCookieOptions(this.config));

    return result.user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) response: Response): void {
    response.clearCookie(AUTH_COOKIE, authCookieBaseOptions(this.config));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() current: RequestUser): Promise<AuthUserResponseDto> {
    const user = await this.auth.getUser(current.id);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}

function isLoginRequest(body: unknown): body is LoginRequestDto {
  const { email, password } = (body ?? {}) as Partial<
    Record<keyof LoginRequestDto, unknown>
  >;

  return (
    typeof email === 'string' &&
    email.trim() !== '' &&
    typeof password === 'string' &&
    password !== ''
  );
}
