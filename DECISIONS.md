# Decisions

> This is the part of your submission we read most carefully. Prose is fine—bullet
> points are fine too. Length isn't a virtue—roughly a page is plenty.

## What I built

`checkEligibility(volunteerId, openingId)` loads the fixtures and calls `evaluateEligibility`, which takes the data as an argument so tests can pass in changed fixtures. Each rule is its own small function and the main one just collects the reasons. There aren't many rules so I didn't bother with anything more generic.

## Assumptions I made

The spec says to return every reason, so I keep checking after the first failure, except for the group case. If someone can be waitlisted but fails another rule, I return `BLOCKED`. That seemed more reasonable than returning `WAITLIST`, but I'd still confirm it with Product.

Shifts that touch at the boundary don't overlap, so back to back shifts are fine. I'd check that's what they want.

If someone's already confirmed or waitlisted for the exact opening, I return `ALREADY_SIGNED_UP` and `BLOCKED`. I don't use that signup to also say the opening is full or that they conflict with themselves. A signup on another opening of the same `shiftId` isn't a schedule conflict either, since it's the same shift. I'd ask if people can really have two roles on one shift.

An empty qualification list passes `HAS_ALL` and fails `HAS_ANY`. It passes the disallowed rule too since there's nothing in it to block anyone.

The opportunities have cities but the timestamps don't have timezone info. I don't try to infer a timezone from the city. I parse the timestamps as provided.

If the volunteer or opening doesn't exist, I throw an error instead of inventing another eligibility reason. The spec doesn't say what the result should be for bad input. The same thing happens for a broken reference in the fixture data, like a shift pointing at an opportunity that doesn't exist.

A confirmed signup on a cancelled or unpublished shift still counts for conflicts, since the spec just says confirmed. I also still return things like `AT_CAPACITY` on a cancelled shift because it says to return every reason.

## Problems I found in the spec

### `DOES_NOT_HAVE_ALL`

The qualification data mixes normal qualifications with things like Under 18 and Lifting Restriction On File. The table says `DOES_NOT_HAVE_ALL` only fails if the volunteer has all of the listed qualifications, but the warehouse example blocks Fern even though she only has Lifting Restriction On File. `DISALLOWED_QUALIFICATION` also sounds like one disqualifying qualification should be enough.

I went with any listed restriction being enough to block them because otherwise the Fern example doesn't make sense. The fixture still calls it `DOES_NOT_HAVE_ALL`, but the example behaves more like `DOES_NOT_HAVE_ANY`. I'd change the rule name or definition so those don't disagree.

### Group restrictions

The group rule says to return `BLOCKED` with no reasons because membership is private, but `GROUP_RESTRICTED` is a reason code and the spec also says to return every reason. I treated the group rule as the exception. If they fail it I return `BLOCKED` with no reasons and stop, since any other reason could give away that there's a group restriction. I'd either drop `GROUP_RESTRICTED` or say when it's supposed to be used.

### Status isn't always clear

The spec says when to use `WAITLIST` but most of the `BLOCKED` behavior only shows up in the cases. It also doesn't say what happens when there's waitlist room but another rule fails. I return `BLOCKED` if anything else fails and only use `WAITLIST` when everything else passes. I'd spell out the status for each reason and what should happen when waitlist space and another failure happen together.

### Same shift and existing signups

The retired opening case has a volunteer already confirmed on another opening of the same shift, and it doesn't expect `SCHEDULE_CONFLICT`. The already signed up case doesn't count the volunteer against themselves either. So I read it as another opening on the same `shiftId` not being a conflict. I'd want that spelled out because the "not being in two places at once" part could also be read the other way.

## What I deliberately did not build

- The whole opportunity check from the nice to have section. The required function is for one opening, so I kept the scope there.
- Timezone handling. The timestamps don't have one and I didn't want to guess.
- Validation for bad timestamps.
- Any use of `GROUP_RESTRICTED`. It's still in the type because it's in the spec, but I don't return it because of the privacy rule.
- A rules engine or anything generic. A few small functions seemed like enough.

## What I'd do with three more hours

1. Clarify the spec issues above, especially `DOES_NOT_HAVE_ALL`, the group rule and whether multiple openings on the same shift are allowed.
2. Check `opp-youth`. It has an empty `HAS_ALL` rule and no group restriction, so I let the empty rule pass. I'd confirm that's intended since an under 18 volunteer with the general waiver gets through.
3. Handle timezone and bad timestamp behavior instead of just parsing the values as provided.
4. Add the whole opportunity version from the nice to have section.

## How I used AI, if I did

I did my own pass through the spec, fixtures, and cases first and wrote down what stood out to me. After that I used AI as a second set of eyes before I started coding.

I wrote the main implementation myself. After that I used AI to review the code and tests and verify comments, setup, documentation, etc. I went through the changes before keeping them.
