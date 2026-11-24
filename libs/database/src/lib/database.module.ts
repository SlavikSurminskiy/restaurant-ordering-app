import { DynamicModule, Module } from '@nestjs/common';

import { DATABASE_URL_VARIABLE } from './database.constants';
import { PrismaService } from './prisma.service';

@Module({})
export class DatabaseModule {
  static forRoot(urlVariable: string): DynamicModule {
    return {
      module: DatabaseModule,
      global: true,
      providers: [
        { provide: DATABASE_URL_VARIABLE, useValue: urlVariable },
        PrismaService,
      ],
      exports: [PrismaService],
    };
  }
}
