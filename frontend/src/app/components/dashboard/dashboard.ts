import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, onSnapshot } from '@angular/fire/firestore';
import { finalize, take } from 'rxjs/operators';
import { HouseholdService } from '../../services/household';
import { TaskService } from '../../services/task';
import { CreateTaskComponent } from '../create-task/create-task';
import { TaskListComponent } from '../task-list/task-list';
import { Household, HouseholdMember } from '../../models/household';
import { Task } from '../../models/task';
import { EditTaskComponent } from '../edit-task/edit-task';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, CreateTaskComponent, TaskListComponent, EditTaskComponent],
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

  // NEW: State for Edit Task Modal
  isEditTaskOpen = false;
  taskToEdit: Task | null = null;

  currentUser: any = null;
  currentUserPoints = 0;
  currentUserName: string | null = null;

  processingTaskIds = new Set<string>();

  private authUnsubscribe: (() => void) | null = null;
  private pointsUnsubscribe: (() => void) | null = null;

  toggleProfileMenu() {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.isProfileMenuOpen) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (!target.closest('.profile-menu-container')) {
      this.isProfileMenuOpen = false;
      this.cdr.detectChanges();
    }
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

  // NEW: Edit Task methods
  openEditTask(task: Task) {
    this.taskToEdit = task;
    this.isEditTaskOpen = true;
  }

  closeEditTask() {
    this.isEditTaskOpen = false;
    this.taskToEdit = null;
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
    if (this.pointsUnsubscribe) {
      this.pointsUnsubscribe();
    }

    const userDocRef = doc(this.firestore, `users/${uid}`);
    this.pointsUnsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        this.currentUserPoints = data['points'] ?? 0;
        this.currentUserName = data['display_name'] || null;
        this.cdr.detectChanges();
      }
    });
  }

  getMyPendingTaskCount(tasks: any[]): number {
    if (!this.currentUser) return 0;

    return tasks.filter(
      (task) => task.assigned_to === this.currentUser.uid && task.status !== 'completed',
    ).length;
  }

  completeTask(taskId: string) {
    this.processingTaskIds.add(taskId);

    this.tasks$.pipe(take(1)).subscribe((tasks) => {
      const taskToComplete = tasks.find((t) => t.id === taskId);
      const currentDueDate = taskToComplete?.due_date || '';

      this.taskService
        .completeTask(taskId, currentDueDate)
        .pipe(
          finalize(() => {
            this.processingTaskIds.delete(taskId);
            this.cdr.detectChanges();
          }),
        )
        .subscribe({
          next: () => {},
          error: (err: Error) => {
            alert(err.message);
          },
        });
    });
  }

  ngOnInit() {
    this.authUnsubscribe = this.auth.onAuthStateChanged((user) => {
      this.currentUser = user;

      if (!user) {
        this.router.navigate(['/login']);
        return;
      }

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
