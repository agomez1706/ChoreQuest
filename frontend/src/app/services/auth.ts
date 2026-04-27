import { Injectable, inject } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  user,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from '@angular/fire/auth';
import {
  Firestore,
  collection,
  doc,
  documentId,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  onSnapshot,
} from '@angular/fire/firestore';
import { collectionGroup, query, where, getDocs, writeBatch } from '@angular/fire/firestore';
import { from, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  getUserProfile(): Observable<any> {
    return new Observable((observer) => {
      const currentUser = this.auth.currentUser;
      if (currentUser) {
        const userDocRef = doc(this.firestore, `users/${currentUser.uid}`);

        const unsubscribe = onSnapshot(
          userDocRef,
          (snap) => observer.next(snap.data()),
          (err) => observer.error(err),
        );
        return () => unsubscribe();
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
      const currentUser = userCredential.user;
      const safeEmail = currentUser.email ?? email;
      const displayName = safeEmail.includes('@') ? safeEmail.split('@')[0] : 'ChoreQuester';

      const userDocRef = doc(this.firestore, `users/${currentUser.uid}`);
      const userData = {
        uid: currentUser.uid,
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

  getUserProfileStream(): Observable<any> {
    return user(this.auth).pipe(
      switchMap((currentUser) => {
        if (!currentUser) return of(null);

        const userDocRef = doc(this.firestore, `users/${currentUser.uid}`);

        return new Observable((observer) => {
          const unsubscribe = onSnapshot(
            userDocRef,
            (docSnap) => {
              if (docSnap.exists()) {
                observer.next(docSnap.data());
              } else {
                observer.next(null);
              }
            },
            (error) => observer.error(error),
          );

          return () => unsubscribe();
        });
      }),
    );
  }

  sendPasswordReset(email: string): Observable<void> {
    return from(sendPasswordResetEmail(this.auth, email));
  }

  updateProfileName(newName: string): Observable<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('No authenticated user found');

    const userDocRef = doc(this.firestore, `users/${currentUser.uid}`);

    return from(
      updateDoc(userDocRef, {
        display_name: newName,
        displayName: newName,
      }),
    );
  }

  deleteAccount(password: string): Observable<void> {
    const executeDelete = async () => {
      const currentUser = this.auth.currentUser;
      if (!currentUser || !currentUser.email) throw new Error('No authenticated user found');

      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);

      const uid = currentUser.uid;
      const batch = writeBatch(this.firestore);

      // Keep household membership data consistent when an account is deleted.
      const householdsQuery = query(
        collection(this.firestore, 'households'),
        where('members', 'array-contains', uid),
      );
      const householdSnaps = await getDocs(householdsQuery);
      const affectedHouseholdIds = new Set<string>();

      householdSnaps.forEach((householdSnap) => {
        affectedHouseholdIds.add(householdSnap.id);
      });

      for (const householdId of affectedHouseholdIds) {
        const householdRef = doc(this.firestore, `households/${householdId}`);
        const householdDoc = await getDoc(householdRef);
        if (!householdDoc.exists()) {
          continue;
        }

        const householdData = householdDoc.data() as {
          members?: string[];
          admin_id?: string;
        };

        const members = Array.isArray(householdData.members) ? householdData.members : [];
        const remainingMembers = members.filter((memberUid) => memberUid !== uid);
        const wasAdmin = householdData.admin_id === uid;

        if (wasAdmin && remainingMembers.length > 0) {
          throw new Error(
            'Admin accounts must transfer ownership or dissolve the household before deletion.',
          );
        }

        const membershipRef = doc(this.firestore, `households/${householdId}/memberships/${uid}`);

        if (remainingMembers.length === 0) {
          batch.delete(householdRef);
        } else {
          batch.update(householdRef, {
            members: remainingMembers,
            member_count: remainingMembers.length,
            is_full: false,
          });

          // Reassign user's tasks to the admin for sake of uniformity
          const tasksQuery = query(
            collection(this.firestore, `households/${householdId}/tasks`),
            where('assigned_to', '==', uid)
          );
          const taskSnaps = await getDocs(tasksQuery);
          taskSnaps.forEach((docSnap) => {
            if (docSnap.data()['status'] !== 'completed') {
              batch.update(docSnap.ref, {
                assigned_to: householdData.admin_id || '',
              });
            }
          });
        }

        batch.delete(membershipRef);
      }

      const userDocRef = doc(this.firestore, `users/${uid}`);
      batch.delete(userDocRef);

      await batch.commit();

      await deleteUser(currentUser);
    };

    return from(executeDelete());
  }
}
