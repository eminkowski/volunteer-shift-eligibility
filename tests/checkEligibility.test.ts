import { describe, expect, it } from "vitest";
import cases from "../fixtures/cases.json";
import fixtures from "../fixtures/fixtures.json";
import { checkEligibility, evaluateEligibility } from "../src/checkEligibility";
import type { EligibilityData, EligibilityResult } from "../src/types";

// Reason order doesn't matter so sort before comparing
function expectResult(
  actual: EligibilityResult,
  status: string,
  reasons: string[],
) {
  expect({
    status: actual.status,
    reasons: [...actual.reasons].sort(),
  }).toEqual({ status, reasons: [...reasons].sort() });
}

function cloneFixtures(): EligibilityData {
  return structuredClone(fixtures) as EligibilityData;
}

describe("provided cases", () => {
  for (const c of cases) {
    it(c.name, () => {
      const actual = checkEligibility(c.volunteerId, c.openingId);
      expectResult(actual, c.expected.status, c.expected.reasons);
    });
  }
});

describe("decisions not covered by the provided cases", () => {
  it("returns every reason for an unpublished shift with missing qual and waiver", () => {
    const result = checkEligibility("vol-003", "open-meals-draft-server");
    expectResult(result, "BLOCKED", [
      "SHIFT_NOT_PUBLISHED",
      "MISSING_QUALIFICATION",
      "WAIVER_REQUIRED",
    ]);
  });

  it("blocks instead of waitlisting when another rule fails", () => {
    const result = checkEligibility("vol-004", "open-meals-tue-server");
    expectResult(result, "BLOCKED", ["MISSING_QUALIFICATION"]);
  });

  it("blocks Fern even though she only has one listed restriction", () => {
    const result = checkEligibility("vol-006", "open-warehouse-mon-loader");
    expectResult(result, "BLOCKED", ["DISALLOWED_QUALIFICATION"]);
  });

  it("blocks a non-member without returning a reason", () => {
    const result = checkEligibility("vol-002", "open-kitchen-sat-cleaner");
    expectResult(result, "BLOCKED", []);
  });

  it("group restriction hides any other reasons", () => {
    const result = checkEligibility("vol-003", "open-kitchen-sat-cleaner");
    expectResult(result, "BLOCKED", []);
  });

  it("returns WAITLIST_FULL when the opening and its waitlist are both full", () => {
    const data = cloneFixtures();
    // Tuesday Server already has one of two waitlist spots taken
    data.signups.push({
      volunteerId: "vol-005",
      openingId: "open-meals-tue-server",
      state: "WAITLISTED",
    });
    const result = evaluateEligibility(
      data,
      "vol-001",
      "open-meals-tue-server",
    );
    expectResult(result, "BLOCKED", ["WAITLIST_FULL"]);
  });

  it("doesn't add AT_CAPACITY for someone already signed up on a full opening", () => {
    const result = checkEligibility("vol-008", "open-meals-tue-full");
    expectResult(result, "BLOCKED", [
      "ALREADY_SIGNED_UP",
      "MISSING_QUALIFICATION",
    ]);
  });

  it("lets a group member through to the other checks", () => {
    const result = checkEligibility("vol-001", "open-kitchen-sat-cleaner");
    expectResult(result, "BLOCKED", ["WAIVER_REQUIRED"]);
  });

  it("counts a waitlisted signup as ALREADY_SIGNED_UP too", () => {
    const result = checkEligibility("vol-003", "open-meals-tue-server");
    expectResult(result, "BLOCKED", [
      "ALREADY_SIGNED_UP",
      "MISSING_QUALIFICATION",
      "WAIVER_REQUIRED",
    ]);
  });

  it("doesn't treat another opening on the same shift as a conflict", () => {
    const result = checkEligibility("vol-002", "open-meals-tue-full");
    expectResult(result, "BLOCKED", ["AT_CAPACITY"]);
  });

  it("doesn't treat back to back shifts as overlapping", () => {
    const result = checkEligibility("vol-002", "open-meals-mon-pm-server");
    expectResult(result, "ELIGIBLE", []);
  });

  it("ignores an inactive qualification rule", () => {
    const data = cloneFixtures();
    const meals = data.opportunities.find((o) => o.id === "opp-meals")!;
    meals.qualificationRules[0]!.isActive = false;
    // vol-003 has no Food Safety but that rule is off, so only the waiver fails
    const result = evaluateEligibility(
      data,
      "vol-003",
      "open-meals-mon-pm-server",
    );
    expectResult(result, "BLOCKED", ["WAIVER_REQUIRED"]);
  });

  it("throws for an unknown volunteer or opening", () => {
    expect(() => checkEligibility("nope", "open-meals-mon-pm-server")).toThrow(
      "Unknown volunteer id: nope",
    );
    expect(() => checkEligibility("vol-001", "nope")).toThrow(
      "Unknown opening id: nope",
    );
  });
});
