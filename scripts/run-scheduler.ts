/**
 * Run the scheduler locally using a local credentials file and in-memory bookings.
 *
 * Usage:
 *   LOCAL_CREDENTIALS_FILE=./credentials.local.json \
 *   tsx scripts/run-scheduler.ts
 *
 * Or with env-var credentials:
 *   CREDENTIAL_TRISTAN_EMAIL="t@example.com" \
 *   CREDENTIAL_TRISTAN_PASSWORD="secret" \
 *   tsx scripts/run-scheduler.ts
 *
 * To test a specific booking inline:
 *   BOOKING_URL="https://app.clubity.com/..." \
 *   BOOKING_CREDENTIAL_ID="tristan" \
 *   tsx scripts/run-scheduler.ts
 */

import { randomUUID } from 'crypto';
import { LocalCredentialsRepository } from '../src/repositories/credentials';
import { BookingsRepository } from '../src/repositories/bookings';
import { BookingRequest, BookingStatus } from '../src/types';
import { runScheduler } from '../src/core/booking';

// In-memory bookings repo for local testing
class InMemoryBookingsRepository implements BookingsRepository {
  private bookings: BookingRequest[] = [];

  async listPending(): Promise<BookingRequest[]> {
    return this.bookings.filter(b => b.status === 'pending');
  }

  async save(booking: BookingRequest): Promise<void> {
    this.bookings.push(booking);
  }

  async updateStatus(id: string, status: BookingStatus, extra?: { bookedAt?: string; error?: string }): Promise<void> {
    const booking = this.bookings.find(b => b.id === id);
    if (booking) {
      booking.status = status;
      if (extra?.bookedAt) booking.bookedAt = extra.bookedAt;
      if (extra?.error) booking.error = extra.error;
    }
    console.log(`[local-repo] Updated ${id}: ${status}`, extra ?? '');
  }
}

async function main() {
  const headless = process.env.HEADLESS !== 'false';
  const credentialsRepo = new LocalCredentialsRepository();
  const bookingsRepo = new InMemoryBookingsRepository();

  // Optionally seed a booking from env vars
  const bookingUrl = process.env.BOOKING_URL;
  const bookingCredentialId = process.env.BOOKING_CREDENTIAL_ID;

  if (bookingUrl && bookingCredentialId) {
    await bookingsRepo.save({
      id: randomUUID(),
      url: bookingUrl,
      credentialId: bookingCredentialId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    console.log('Seeded 1 booking from env vars');
  }

  const pending = await bookingsRepo.listPending();
  if (pending.length === 0) {
    console.log('No pending bookings. Set BOOKING_URL and BOOKING_CREDENTIAL_ID to add one.');
    process.exit(0);
  }

  await runScheduler(bookingsRepo, credentialsRepo, headless);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
