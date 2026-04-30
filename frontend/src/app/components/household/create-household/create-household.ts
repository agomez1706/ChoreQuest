import {
  Component,
  inject,
  OnInit,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HouseholdService } from '../../../services/household';

@Component({
  selector: 'app-create-household',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './create-household.html',
  styleUrl: './create-household.css',
})
export class CreateHouseholdComponent implements OnInit, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly householdService = inject(HouseholdService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;

  form!: FormGroup;
  loading = false;
  errorMsg = '';

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    });
  }

  ngAfterViewInit(): void {
    if (this.nameInput) {
      this.nameInput.nativeElement.focus();
    }
  }

  get nameCtrl() {
    return this.form.get('name')!;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.errorMsg = '';

    this.householdService.createHousehold({ name: this.nameCtrl.value.trim() }).subscribe({
      next: () => {
        this.loading = false;
        this.cdr.detectChanges();
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
