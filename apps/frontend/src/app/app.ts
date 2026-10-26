import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { MenuStore } from './features/menu/menu-store/menu.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  constructor() {
    inject(MenuStore);
  }
}
