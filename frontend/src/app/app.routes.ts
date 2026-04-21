import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';
import { ProfileComponent } from './components/profile/profile.component'; // <-- 1. Import your new component

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
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/dashboard/dashboard').then((m) => m.DashboardComponent),
  },
  // Flattened Household Routes
  {
    path: 'household/create',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/household/create-household/create-household').then(
        (m) => m.CreateHouseholdComponent,
      ),
  },
  {
    path: 'household/join',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/household/join-household/join-household').then(
        (m) => m.JoinHouseholdComponent,
      ),
  },
  { path: 'profile', component: ProfileComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }, // Catch-all for stray routes
 
];
