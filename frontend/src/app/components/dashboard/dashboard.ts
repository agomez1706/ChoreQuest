import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, onSnapshot } from '@angular/fire/firestore';
import { HouseholdService } from '../../services/household.service';
import { TaskService } from '../../services/task';
import { CreateTaskComponent } from '../create-task/create-task';
import { Household, HouseholdMember } from '../../models/household.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, CreateTaskComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private householdService = inject(HouseholdService);
  private taskService = inject(TaskService);
  private cdr = inject(ChangeDetectorRef);

  household$ = this.householdService.household$;
  tasks$ = this.taskService.tasks$;

  isProfileMenuOpen = false;
  isInitialLoading = true;
  isCreateTaskOpen = false;
  tasksLoadError = '';

  currentUser: any = null;
  currentUserPoints = 0;

  private authUnsubscribe: (() => void) | null = null;
  private pointsUnsubscribe: (() => void) | null = null;

  toggleProfileMenu() {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  isAdmin(household: Household): boolean {
    return household.admin_id === this.currentUser?.uid;
  }

  isAssignedToMe(assignedTo: string): boolean {
    return assignedTo === this.currentUser?.uid;
  }

  getMembers(household: Household): HouseholdMember[] {
    return household.members as HouseholdMember[];
  }

  openCreateTask() {
    this.isCreateTaskOpen = true;
  }

  closeCreateTask() {
    this.isCreateTaskOpen = false;
  }

  onTaskCreated() {
    this.reloadHouseholdTasks();
  }

  private reloadHouseholdTasks() {
    this.tasksLoadError = '';
    this.taskService.loadHouseholdTasks().subscribe({
      next: () => {
        this.cdr.detectChanges();
      },
      error: (err: Error) => {
        console.error('Failed to load tasks:', err);
        this.tasksLoadError = err.message;
        this.cdr.detectChanges();
      },
    });
  }

  private subscribeToUserPoints(uid: string) {
    // Unsubscribe from any previous listener first
    if (this.pointsUnsubscribe) {
      this.pointsUnsubscribe();
    }

    const userDocRef = doc(this.firestore, `users/${uid}`);
    this.pointsUnsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        this.currentUserPoints = snapshot.data()['points'] ?? 0;
        this.cdr.detectChanges();
      }
    });
  }

  completeTask(taskId: string) {
    this.taskService.completeTask(taskId).subscribe({
      error: (err: Error) => alert(err.message),
    });
  }

  getDifficultyClass(difficulty: string): string {
    switch (difficulty) {
      case 'Easy':
        return 'tag--easy';
      case 'Medium':
        return 'tag--warning';
      case 'Hard':
        return 'tag--danger';
      default:
        return 'tag--neutral';
    }
  }

  formatDueDate(dueDateStr: string | null): string {
    if (!dueDateStr) return 'No due date';
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    if (diff < 0)
      return `Was due: ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getUrgency(dueDateStr: string | null, status: string): string {
    if (status === 'completed') return '';
    if (!dueDateStr) return '';
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 'OVERDUE';
    if (diff === 0) return 'Due today';
    return '';
  }

  ngOnInit() {
    this.authUnsubscribe = this.auth.onAuthStateChanged((user) => {
      this.currentUser = user;

      if (!user) {
        this.router.navigate(['/login']);
        return;
      }

      // Subscribe to live point updates for this user
      this.subscribeToUserPoints(user.uid);

      this.householdService.loadMyHousehold().subscribe({
        next: (household) => {
          this.isInitialLoading = false;
          if (household) {
            this.reloadHouseholdTasks();
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.isInitialLoading = false;
          this.cdr.detectChanges();
        },
      });
    });
  }

  ngOnDestroy() {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }
    if (this.pointsUnsubscribe) {
      this.pointsUnsubscribe();
    }
  }

  copyInviteCode(code: string) {
    navigator.clipboard
      .writeText(code)
      .then(() => {
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
      this.taskService.clearTasks();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }

  getMemberName(uid: string, household: Household): string {
    const member = household.members.find((m) => m.id === uid);
    return member ? member.display_name : 'Unknown';
  }
}
