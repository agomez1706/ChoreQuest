import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HouseholdService } from '../../services/household.service';

@Component({
  selector: 'app-create-household',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './create-household.component.html',
  styleUrl: './create-household.component.scss',
})
export class CreateHouseholdComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly householdService = inject(HouseholdService);
  private readonly router = inject(Router);

  form!: FormGroup;
  loading = false;
  errorMsg = '';

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    });
  }

  get nameCtrl() { return this.form.get('name')!; }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.errorMsg = '';
    this.householdService.createHousehold({ name: this.nameCtrl.value.trim() }).subscribe({
      next: () => { this.loading = false; this.router.navigate(['/household']); },
      error: (err: Error) => { this.loading = false; this.errorMsg = err.message; },
    });
  }
}
