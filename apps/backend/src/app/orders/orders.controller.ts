import {
  Get,
  Body,
  Post,
  Param,
  Patch,
  Headers,
  UseGuards,
  Controller,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';

import { IDEMPOTENCY_KEY_HEADER, UserRole } from '@restaurant/shared-api-types';

import { RequestUser } from '../auth/auth.models';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import {
  OrderResponseDto,
  CreateOrderRequestDto,
  UpdateOrderStatusRequestDto,
} from './orders.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Headers(IDEMPOTENCY_KEY_HEADER) idempotencyKey: string | undefined,
    @Body() body: CreateOrderRequestDto,
  ): Promise<OrderResponseDto> {
    if (!idempotencyKey) {
      throw new BadRequestException(
        `The ${IDEMPOTENCY_KEY_HEADER} header is required.`,
      );
    }

    return this.orders.create(user, idempotencyKey, body);
  }

  @Get()
  list(@CurrentUser() user: RequestUser): Promise<OrderResponseDto[]> {
    return this.orders.list(user);
  }

  @Patch(':id/status')
  @Roles([UserRole.Admin])
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateOrderStatusRequestDto,
  ): Promise<OrderResponseDto> {
    return this.orders.updateStatus(id, body.status);
  }
}
