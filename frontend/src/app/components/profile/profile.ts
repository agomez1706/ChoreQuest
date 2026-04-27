import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { HouseholdService } from '../../services/household.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  styleUrls: ['./profile.css'],
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
})
export class ProfileComponent implements OnInit, OnDestroy {
  profileForm: FormGroup;
  private profileSub?: Subscription;
  private hhSub?: Subscription;

  // UI States
  isLoading: boolean = true;
  currentDisplayName: string = '';
  initials: string = '';
  email: string = '';
  householdName: string = 'Loading...';
  totalPoints: number = 0;
  leaderboardRank: string = '#3';
  currentStreak: string = '2d';
  isAdmin: boolean = false;
  currentUserUid: string = '';
  currentHousehold: any = null;
  showDeleteAccountModal: boolean = false;
  isDeletingAccount: boolean = false;
  deleteAccountErrorMsg: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private householdService: HouseholdService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    this.profileForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(2)]],
    });
  }

  ngOnInit() {
    this.profileSub = this.authService.getUserProfileStream().subscribe((data) => {
      if (data) {
        const nameFromDb = data.display_name || 'ChoreQuester';

        this.currentUserUid = data.uid;
        this.currentDisplayName = nameFromDb;
        this.initials = nameFromDb.charAt(0).toUpperCase();
        this.email = data.email;
        this.totalPoints = data.points || 0;

        if (!this.profileForm.dirty) {
          this.profileForm.patchValue({ displayName: nameFromDb });
        }

        this.isLoading = false;
        this.checkAdminStatus();

        this.cdr.detectChanges();
      } else {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });

    this.hhSub = this.householdService.household$.subscribe((hh) => {
      this.currentHousehold = hh;

      if (hh) {
        this.householdName = hh.name;
      } else {
        this.householdName = 'Not in a household';
      }

      this.checkAdminStatus();

      this.cdr.detectChanges();
    });
  }

  private checkAdminStatus() {
    if (this.currentHousehold && this.currentUserUid) {
      this.isAdmin = this.currentHousehold.admin_id === this.currentUserUid;
    } else {
      this.isAdmin = false;
    }
  }

  onUpdateName(): void {
    if (this.profileForm.invalid) {
      console.error('Form is invalid:', this.profileForm.errors);
      return;
    }

    const newName = this.profileForm.value.displayName;
    console.log('Attempting to update name to:', newName);

    this.authService.updateProfileName(newName).subscribe({
      next: () => {
        console.log('Update successful!');
        alert('Name updated successfully!');
        this.profileForm.markAsPristine();
      },
      error: (err) => {
        console.error('Firestore update failed:', err);
        alert('Error: ' + err.message);
      },
    });
  }

  onChangePassword(): void {
    if (!this.email) {
      alert('Error: No email address found for this account.');
      return;
    }

    this.authService.sendPasswordReset(this.email).subscribe({
      next: () => alert('Reset email sent! Check your inbox to reset your password.'),
      error: (err) => {
        console.error('Password reset failed:', err);
        alert('Error: ' + err.message);
      },
    });
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Logout failed:', err);
        alert('Error logging out: ' + err.message);
      },
    });
  }

  onDeleteAccount(): void {
    if (this.isAdmin) {
      alert(
        'Action Blocked: As the Admin of a household, you cannot delete your account directly.\n\nWe will take you to Household Settings now so you can transfer ownership or dissolve the household first.',
      );
      this.router.navigate(['/household-settings']);
      return;
    }

    this.deleteAccountErrorMsg = '';
    this.isDeletingAccount = false;
    this.showDeleteAccountModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteAccountModal(): void {
    if (this.isDeletingAccount) return;
    this.showDeleteAccountModal = false;
    this.deleteAccountErrorMsg = '';
  }

  submitDeleteAccount(password: string): void {
    if (!password) {
      this.deleteAccountErrorMsg = 'Password is required.';
      this.cdr.detectChanges();
      return;
    }

    this.isDeletingAccount = true;
    this.deleteAccountErrorMsg = '';
    this.cdr.detectChanges();

    this.authService.deleteAccount(password).subscribe({
      next: () => {
        this.isDeletingAccount = false;
        this.showDeleteAccountModal = false;
        alert('Account successfully deleted.');
        this.router.navigate(['/register']);
      },
      error: (err) => {
        this.isDeletingAccount = false;
        console.error('Account deletion failed:', err);

        if (err.code === 'auth/invalid-credential') {
          this.deleteAccountErrorMsg = 'Incorrect password. Please try again.';
        } else if (err.code === 'auth/requires-recent-login') {
          this.deleteAccountErrorMsg =
            'Your session is too old. Please log out, log back in, and try again.';
        } else {
          this.deleteAccountErrorMsg = 'Error deleting account: ' + err.message;
        }
        this.cdr.detectChanges();
      },
    });
  }

  ngOnDestroy(): void {
    this.profileSub?.unsubscribe();
    this.hhSub?.unsubscribe();
  }
}
