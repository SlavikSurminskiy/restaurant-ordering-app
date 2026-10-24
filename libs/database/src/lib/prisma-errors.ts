import { Prisma } from '../generated/prisma/client';

export const PrismaErrorCode = {
  ForeignKeyViolation: 'P2003',
  RecordNotFound: 'P2025',
} as const;

export type PrismaErrorCode =
  (typeof PrismaErrorCode)[keyof typeof PrismaErrorCode];

export function isPrismaError(
  error: unknown,
  code: PrismaErrorCode,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}
