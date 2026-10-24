export const UserRole = {
  Admin: 'ADMIN',
  Customer: 'CUSTOMER',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Body of `POST /api/auth/login`. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** The signed-in user: response of `POST /api/auth/login` and `GET /api/auth/me`. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
