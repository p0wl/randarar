/**
 * Run a booking locally without AWS.
 *
 * Usage:
 *   CLUBITY_URL="https://app.clubity.com/..." \
 *   CLUBITY_EMAIL="you@example.com" \
 *   CLUBITY_PASSWORD="yourpassword" \
 *   tsx scripts/run-booking.ts
 *
 * Optional:
 *   HEADLESS=false   — watch the browser (default: true)
 */

import { bookCourse } from '../src/browser/clubity';

async function main() {
  const url = process.env.CLUBITY_URL;
  const email = process.env.CLUBITY_EMAIL;
  const password = process.env.CLUBITY_PASSWORD;
  const headless = process.env.HEADLESS !== 'false';

  if (!url || !email || !password) {
    console.error('Required env vars: CLUBITY_URL, CLUBITY_EMAIL, CLUBITY_PASSWORD');
    process.exit(1);
  }

  console.log('Starting booking for:', url);
  console.log('Headless:', headless);

  const result = await bookCourse(url, { email, password }, headless);

  console.log('\n--- Result ---');
  console.log('Success:', result.success);
  console.log('Not open yet:', result.notOpenYet ?? false);
  console.log('Message:', result.message);

  process.exit(result.success ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
