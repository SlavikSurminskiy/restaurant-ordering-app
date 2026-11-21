import { Test } from '@nestjs/testing';

import { PrismaService } from '@restaurant/database';

import { HealthController } from './health.controller';

describe('HealthController', () => {
  async function createController(ping: () => Promise<boolean>) {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: { ping } }],
    }).compile();
    return moduleRef.get(HealthController);
  }

  it('reports database as up when ping succeeds', async () => {
    const controller = await createController(async () => true);

    await expect(controller.check()).resolves.toMatchObject({
      status: 'up',
      database: 'up',
    });
  });

  it('reports database as down when ping fails', async () => {
    const controller = await createController(async () => false);

    await expect(controller.check()).resolves.toMatchObject({
      status: 'up',
      database: 'down',
    });
  });
});
