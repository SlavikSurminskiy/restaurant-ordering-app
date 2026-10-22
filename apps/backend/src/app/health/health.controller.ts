import { Controller, Get } from '@nestjs/common';

import { PrismaService } from '@restaurant/database';
import { HealthResponse } from '@restaurant/shared-api-types';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    const databaseUp = await this.prisma.ping();
    return {
      status: 'up',
      database: databaseUp ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    };
  }
}
