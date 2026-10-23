import { Role } from '../generated/prisma/client';

export interface SeedUser {
  email: string;
  name: string;
  password: string;
  role: Role;
}

export const users: SeedUser[] = [
  {
    email: 'admin@example.com',
    name: 'Admin',
    password: 'admin123',
    role: Role.ADMIN,
  },
  {
    email: 'customer@example.com',
    name: 'Customer',
    password: 'customer123',
    role: Role.CUSTOMER,
  },
];
