import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SseService } from './core/realtime/sse.service';
import { MenuStore } from './features/menu/menu-store/menu.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App implements OnInit {
  #sse = inject(SseService);
  #menuStore = inject(MenuStore);

  ngOnInit() {
    this.#sse.connect();
    this.#menuStore.keepMenuUpToDate();
  }
}
