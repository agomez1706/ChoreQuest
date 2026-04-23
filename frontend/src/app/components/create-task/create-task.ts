import { Component, inject, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task';
import { HouseholdMember } from '../../models/household.model';
import { CreateTaskPayload } from '../../models/task.model';

@Component({
  selector: 'app-create-task',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-task.html',
  styleUrls: ['./create-task.css'],
})
export class CreateTaskComponent implements OnInit {
  private taskService = inject(TaskService);

  @Input() members: HouseholdMember[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() taskCreated = new EventEmitter<void>();

  title = '';
  assigned_to = '';
  due_date = '';
  difficulty: 'Easy' | 'Medium' | 'Hard' = 'Easy';

  isSubmitting = false;
  errorMessage = '';

  // Pre-fill today's date as a sensible default
  ngOnInit() {
    this.due_date = this.getLocalDateString(new Date());
  }

  private getLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get isFormValid(): boolean {
    return this.title.trim().length > 0 && this.assigned_to.length > 0 && this.due_date.length > 0;
  }

  submit() {
    if (!this.isFormValid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload: CreateTaskPayload = {
      title: this.title.trim(),
      assigned_to: this.assigned_to,
      due_date: this.due_date,
      difficulty: this.difficulty,
    };

    this.taskService.createTask(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.taskCreated.emit();
        this.close();
      },
      error: (err: Error) => {
        this.isSubmitting = false;
        this.errorMessage = err.message;
      },
    });
  }

  close() {
    this.closed.emit();
  }
}
