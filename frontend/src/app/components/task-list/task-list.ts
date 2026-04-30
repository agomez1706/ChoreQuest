import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../../models/task';
import { Household } from '../../models/household';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-list.html',
  styleUrls: ['./task-list.css'],
})
export class TaskListComponent {
  @Input() tasks: Task[] = [];
  @Input() household!: Household;
  @Input() currentUserUid: string = '';
  @Input() isAdmin: boolean = false;
  @Input() tasksLoadError: string = '';
  @Input() processingTaskIds: Set<string> = new Set<string>();

  @Output() completeTask = new EventEmitter<string>();
  @Output() openCreateTask = new EventEmitter<void>();
  @Output() editTask = new EventEmitter<Task>();

  isAssignedToMe(assignedTo: string): boolean {
    return assignedTo === this.currentUserUid;
  }

  isTooEarly(dueDateStr: string | null, intervalDays: number | null | undefined): boolean {
    if (!dueDateStr || !intervalDays) return false;

    const currentDueDate = new Date(dueDateStr);
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    currentDueDate.setHours(0, 0, 0, 0);

    if (intervalDays === 1) {
      return currentDueDate.getTime() > today.getTime();
    }

    const cycleStartDate = new Date(currentDueDate);
    cycleStartDate.setDate(currentDueDate.getDate() - intervalDays);

    return today.getTime() < cycleStartDate.getTime();
  }

  isCooldown(task: any): boolean {
    return this.isTooEarly(task.due_date, task.recurrence_interval_days) && !!task.completed_at;
  }

  isFutureLocked(task: any): boolean {
    return this.isTooEarly(task.due_date, task.recurrence_interval_days) && !task.completed_at;
  }

  getMemberName(uid: string): string {
    if (!this.household?.members) return 'Unknown';
    const member = this.household.members.find((m) => m.id === uid);
    return member ? member.display_name : 'Unknown';
  }

  formatDueDate(dueDateStr: string | null): string {
    if (!dueDateStr) return 'No due date';

    const due = new Date(dueDateStr);
    if (isNaN(due.getTime())) return 'Invalid date';

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

  getDisplayDueDate(task: any): string | null {
    if (!task.due_date) return null;

    if (this.isCooldown(task) && task.recurrence_interval_days) {
      const displayDate = new Date(task.due_date);
      displayDate.setDate(displayDate.getDate() - task.recurrence_interval_days);
      return displayDate.toISOString();
    }

    return task.due_date;
  }

  getUrgency(dueDateStr: string | null, status: string): string {
    if (status === 'completed' || !dueDateStr) return '';

    const due = new Date(dueDateStr);
    if (isNaN(due.getTime())) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    if (diff < 0) return 'OVERDUE';
    if (diff === 0) return 'Due today';
    return '';
  }

  onComplete(taskId: string): void {
    this.completeTask.emit(taskId);
  }

  onOpenCreateTask(): void {
    this.openCreateTask.emit();
  }

  onEditTask(task: Task): void {
    this.editTask.emit(task);
  }
}
