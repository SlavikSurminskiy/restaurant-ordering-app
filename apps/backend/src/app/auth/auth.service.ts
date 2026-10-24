import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import {
  hashPassword,
  PrismaService,
  verifyPassword,
} from '@restaurant/database';
import { AuthUser } from '@restaurant/shared-api-types';

import { JwtPayload } from './auth.models';

const AUTH_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
} as const;

@Injectable()
export class AuthService {
  private readonly dummyPasswordHash = hashPassword(randomUUID());

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(
    email: string,
    password: string,
  ): Promise<{ user: AuthUser; token: string } | null> {
    const found = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { ...AUTH_USER_SELECT, passwordHash: true },
    });

    const valid = await verifyPassword(
      password,
      found?.passwordHash ?? (await this.dummyPasswordHash),
    );

    if (!found || !valid) {
      return null;
    }

    const user: AuthUser = {
      id: found.id,
      email: found.email,
      name: found.name,
      role: found.role,
    };

    const payload: JwtPayload = { sub: user.id, role: user.role };

    return { user, token: await this.jwt.signAsync(payload) };
  }

  getUser(id: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: AUTH_USER_SELECT,
    });
  }
}
