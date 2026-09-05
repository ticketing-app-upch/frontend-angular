import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private snack = inject(MatSnackBar);

  success(message: string): void {
    this.snack.open(message, 'OK', {
      duration: 3500,
      panelClass: 'snack-success',
      horizontalPosition: 'end',
    });
  }

  error(message: string): void {
    this.snack.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: 'snack-error',
      horizontalPosition: 'end',
    });
  }

  info(message: string): void {
    this.snack.open(message, 'OK', {
      duration: 3000,
      horizontalPosition: 'end',
    });
  }
}
