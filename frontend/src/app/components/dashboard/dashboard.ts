import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { HouseholdService } from '../../services/household.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class DashboardComponent implements OnInit {
  private auth = inject(Auth);
  private router = inject(Router);
  private householdService = inject(HouseholdService);
  private cdr = inject(ChangeDetectorRef);

  // Live Data from Logan's Sprint
  household$ = this.householdService.household$;

  isProfileMenuOpen = false;

  isInitialLoading = true;

  currentUser = this.auth.currentUser;

  toggleProfileMenu() {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  // --- PLACEHOLDER DATA FOR FUTURE SPRINTS ---
  mockTasks = [
    {
      title: 'Take out trash',
      dueDate: 'Today',
      recurrence: 'Every 7 days',
      urgency: 'Due today',
      difficulty: 'Easy',
      points: 10,
      state: 'normal',
    },
    {
      title: 'Wash dishes',
      dueDate: 'Tomorrow',
      recurrence: 'Every 2 days',
      urgency: '',
      difficulty: 'Medium',
      points: 15,
      state: 'normal',
    },
    {
      title: 'Clean bathroom',
      dueDate: 'Was due: Mar 27',
      recurrence: '',
      urgency: 'OVERDUE',
      difficulty: 'Hard',
      points: 25,
      state: 'overdue',
    },
    {
      title: 'Vacuum living room',
      dueDate: 'Completed',
      recurrence: '+20 pts earned',
      urgency: '',
      difficulty: '',
      points: 0,
      state: 'done',
    },
  ];

  mockActivity = [
    { user: 'Logan', action: 'completed Mop floors', time: '2m ago', color: '#10b981' },
    { user: 'Kaiden', action: 'completed Empty recycling', time: '1h ago', color: '#6366f1' },
    { user: 'Alex', action: 'Wipe counters is overdue', time: '3h ago', color: '#ef4444' },
  ];
  // ------------------------------------------

  ngOnInit() {
    this.householdService.loadMyHousehold().subscribe({
      next: () => {
        this.isInitialLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isInitialLoading = false;
        console.log('User not in a household or error occurred.');
        this.cdr.detectChanges();
      },
    });
  }

  copyInviteCode(code: string) {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        // You can replace this with a fancy toast notification later if you want!
        alert(`Invite code ${code} copied to clipboard! Paste it to your roommate.`);
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
      });
  }

  async logout() {
    try {
      await this.auth.signOut();
      this.householdService.clearHousehold();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }
}
