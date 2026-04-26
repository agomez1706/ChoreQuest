import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HouseholdSettingsComponent } from './household-settings';

describe('HouseholdSettings', () => {
  let component: HouseholdSettingsComponent;
  let fixture: ComponentFixture<HouseholdSettingsComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HouseholdSettingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HouseholdSettingsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
