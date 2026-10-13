# Volunteer shift eligibility

`checkEligibility(volunteerId, openingId)` returns `{ status, reasons }` for a volunteer and an opening, using the data in `fixtures/fixtures.json`. See `SPEC.md` for the rules and `DECISIONS.md` for the choices I made where the spec was unclear.

## Running it

Check a volunteer against an opening with `npm run check`, passing the volunteer id and the opening id.

```
npm install
npm run check -- vol-001 open-meals-mon-pm-server
```

That prints the result as JSON.

```
{
  "status": "ELIGIBLE",
  "reasons": []
}
```

The tests go through every case in `fixtures/cases.json` plus a few extra ones for the decisions I made.

```
npm test
npm run typecheck
```

Node version is in `.nvmrc`.

## Using it

```ts
import { checkEligibility } from "./src/checkEligibility";

checkEligibility("vol-001", "open-meals-mon-pm-server");
// { status: "ELIGIBLE", reasons: [] }
```

An unknown volunteer or opening id throws an error.

## Layout

- `src/checkEligibility.ts` has `checkEligibility` and one small function per rule
- `src/run.ts` is the small script behind `npm run check`
- `src/types.ts` has the types for the fixture data and the result
- `tests/checkEligibility.test.ts` has the provided cases plus tests for the decisions in `DECISIONS.md`
