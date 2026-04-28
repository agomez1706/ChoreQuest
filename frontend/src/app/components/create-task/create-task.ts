import { Component, inject, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task';
import { HouseholdMember } from '../../models/household.model';
import { CreateTaskPayload } from '../../models/task.model';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { provideNativeDateAdapter } from '@angular/material/core';

@Component({
  selector: 'app-create-task',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    MatButtonToggleModule,
    MatSlideToggleModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './create-task.html',
  styleUrls: ['./create-task.css'],
})
export class CreateTaskComponent implements OnInit {
  private taskService = inject(TaskService);

  @Input() members: HouseholdMember[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() taskCreated = new EventEmitter<void>();

  title = '';
  assigned_to: string | null = '';
  due_date: string | Date | null = '';
  difficulty: 'Easy' | 'Medium' | 'Hard' | null = 'Easy';
  points: number | null = 10;
  is_recurring = false;
  recurrence_interval_days: number | null = 7;

  isSubmitting = false;
  errorMessage = '';
  showValidationErrors = false;

  ngOnInit() {
    this.due_date = new Date();
  }

  getLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getNormalizedPoints(): number | null {
    const points = this.points;
    if (points === null || !Number.isFinite(points) || !Number.isInteger(points) || points < 0) {
      return null;
    }
    return points;
  }

  getNormalizedTitle(): string | null {
    const normalizedTitle = this.title.trim();
    return normalizedTitle.length > 0 ? normalizedTitle : null;
  }

  getNormalizedAssignedTo(): string | null {
    if (typeof this.assigned_to !== 'string') return null;
    const normalizedAssignedTo = this.assigned_to.trim();
    return normalizedAssignedTo.length > 0 ? normalizedAssignedTo : null;
  }

  getNormalizedDifficulty(): 'Easy' | 'Medium' | 'Hard' | null {
    if (this.difficulty === 'Easy' || this.difficulty === 'Medium' || this.difficulty === 'Hard') {
      return this.difficulty;
    }
    return null;
  }

  getNormalizedDueDate(): string | null {
    if (this.due_date instanceof Date) {
      return this.getLocalDateString(this.due_date);
    }
    if (typeof this.due_date === 'string' && this.due_date.trim().length > 0) {
      return this.due_date;
    }
    return null;
  }

  getNormalizedRecurrenceInterval(): number | null {
    if (!this.is_recurring) return null;
    const val = this.recurrence_interval_days;
    if (val === null || !Number.isFinite(val) || !Number.isInteger(val) || val < 1) {
      return null;
    }
    return val;
  }

  getPointsErrorMessage(): string | null {
    if (this.points === null) return 'Points are required.';
    if (this.points < 0) return 'Points cannot be negative.';
    if (!Number.isInteger(this.points)) return 'Points must be a whole number (no decimals).';
    return null;
  }

  getRecurrenceErrorMessage(): string | null {
    if (!this.is_recurring) return null;
    const val = this.recurrence_interval_days;
    if (val === null) return 'Recurrence interval is required.';
    if (!Number.isInteger(val) || val < 1) return 'Interval must be a whole number of at least 1.';
    return null;
  }

  get isFormValid(): boolean {
    const recurringValid = !this.is_recurring || this.getNormalizedRecurrenceInterval() !== null;
    return (
      this.getNormalizedTitle() !== null &&
      this.getNormalizedAssignedTo() !== null &&
      this.getNormalizedDifficulty() !== null &&
      this.getNormalizedDueDate() !== null &&
      this.getNormalizedPoints() !== null &&
      recurringValid
    );
  }

  submit() {
    if (!this.isFormValid) {
      this.showValidationErrors = true;
      return;
    }
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    const title = this.getNormalizedTitle()!;
    const assignedTo = this.getNormalizedAssignedTo()!;
    const dueDate = this.getNormalizedDueDate()!;
    const difficulty = this.getNormalizedDifficulty()!;
    const points = this.getNormalizedPoints()!;

    const payload: CreateTaskPayload = {
      title,
      assigned_to: assignedTo,
      due_date: dueDate,
      difficulty,
      points,
      is_recurring: this.is_recurring,
      recurrence_interval_days: this.is_recurring ? this.getNormalizedRecurrenceInterval() : null,
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
