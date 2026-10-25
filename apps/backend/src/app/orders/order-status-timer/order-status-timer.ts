import {
  Logger,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { OrdersService } from '../orders.service';

import {
  DEFAULT_STATUS_STEP_SECONDS,
  STATUS_TICK_MS,
} from './order-status-timer.constants';

/**
 * Moves orders NEW → PREPARING → READY → COMPLETED on its own.
 * It works from `updatedAt`, so orders keep moving after a restart.
 */
@Injectable()
export class OrderStatusTimer implements OnModuleInit, OnModuleDestroy {
  readonly #logger = new Logger(OrderStatusTimer.name);
  readonly #stepMs: number;
  #interval: ReturnType<typeof setInterval> | undefined;
  #running = false;

  constructor(
    private readonly orders: OrdersService,
    config: ConfigService,
  ) {
    this.#stepMs = this.#readStepMs(config);
  }

  onModuleInit(): void {
    this.#interval = setInterval(() => void this.tick(), STATUS_TICK_MS);
  }

  onModuleDestroy(): void {
    clearInterval(this.#interval);
  }

  async tick(): Promise<void> {
    if (this.#running) {
      return;
    }

    this.#running = true;

    try {
      await this.orders.advanceStatuses(new Date(), this.#stepMs);
    } catch (error) {
      this.#logger.error('Could not move order statuses on', error);
    } finally {
      this.#running = false;
    }
  }

  #readStepMs(config: ConfigService): number {
    const raw = config.get<string>('ORDER_STATUS_STEP_SECONDS');
    const seconds = Number(raw ?? DEFAULT_STATUS_STEP_SECONDS);

    if (!Number.isInteger(seconds) || seconds <= 0) {
      throw new Error('ORDER_STATUS_STEP_SECONDS must be a positive integer');
    }

    return seconds * 1000;
  }
}
