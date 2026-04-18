import { Routes } from '@angular/router';

export const HOUSEHOLD_ROUTES: Routes = [
  {
    path: 'create',
    loadComponent: () =>
      import('./create-household/create-household.component')
        .then(m => m.CreateHouseholdComponent),
  },
  {
    path: 'join',
    loadComponent: () =>
      import('./join-household/join-household.component')
        .then(m => m.JoinHouseholdComponent),
  },
  { path: '', redirectTo: 'create', pathMatch: 'full' },
];
