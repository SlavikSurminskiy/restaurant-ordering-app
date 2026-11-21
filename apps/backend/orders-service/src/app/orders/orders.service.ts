import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { RequestUser } from '@restaurant/backend-auth';
import { EventPublisher } from '@restaurant/backend-events';
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

import { MenuClient } from './menu-client/menu-client.service';
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
    private readonly events: EventPublisher,
    private readonly menu: MenuClient,
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

    // Checked against menu-service before the insert, not in one transaction with it: a price
    // changed in between is accepted (docs/microservices.md, stage A decisions).
    const { dishes, discount } = await this.menu.getPricing({
      dishIds: request.items.map(({ dishId }) => dishId),
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

    let order: Order;

    try {
      // One insert with nested items is atomic on its own.
      const created = await this.prisma.order.create({
        data: {
          userId: user.id,
          idempotencyKey,
          ...calculateTotals(items, discount),
          items: { create: items },
        },
        include: ORDER_INCLUDE,
      });

      order = toOrder(created);
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

    await this.events.publish({ type: OrderEventType.Created, order });

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

    await this.events.publish({ type: OrderEventType.Updated, order });

    return order;
  }
}
