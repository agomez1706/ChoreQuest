import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HouseholdService } from '../../../services/household.service';

/**
 * Custom validator to ensure the code is exactly 6 alphanumeric characters.
 */
function codeValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '').toUpperCase();
  return /^[A-Z0-9]{6}$/.test(value) ? null : { invalidCode: true };
}

@Component({
  selector: 'app-join-household',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './join-household.html',
  styleUrl: './join-household.css',
})
export class JoinHouseholdComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly householdService = inject(HouseholdService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  form!: FormGroup;
  loading = false;
  errorMsg = '';

  ngOnInit(): void {
    this.form = this.fb.group({
      invite_code: [
        '',
        [Validators.required, Validators.minLength(6), Validators.maxLength(6), codeValidator],
      ],
    });
  }

  get codeCtrl() {
    return this.form.get('invite_code')!;
  }

  /**
   * Sanitizes input to be uppercase alphanumeric only.
   */
  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const sanitized = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    this.codeCtrl.setValue(sanitized, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    this.householdService.joinHousehold({ invite_code: this.codeCtrl.value }).subscribe({
      next: () => {
        this.loading = false;
        this.cdr.detectChanges(); // Fixes "infinite loading" UI bug
        this.router.navigate(['/dashboard']);
      },
      error: (err: Error) => {
        this.loading = false;
        this.errorMsg = err.message;
        this.cdr.detectChanges();
      },
    });
  }
}
