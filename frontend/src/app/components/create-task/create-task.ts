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

  isSubmitting = false;
  errorMessage = '';

  ngOnInit() {
    this.due_date = new Date();
  }

  private getLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getNormalizedPoints(): number | null {
    const points = this.points;
    if (points === null || !Number.isFinite(points) || !Number.isInteger(points) || points < 0) {
      return null;
    }

    return points;
  }

  private getNormalizedTitle(): string | null {
    const normalizedTitle = this.title.trim();
    return normalizedTitle.length > 0 ? normalizedTitle : null;
  }

  private getNormalizedAssignedTo(): string | null {
    if (typeof this.assigned_to !== 'string') {
      return null;
    }

    const normalizedAssignedTo = this.assigned_to.trim();
    return normalizedAssignedTo.length > 0 ? normalizedAssignedTo : null;
  }

  private getNormalizedDifficulty(): 'Easy' | 'Medium' | 'Hard' | null {
    if (this.difficulty === 'Easy' || this.difficulty === 'Medium' || this.difficulty === 'Hard') {
      return this.difficulty;
    }

    return null;
  }

  private getNormalizedDueDate(): string | null {
    if (this.due_date instanceof Date) {
      return this.getLocalDateString(this.due_date);
    }

    if (typeof this.due_date === 'string' && this.due_date.trim().length > 0) {
      return this.due_date;
    }

    return null;
  }

  get isFormValid(): boolean {
    return (
      this.getNormalizedTitle() !== null &&
      this.getNormalizedAssignedTo() !== null &&
      this.getNormalizedDifficulty() !== null &&
      this.getNormalizedDueDate() !== null &&
      this.getNormalizedPoints() !== null
    );
  }

  submit() {
    if (!this.isFormValid || this.isSubmitting) return;

    const normalizedPoints = this.getNormalizedPoints();
    if (normalizedPoints === null) {
      this.errorMessage = 'Points must be a whole number greater than or equal to 0.';
      return;
    }

    const normalizedDueDate = this.getNormalizedDueDate();
    if (normalizedDueDate === null) {
      this.errorMessage = 'Due date is required.';
      return;
    }

    const normalizedTitle = this.getNormalizedTitle();
    if (normalizedTitle === null) {
      this.errorMessage = 'Task title is required.';
      return;
    }

    const normalizedAssignedTo = this.getNormalizedAssignedTo();
    if (normalizedAssignedTo === null) {
      this.errorMessage = 'Please select a member to assign this task.';
      return;
    }

    const normalizedDifficulty = this.getNormalizedDifficulty();
    if (normalizedDifficulty === null) {
      this.errorMessage = 'Please select a valid difficulty.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload: CreateTaskPayload = {
      title: normalizedTitle,
      assigned_to: normalizedAssignedTo,
      due_date: normalizedDueDate,
      difficulty: normalizedDifficulty,
      points: normalizedPoints,
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
