import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { MenuStore } from './features/menu/menu-store/menu.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App implements OnInit {
  #menuStore = inject(MenuStore);

  ngOnInit() {
    this.#menuStore.loadMenu();
  }
}
