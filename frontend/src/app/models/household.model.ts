export interface HouseholdMember {
  id: number;
  display_name: string;
  email: string;
  is_admin: boolean;
  joined_at: string;
}

export interface Household {
  id: number;
  name: string;
  invite_code: string;
  admin_id: number;
  member_count: number;
  is_full: boolean;
  members: HouseholdMember[];
  created_at: string;
}

export interface CreateHouseholdPayload { name: string; }
export interface JoinHouseholdPayload { invite_code: string; }
