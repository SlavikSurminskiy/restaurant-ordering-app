import { Logger, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

import { INTERNAL_ORDER_PRICING_PATH } from '@restaurant/shared-api-types';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  app.useBodyParser('json');

  const globalPrefix = 'api';

  // Service-to-service routes stay outside /api, which is the only prefix routed from outside.
  app.setGlobalPrefix(globalPrefix, {
    exclude: [
      { path: INTERNAL_ORDER_PRICING_PATH, method: RequestMethod.POST },
    ],
  });
  app.enableShutdownHooks();
  app.use(cookieParser());

  const port = app.get(ConfigService).get<number>('MENU_SERVICE_PORT', 3002);
  await app.listen(port);
  // Set when Nx waits for this server to be ready
  if (process.env.NX_READY_SIGNAL_SOCKET) {
    try {
      // Function keeps TypeScript and bundlers from rewriting or bundling the import
      const load = new Function('s', 'return import(s)') as (
        s: string,
      ) => Promise<{ emitReadySignal(server: unknown): boolean }>;
      (await load('@nx/js/ready-signal')).emitReadySignal(app.getHttpServer());
    } catch {
      // @nx/js isn't installed
    }
  }
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
