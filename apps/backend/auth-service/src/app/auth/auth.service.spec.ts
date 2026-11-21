import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { hashPassword, PrismaService, User } from '@restaurant/database';
import { UserRole } from '@restaurant/shared-api-types';

import { AuthService } from './auth.service';

describe(AuthService.name, () => {
  describe('login', () => {
    it('should return the user and a token signed with their id and role', async () => {
      const admin = await Arrange.createUser();
      const spies = Arrange.createSpies();
      spies.prismaMock.user.findUnique.mockResolvedValue(admin);
      const service = await Arrange.setup(spies);

      const result = await service.login('admin@example.com', 'admin123');

      expect(result).toEqual({
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: UserRole.Admin,
        },
        token: 'signed-token',
      });
      expect(spies.jwtMock.signAsync).toHaveBeenCalledWith({
        sub: admin.id,
        role: UserRole.Admin,
      });
    });

    it('should look the user up by the trimmed, lower-cased email', async () => {
      const spies = Arrange.createSpies();
      spies.prismaMock.user.findUnique.mockResolvedValue(
        await Arrange.createUser(),
      );
      const service = await Arrange.setup(spies);

      await service.login('  Admin@Example.com ', 'admin123');

      expect(spies.prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'admin@example.com' } }),
      );
    });

    it('should return null for a wrong password', async () => {
      const spies = Arrange.createSpies();
      spies.prismaMock.user.findUnique.mockResolvedValue(
        await Arrange.createUser(),
      );
      const service = await Arrange.setup(spies);

      await expect(
        service.login('admin@example.com', 'wrong'),
      ).resolves.toBeNull();
      expect(spies.jwtMock.signAsync).not.toHaveBeenCalled();
    });

    it('should return null for an unknown email', async () => {
      const spies = Arrange.createSpies();
      spies.prismaMock.user.findUnique.mockResolvedValue(null);
      const service = await Arrange.setup(spies);

      await expect(
        service.login('nobody@example.com', 'admin123'),
      ).resolves.toBeNull();
      expect(spies.jwtMock.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('getUser', () => {
    it('should return the user without the password hash', async () => {
      const spies = Arrange.createSpies();
      const service = await Arrange.setup(spies);

      await service.getUser('user-id');

      expect(spies.prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        select: { id: true, email: true, name: true, role: true },
      });
    });
  });
});

interface Spies {
  prismaMock: { user: { findUnique: Mock } };
  jwtMock: { signAsync: Mock };
}

const Arrange = {
  async setup(spies: Spies) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: spies.prismaMock },
        { provide: JwtService, useValue: spies.jwtMock },
      ],
    }).compile();

    return moduleRef.get(AuthService);
  },

  createSpies(): Spies {
    return {
      prismaMock: { user: { findUnique: vi.fn().mockResolvedValue(null) } },
      jwtMock: { signAsync: vi.fn().mockResolvedValue('signed-token') },
    };
  },

  async createUser(): Promise<User> {
    return {
      id: '9b1d6f6e-2f4a-4c1e-8a57-5f3a3c1f2b10',
      email: 'admin@example.com',
      name: 'Admin',
      role: UserRole.Admin,
      passwordHash: await hashPassword('admin123'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },
};
