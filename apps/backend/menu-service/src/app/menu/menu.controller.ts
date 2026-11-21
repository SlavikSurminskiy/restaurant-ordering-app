import { Controller, Get } from '@nestjs/common';

import { MenuService } from './menu.service';
import { MenuResponseDto } from './menu.dto';

@Controller('menu')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  @Get()
  getMenu(): Promise<MenuResponseDto> {
    return this.menu.getMenu();
  }
}
