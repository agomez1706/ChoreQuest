import { Injectable, inject } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  user, // Added for the stream
} from '@angular/fire/auth';
import { Firestore, doc, serverTimestamp, setDoc, updateDoc, docData } from '@angular/fire/firestore';
import { from, Observable, of } from 'rxjs'; // Added of
import { switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  // --- EXISTING CODE (DO NOT EDIT) ---
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

  // --- NEW CODE ADDED FOR SCRUM ---

  /**
   * REASON: Provides a real-time stream of the user profile.
   * Any component using this will update immediately when Firestore updates.
   */
  getUserProfileStream(): Observable<any> {
    return user(this.auth).pipe(
      switchMap((currentUser) => {
        if (!currentUser) return of(null);
        const userDocRef = doc(this.firestore, `users/${currentUser.uid}`);
        return docData(userDocRef);
      })
    );
  }

  /**
   * REASON: Implements Password Reset via Firebase Email (The easiest method).
   */
  sendPasswordReset(email: string): Observable<void> {
    return from(sendPasswordResetEmail(this.auth, email));
  }

  /**
   * REASON: Updates the user's specific record in Firestore.
   */
 updateProfileName(newName: string): Observable<void> {
  const currentUser = this.auth.currentUser;
  if (!currentUser) throw new Error("No authenticated user found");
  
  const userDocRef = doc(this.firestore, `users/${currentUser.uid}`);
  
  // We use the EXACT field names used in your register() and getUserProfile()
  return from(updateDoc(userDocRef, { 
    display_name: newName, // This matches your register logic
    displayName: newName   // This matches standard Firebase logic
  }));
}
}