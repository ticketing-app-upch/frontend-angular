import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toaster } from './shared/toaster/toaster';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toaster],
  template: '<router-outlet /><tkt-toaster />',
  styles: ':host { display: block; min-height: 100vh; }',
})
export class App {}
