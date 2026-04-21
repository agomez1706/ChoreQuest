import { Injectable, inject } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from '@angular/fire/auth';
import { Firestore, doc, serverTimestamp, setDoc } from '@angular/fire/firestore';
import {  docData } from '@angular/fire/firestore';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  getUserProfile(): Observable<any> {
    return new Observable(observer => {
      const user = this.auth.currentUser;
      if (user) {
        const userDocRef = doc(this.firestore, `users/${user.uid}`);
        return docData(userDocRef).subscribe(observer);
      } else {
        observer.next(null);
        return observer.complete();
      }
    });
  }

  login(email: string, password: string): Observable<any> {
    return from(signInWithEmailAndPassword(this.auth, email, password));
  }

  register(email: string, password: string): Observable<any> {
    const createAccountAndDoc = async () => {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      const safeEmail = user.email ?? email;
      const displayName = safeEmail.includes('@') ? safeEmail.split('@')[0] : 'ChoreQuester';

      const userDocRef = doc(this.firestore, `users/${user.uid}`);
      const userData = {
        uid: user.uid,
        email: safeEmail,
        display_name: displayName,
        role: 'member',
        points: 0,
        photo_url: '',
        created_at: serverTimestamp(),
      };

      await setDoc(userDocRef, userData);

      return userCredential;
    };

    return from(createAccountAndDoc());
  }

  logout(): Observable<void> {
    return from(signOut(this.auth));
  }
}
