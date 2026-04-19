import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { map } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  // authState automatically waits for Firebase to figure out if the user is logged in
  return authState(auth).pipe(
    map((user) => {
      if (user) {
        return true; // Let them through!
      } else {
        router.navigate(['/login']); // Kick them back to login
        return false;
      }
    }),
  );
};
