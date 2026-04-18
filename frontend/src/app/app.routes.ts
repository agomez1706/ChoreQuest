import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./components/register/register').then((m) => m.RegisterComponent),
  },
  {
    path: 'household',
    loadChildren: () =>
      import('./household/household.routes').then(m => m.HOUSEHOLD_ROUTES),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
