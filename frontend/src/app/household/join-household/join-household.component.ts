import { Component, inject, OnInit } from '@angular/core';
import {
  AbstractControl, FormBuilder, FormGroup,
  ReactiveFormsModule, ValidationErrors, Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HouseholdService } from '../../services/household.service';

function codeValidator(control: AbstractControl): ValidationErrors | null {
  return /^[A-Z0-9]{6}$/.test((control.value ?? '').toUpperCase())
    ? null : { invalidCode: true };
}

@Component({
  selector: 'app-join-household',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './join-household.component.html',
  styleUrl: './join-household.component.scss',
})
export class JoinHouseholdComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly householdService = inject(HouseholdService);
  private readonly router = inject(Router);

  form!: FormGroup;
  loading = false;
  errorMsg = '';

  ngOnInit(): void {
    this.form = this.fb.group({
      invite_code: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(6),
        codeValidator,
      ]],
    });
  }

  get codeCtrl() { return this.form.get('invite_code')!; }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.codeCtrl.setValue(
      input.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      { emitEvent: false },
    );
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.errorMsg = '';
    this.householdService.joinHousehold({ invite_code: this.codeCtrl.value }).subscribe({
      next: () => { this.loading = false; this.router.navigate(['/dashboard']); },
      error: (err: Error) => { this.loading = false; this.errorMsg = err.message; },
    });
  }
}
