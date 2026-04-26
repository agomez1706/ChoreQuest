import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router'; // IMPORTANT
import { AuthService } from '../../services/auth'; 
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink] // ADD RouterLink HERE
})
export class ProfileComponent implements OnInit, OnDestroy {
  profileForm: FormGroup;
  private profileSub?: Subscription;

  // UI States
  currentDisplayName: string = '';
  initials: string = '';
  email: string = '';
  householdName: string = 'The Heavy Lifters'; 
  totalPoints: number = 0;
  leaderboardRank: string = '#3';
  currentStreak: string = '2d';
  isAdmin: boolean = false;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.profileForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  ngOnInit(): void {
  this.profileSub = this.authService.getUserProfileStream().subscribe(data => {
    if (data) {
      // Logic: Look for 'display_name' first, then 'displayName'
      const nameFromDb = data.display_name || data.displayName || 'ChoreQuester';
      
      this.currentDisplayName = nameFromDb;
      this.initials = nameFromDb.charAt(0).toUpperCase();
      this.email = data.email;

      // This fills the input box automatically when you enter the page
      if (!this.profileForm.dirty) {
        this.profileForm.patchValue({ displayName: nameFromDb });
      }
    }
  });
}

  onUpdateName(): void {
  // 1. Check if the form is actually valid
  if (this.profileForm.invalid) {
    console.error('Form is invalid:', this.profileForm.errors);
    return;
  }

  const newName = this.profileForm.value.displayName;
  console.log('Attempting to update name to:', newName);

  // 2. Call the service and MANUALLY subscribe
  this.authService.updateProfileName(newName).subscribe({
    next: () => {
      console.log('Update successful!');
      alert('Name updated successfully!');
      this.profileForm.markAsPristine(); // Resets the "dirty" state
    },
    error: (err) => {
      console.error('Firestore update failed:', err);
      alert('Error: ' + err.message);
    }
  });
}

  onChangePassword(): void {
    this.authService.sendPasswordReset(this.email).subscribe(() => alert('Reset email sent!'));
  }

  onLogout(): void { this.authService.logout(); }
  onDeleteAccount(): void { if(confirm("Delete account?")) alert("Account deleted."); }
  ngOnDestroy(): void { this.profileSub?.unsubscribe(); }
}