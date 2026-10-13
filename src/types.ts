export type EligibilityStatus = "ELIGIBLE" | "WAITLIST" | "BLOCKED";

export type ReasonCode =
  | "SHIFT_NOT_PUBLISHED"
  | "SHIFT_INACTIVE"
  | "OPENING_INACTIVE"
  | "AT_CAPACITY"
  | "WAITLIST_FULL"
  | "ALREADY_SIGNED_UP"
  | "MISSING_QUALIFICATION"
  | "DISALLOWED_QUALIFICATION"
  | "WAIVER_REQUIRED"
  | "GROUP_RESTRICTED"
  | "SCHEDULE_CONFLICT";

export interface EligibilityResult {
  status: EligibilityStatus;
  reasons: ReasonCode[];
}

export type QualificationRuleType = "HAS_ANY" | "HAS_ALL" | "DOES_NOT_HAVE_ALL";

export interface QualificationRule {
  id: string;
  type: QualificationRuleType;
  qualificationIds: string[];
  isActive: boolean;
}

export interface Volunteer {
  id: string;
  name: string;
  qualificationIds: string[];
  signedWaivers: { waiverId: string; version: number }[];
  groupIds: string[];
}

export interface Opportunity {
  id: string;
  organizationId: string;
  name: string;
  city: string;
  requiredWaiverId: string | null;
  restrictedToGroupIds: string[];
  qualificationRules: QualificationRule[];
}

export interface Shift {
  id: string;
  opportunityId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  isPublished: boolean;
  isActive: boolean;
}

export interface Opening {
  id: string;
  shiftId: string;
  roleName: string;
  maxVolunteers: number;
  waitlistMax: number;
  isActive: boolean;
}

export interface Signup {
  volunteerId: string;
  openingId: string;
  state: "CONFIRMED" | "WAITLISTED";
}

export interface Waiver {
  id: string;
  name: string;
  currentVersion: number;
}

export interface EligibilityData {
  volunteers: Volunteer[];
  opportunities: Opportunity[];
  shifts: Shift[];
  openings: Opening[];
  signups: Signup[];
  waivers: Waiver[];
}
