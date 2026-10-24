import {
  Body,
  Post,
  Patch,
  Param,
  Delete,
  HttpCode,
  UseGuards,
  Controller,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';

import { UserRole } from '@restaurant/shared-api-types';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

import {
  DishResponseDto,
  CreateDishRequestDto,
  UpdateDishRequestDto,
} from './dishes.dto';
import { DishesService } from './dishes.service';

@Controller('menu/dishes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.Admin])
export class DishesController {
  constructor(private readonly dishes: DishesService) {}

  @Post()
  create(@Body() body: CreateDishRequestDto): Promise<DishResponseDto> {
    return this.dishes.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateDishRequestDto,
  ): Promise<DishResponseDto> {
    return this.dishes.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.dishes.delete(id);
  }
}
