import { Prisma } from '../generated/prisma/client';

import { isPrismaError, PrismaErrorCode } from './prisma-errors';

describe('isPrismaError', () => {
  it('should match a Prisma error with the given code', () => {
    const error = Arrange.createPrismaError(PrismaErrorCode.RecordNotFound);

    expect(isPrismaError(error, PrismaErrorCode.RecordNotFound)).toBe(true);
  });

  it('should not match a Prisma error with another code', () => {
    const error = Arrange.createPrismaError(PrismaErrorCode.RecordNotFound);

    expect(isPrismaError(error, PrismaErrorCode.ForeignKeyViolation)).toBe(
      false,
    );
  });

  it('should not match other errors', () => {
    expect(
      isPrismaError(new Error('P2025'), PrismaErrorCode.RecordNotFound),
    ).toBe(false);
  });
});

const Arrange = {
  createPrismaError(code: string) {
    return new Prisma.PrismaClientKnownRequestError('Failed', {
      code,
      clientVersion: 'test',
    });
  },
};
