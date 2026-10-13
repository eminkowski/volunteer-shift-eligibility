import fixtures from "../fixtures/fixtures.json";
import type {
  EligibilityData,
  EligibilityResult,
  Opening,
  Opportunity,
  QualificationRule,
  ReasonCode,
  Shift,
  Signup,
  Volunteer,
} from "./types";

const fixtureData = fixtures as EligibilityData;

export function checkEligibility(
  volunteerId: string,
  openingId: string,
): EligibilityResult {
  return evaluateEligibility(fixtureData, volunteerId, openingId);
}

export function evaluateEligibility(
  data: EligibilityData,
  volunteerId: string,
  openingId: string,
): EligibilityResult {
  const volunteer = getById(data.volunteers, volunteerId, "volunteer");
  const opening = getById(data.openings, openingId, "opening");
  const shift = getById(data.shifts, opening.shiftId, "shift");
  const opportunity = getById(
    data.opportunities,
    shift.opportunityId,
    "opportunity",
  );

  // Don't expose group restrictions.
  if (isBlockedByGroup(volunteer, opportunity)) {
    return { status: "BLOCKED", reasons: [] };
  }

  const reasons: ReasonCode[] = [
    ...checkShiftAndOpeningStatus(shift, opening),
    ...checkQualifications(volunteer, opportunity),
    ...checkWaiver(data, volunteer, opportunity),
    ...checkScheduleConflict(data, volunteer, shift),
  ];

  // Don't run capacity again for an existing signup.
  let canWaitlist = false;
  const existingSignup = findSignup(data.signups, volunteer.id, opening.id);
  if (existingSignup) {
    reasons.push("ALREADY_SIGNED_UP");
  } else {
    const capacity = checkCapacity(data.signups, opening);
    reasons.push(...capacity.reasons);
    canWaitlist = capacity.canWaitlist;
  }

  if (reasons.length > 0) {
    return { status: "BLOCKED", reasons };
  }
  return { status: canWaitlist ? "WAITLIST" : "ELIGIBLE", reasons: [] };
}

function checkShiftAndOpeningStatus(
  shift: Shift,
  opening: Opening,
): ReasonCode[] {
  const reasons: ReasonCode[] = [];
  if (!shift.isPublished) reasons.push("SHIFT_NOT_PUBLISHED");
  if (!shift.isActive) reasons.push("SHIFT_INACTIVE");
  if (!opening.isActive) reasons.push("OPENING_INACTIVE");
  return reasons;
}

function checkCapacity(
  signups: Signup[],
  opening: Opening,
): { reasons: ReasonCode[]; canWaitlist: boolean } {
  const confirmed = countSignups(signups, opening.id, "CONFIRMED");
  const waitlisted = countSignups(signups, opening.id, "WAITLISTED");

  if (confirmed < opening.maxVolunteers) {
    return { reasons: [], canWaitlist: false };
  }
  if (opening.waitlistMax === 0) {
    return { reasons: ["AT_CAPACITY"], canWaitlist: false };
  }
  if (waitlisted < opening.waitlistMax) {
    return { reasons: [], canWaitlist: true };
  }
  return { reasons: ["WAITLIST_FULL"], canWaitlist: false };
}

function checkQualifications(
  volunteer: Volunteer,
  opportunity: Opportunity,
): ReasonCode[] {
  const reasons: ReasonCode[] = [];

  for (const rule of opportunity.qualificationRules) {
    if (!rule.isActive) continue;

    if (rule.type === "DOES_NOT_HAVE_ALL") {
      if (!passesDisallowedQualificationRule(volunteer, rule)) {
        reasons.push("DISALLOWED_QUALIFICATION");
      }
    } else if (!passesHasRule(volunteer, rule)) {
      reasons.push("MISSING_QUALIFICATION");
    }
  }

  return [...new Set(reasons)];
}

function passesHasRule(volunteer: Volunteer, rule: QualificationRule): boolean {
  const held = (id: string) => volunteer.qualificationIds.includes(id);

  if (rule.type === "HAS_ANY") return rule.qualificationIds.some(held);
  return rule.qualificationIds.every(held); // HAS_ALL
}

// The worked example treats any listed restriction as disqualifying.
function passesDisallowedQualificationRule(
  volunteer: Volunteer,
  rule: QualificationRule,
): boolean {
  return !rule.qualificationIds.some((id) =>
    volunteer.qualificationIds.includes(id),
  );
}

function checkWaiver(
  data: EligibilityData,
  volunteer: Volunteer,
  opportunity: Opportunity,
): ReasonCode[] {
  if (opportunity.requiredWaiverId === null) return [];

  const waiver = getById(data.waivers, opportunity.requiredWaiverId, "waiver");
  const hasCurrentSignature = volunteer.signedWaivers.some(
    (signed) =>
      signed.waiverId === waiver.id && signed.version === waiver.currentVersion,
  );
  return hasCurrentSignature ? [] : ["WAIVER_REQUIRED"];
}

function isBlockedByGroup(
  volunteer: Volunteer,
  opportunity: Opportunity,
): boolean {
  const allowedGroups = opportunity.restrictedToGroupIds;
  if (allowedGroups.length === 0) return false;
  return !allowedGroups.some((id) => volunteer.groupIds.includes(id));
}

function checkScheduleConflict(
  data: EligibilityData,
  volunteer: Volunteer,
  shift: Shift,
): ReasonCode[] {
  const hasConflict = data.signups
    .filter((s) => s.volunteerId === volunteer.id && s.state === "CONFIRMED")
    .map((s) => getById(data.openings, s.openingId, "opening"))
    .filter((opening) => opening.shiftId !== shift.id)
    .map((opening) => getById(data.shifts, opening.shiftId, "shift"))
    .some((other) => shiftsOverlap(shift, other));

  return hasConflict ? ["SCHEDULE_CONFLICT"] : [];
}

// Back to back shifts don't overlap.
function shiftsOverlap(a: Shift, b: Shift): boolean {
  return (
    toTime(a.startsAt) < toTime(b.endsAt) &&
    toTime(b.startsAt) < toTime(a.endsAt)
  );
}

function toTime(timestamp: string): number {
  return new Date(timestamp).getTime();
}

function findSignup(
  signups: Signup[],
  volunteerId: string,
  openingId: string,
): Signup | undefined {
  return signups.find(
    (s) => s.volunteerId === volunteerId && s.openingId === openingId,
  );
}

function countSignups(
  signups: Signup[],
  openingId: string,
  state: Signup["state"],
): number {
  return signups.filter((s) => s.openingId === openingId && s.state === state)
    .length;
}

function getById<T extends { id: string }>(
  items: T[],
  id: string,
  label: string,
): T {
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`Unknown ${label} id: ${id}`);
  return item;
}
