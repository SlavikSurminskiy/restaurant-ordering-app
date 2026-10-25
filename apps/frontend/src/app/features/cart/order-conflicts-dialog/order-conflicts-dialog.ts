import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { CartWarningPipe } from '../cart-warning/cart-warning.pipe';

import { OrderConflictsDialogData } from './order-conflicts-dialog.models';

@Component({
  selector: 'app-order-conflicts-dialog',
  imports: [MatIconModule, MatButtonModule, MatDialogModule, CartWarningPipe],
  templateUrl: './order-conflicts-dialog.html',
  styleUrl: './order-conflicts-dialog.scss',
})
export class OrderConflictsDialog {
  protected readonly data = inject<OrderConflictsDialogData>(MAT_DIALOG_DATA);
}
