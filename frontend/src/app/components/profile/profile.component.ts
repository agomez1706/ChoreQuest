import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth'; 

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule]
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  initials: string = 'AG'; 
  householdName: string = 'The Heavy Lifters'; 
  isAdmin: boolean = false; 
  
  // Placeholders for complex logic being held off for now
  leaderboardRank: string = '#3';
  currentStreak: string = '2d';

  // This will now be dynamic from Firestore
  totalPoints: number = 0;
  email: string = 'alex.gomez@ndsu.edu';

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.profileForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  ngOnInit(): void {
    // Calling the new method we added to George's service
    this.authService.getUserProfile().subscribe({
      next: (data: any) => { 
        if (data) {
          this.totalPoints = data.points || 0; 
          this.email = data.email || this.email;
          this.profileForm.patchValue({
            displayName: data.displayName || ''
          });
        }
      },
      error: (err: any) => {
        console.error('Error fetching Firestore profile:', err);
      }
    });
  }

  onUpdateName(): void {
    if (this.profileForm.valid) {
      console.log('Updating Firestore display name to:', this.profileForm.value.displayName);
    }
  }

  onChangePassword(): void { 
    console.log('Navigating to change password...');
  }

  onLeaveHousehold(): void {
    // Alert using the specific household name requirement
    if (confirm(`Are you sure you want to leave ${this.householdName}?`)) {
      alert(`Successfully left ${this.householdName}! (Simulation)`);
      console.log('Interaction test: Leave Household simulation complete.');
    }
  }

  onDeleteAccount(): void {
    // New placeholder for account deletion
    if (confirm("Are you sure you want to delete your account? This action is permanent!")) {
      alert("Account deleted successfully! (Simulation - No backend changes made)");
      console.log('Interaction test: Delete Account simulation complete.');
      // Eventually, this would call this.authService.deleteUser()
    }
  }

  onLogout(): void {
    this.authService.logout();
  }
}