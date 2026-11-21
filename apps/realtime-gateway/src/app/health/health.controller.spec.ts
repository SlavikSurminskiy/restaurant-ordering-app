import { Test } from '@nestjs/testing';

import { HealthController } from './health.controller';

describe(HealthController.name, () => {
  it('should report up without a database status', async () => {
    const controller = await Arrange.setup();

    const health = controller.check();

    expect(health.status).toBe('up');
    expect(health).not.toHaveProperty('database');
  });
});

const Arrange = {
  async setup() {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    return moduleRef.get(HealthController);
  },
};
