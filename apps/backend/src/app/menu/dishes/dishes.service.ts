import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import {
  isPrismaError,
  PrismaErrorCode,
  PrismaService,
} from '@restaurant/database';
import {
  Dish,
  MenuEventType,
  CreateDishRequest,
  UpdateDishRequest,
} from '@restaurant/shared-api-types';

import { EventBus } from '../../events/event-bus/event-bus';
import { DISH_SELECT } from '../menu.constants';

@Injectable()
export class DishesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
  ) {}

  async create(request: CreateDishRequest): Promise<Dish> {
    const dish = await this.prisma.dish.create({
      data: request,
      select: DISH_SELECT,
    });

    this.events.publish({ type: MenuEventType.DishUpserted, dish });

    return dish;
  }

  async update(id: string, patch: UpdateDishRequest): Promise<Dish> {
    const current = await this.prisma.dish.findUnique({
      where: { id },
      select: { price: true, isOpenPrice: true },
    });

    if (!current) {
      throw new NotFoundException('Dish not found.');
    }

    // A concurrent change can still break the rule; the CHECK constraint is the last guard.
    assertPriceMatchesOpenPrice({ ...current, ...patch });

    let dish: Dish;

    try {
      dish = await this.prisma.dish.update({
        where: { id },
        data: patch,
        select: DISH_SELECT,
      });
    } catch (error) {
      throw toHttpError(error);
    }

    this.events.publish({ type: MenuEventType.DishUpserted, dish });

    return dish;
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.dish.delete({ where: { id } });
    } catch (error) {
      throw toHttpError(error);
    }

    this.events.publish({ type: MenuEventType.DishDeleted, dishId: id });
  }
}

/** The rule behind the `dishes_price_open_price_check` constraint, with a clear 400 instead of a 500. */
function assertPriceMatchesOpenPrice(
  dish: Pick<Dish, 'price' | 'isOpenPrice'>,
): void {
  if (dish.isOpenPrice && dish.price !== null) {
    throw new BadRequestException('An open-price dish must have price null.');
  }

  if (!dish.isOpenPrice && dish.price === null) {
    throw new BadRequestException(
      'price is required unless isOpenPrice is true.',
    );
  }
}

function toHttpError(error: unknown): unknown {
  return isPrismaError(error, PrismaErrorCode.RecordNotFound)
    ? new NotFoundException('Dish not found.')
    : error;
}
