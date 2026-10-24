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
  CategoryResponseDto,
  CreateCategoryRequestDto,
  UpdateCategoryRequestDto,
} from './categories.dto';
import { CategoriesService } from './categories.service';

@Controller('menu/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.Admin])
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post()
  create(@Body() body: CreateCategoryRequestDto): Promise<CategoryResponseDto> {
    return this.categories.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCategoryRequestDto,
  ): Promise<CategoryResponseDto> {
    return this.categories.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.categories.delete(id);
  }
}
