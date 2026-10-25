import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import {
  isPrismaError,
  PrismaErrorCode,
  PrismaService,
} from '@restaurant/database';
import {
  Order,
  UserRole,
  OrderStatus,
  OrderEventType,
  CreateOrderRequest,
} from '@restaurant/shared-api-types';
import { calculateTotals } from '@restaurant/shared-utils';

import { RequestUser } from '../auth/auth.models';
import { DiscountService } from '../discount/discount.service';
import { EventBus } from '../events/event-bus/event-bus';

import { OrderConflictsService } from './order-conflicts/order-conflicts.service';
import {
  OrderStatusService,
  StatusChange,
} from './order-status/order-status.service';
import { ORDER_INCLUDE } from './orders.constants';
import { toOrder } from './orders.mapper';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
    private readonly discount: DiscountService,
    private readonly orderStatus: OrderStatusService,
    private readonly orderConflicts: OrderConflictsService,
  ) {}

  async list(user: RequestUser): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: user.role === UserRole.Admin ? {} : { userId: user.id },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return orders.map(toOrder);
  }

  async create(
    user: RequestUser,
    idempotencyKey: string,
    request: CreateOrderRequest,
  ): Promise<Order> {
    const existing = await this.#findByKey(user.id, idempotencyKey);

    if (existing) {
      return existing;
    }

    let order: Order;

    try {
      order = await this.prisma.$transaction(async (tx) => {
        const dishes = await tx.dish.findMany({
          where: { id: { in: request.items.map(({ dishId }) => dishId) } },
          select: {
            id: true,
            name: true,
            price: true,
            isOpenPrice: true,
            available: true,
          },
        });

        const conflicts = this.orderConflicts.find(request.items, dishes);

        if (conflicts.length) {
          throw new ConflictException({ conflicts });
        }

        const names = new Map(dishes.map(({ id, name }) => [id, name]));
        const items = request.items.map(({ dishId, quantity, unitPrice }) => ({
          dishId,
          quantity,
          unitPrice,
          name: names.get(dishId) ?? '',
        }));

        const created = await tx.order.create({
          data: {
            userId: user.id,
            idempotencyKey,
            ...calculateTotals(items, this.discount.discount),
            items: { create: items },
          },
          include: ORDER_INCLUDE,
        });

        return toOrder(created);
      });
    } catch (error) {
      // Two requests with the same key raced; the first one created the order.
      if (isPrismaError(error, PrismaErrorCode.UniqueConstraintViolation)) {
        const raced = await this.#findByKey(user.id, idempotencyKey);

        if (raced) {
          return raced;
        }
      }

      throw error;
    }

    this.events.publish({ type: OrderEventType.Created, order });

    return order;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const current = await this.prisma.order.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!current) {
      throw new NotFoundException('Order not found.');
    }

    if (!this.orderStatus.canChange({ from: current.status, to: status })) {
      throw new ConflictException(
        `An order in ${current.status} can't be moved to ${status}.`,
      );
    }

    const order = await this.#moveStatus(id, {
      from: current.status,
      to: status,
    });

    if (!order) {
      throw new ConflictException('The order changed meanwhile. Try again.');
    }

    return order;
  }

  /** Moves every order that has been in its status for `stepMs` one step on; returns how many moved. */
  async advanceStatuses(now: Date, stepMs: number): Promise<number> {
    const due = await this.prisma.order.findMany({
      where: {
        status: {
          in: [OrderStatus.New, OrderStatus.Preparing, OrderStatus.Ready],
        },
        updatedAt: { lte: new Date(now.getTime() - stepMs) },
      },
      select: { id: true, status: true },
      orderBy: { updatedAt: 'asc' },
    });

    let moved = 0;

    for (const { id, status } of due) {
      const next = this.orderStatus.next(status);

      if (next && (await this.#moveStatus(id, { from: status, to: next }))) {
        moved++;
      }
    }

    return moved;
  }

  async #findByKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      include: ORDER_INCLUDE,
    });

    return order && toOrder(order);
  }

  /** Changes the status only if it is still `from`; `null` when it changed meanwhile. */
  async #moveStatus(
    id: string,
    { from, to }: StatusChange,
  ): Promise<Order | null> {
    let order: Order;

    try {
      order = toOrder(
        await this.prisma.order.update({
          where: { id, status: from },
          data: { status: to },
          include: ORDER_INCLUDE,
        }),
      );
    } catch (error) {
      if (isPrismaError(error, PrismaErrorCode.RecordNotFound)) {
        return null;
      }

      throw error;
    }

    this.events.publish({ type: OrderEventType.Updated, order });

    return order;
  }
}
