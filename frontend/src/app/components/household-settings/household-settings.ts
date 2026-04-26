import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router'; // 1. Add this import

@Component({
  selector: 'app-household-settings',
  templateUrl: './household-settings.html',
  styleUrls: ['./household-settings.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
})
export class HouseholdSettingsComponent implements OnInit {
  householdName: string = 'The Heavy Lifters'; 
  inviteCode: string = 'HVY-2026-X7K'; 
  isAdmin: boolean = true; 

  ngOnInit(): void {
    console.log('Household Settings initialized');
  }

  saveName() {
    console.log('Updating Household name to:', this.householdName);
    alert('Household name updated!');
  }

  copyCode() {
    navigator.clipboard.writeText(this.inviteCode);
    alert('Invite code copied!');
  }

  resetLeaderboard() {
    if (confirm("Reset the leaderboard? All points will return to zero.")) {
      alert('Leaderboard has been reset.');
    }
  }

  dissolveHousehold(): void {
  const confirmation = confirm(
    "ARE YOU SURE? This will remove all members and permanently delete this household. This action cannot be undone."
  );

  if (confirmation) {
    // For now, we can just log it or call your service logic
    console.log("Dissolving household...");
    // this.householdService.deleteHousehold(this.householdId).subscribe(...);
  }
}
}