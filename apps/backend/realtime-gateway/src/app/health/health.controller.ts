import { Controller, Get } from '@nestjs/common';

import { HealthResponse } from '@restaurant/shared-api-types';

/** No database here: the gateway is up when it answers. */
@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return { status: 'up', timestamp: new Date().toISOString() };
  }
}
