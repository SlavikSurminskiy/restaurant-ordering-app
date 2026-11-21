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

import {
  CurrentUser,
  JwtAuthGuard,
  RequestUser,
  Roles,
  RolesGuard,
} from '@restaurant/backend-auth';
import { IDEMPOTENCY_KEY_HEADER, UserRole } from '@restaurant/shared-api-types';

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
