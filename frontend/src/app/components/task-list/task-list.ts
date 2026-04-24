import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../../models/task.model';
import { Household } from '../../models/household.model';

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

  @Output() completeTask = new EventEmitter<string>();
  @Output() openCreateTask = new EventEmitter<void>();

  isAssignedToMe(assignedTo: string): boolean {
    return assignedTo === this.currentUserUid;
  }

  getMemberName(uid: string): string {
    if (!this.household?.members) return 'Unknown';
    const member = this.household.members.find((m) => m.id === uid);
    return member ? member.display_name : 'Unknown';
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

  onComplete(taskId: string): void {
    this.completeTask.emit(taskId);
  }

  onOpenCreateTask(): void {
    this.openCreateTask.emit();
  }
}
