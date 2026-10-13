import { checkEligibility } from "./checkEligibility";

const [volunteerId, openingId] = process.argv.slice(2);

if (!volunteerId || !openingId) {
  console.error("Usage: npm run check -- <volunteerId> <openingId>");
  process.exit(1);
}

try {
  console.log(
    JSON.stringify(checkEligibility(volunteerId, openingId), null, 2),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
