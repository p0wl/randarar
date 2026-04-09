import { BookingRequest, BookingResult } from '../types';
import { BookingsRepository } from '../repositories/bookings';
import { CredentialsRepository } from '../repositories/credentials';
import { bookCourse } from '../browser/clubity';

export async function processBooking(
  booking: BookingRequest,
  bookingsRepo: BookingsRepository,
  credentialsRepo: CredentialsRepository,
  headless = true,
): Promise<BookingResult> {
  console.log(`[booking] Processing booking ${booking.id} for URL: ${booking.url}`);

  let credential;
  try {
    credential = await credentialsRepo.get(booking.credentialId);
  } catch (err) {
    const message = `Failed to load credential '${booking.credentialId}': ${err}`;
    console.error('[booking]', message);
    await bookingsRepo.updateStatus(booking.id, 'failed', { error: message });
    return { success: false, message };
  }

  let result: BookingResult;
  try {
    result = await bookCourse(booking.url, credential, headless);
  } catch (err) {
    const message = `Browser error: ${err instanceof Error ? err.message : String(err)}`;
    console.error('[booking]', message);
    await bookingsRepo.updateStatus(booking.id, 'failed', { error: message });
    return { success: false, message };
  }

  if (result.success) {
    await bookingsRepo.updateStatus(booking.id, 'booked', { bookedAt: new Date().toISOString() });
  } else if (result.notOpenYet) {
    // Leave as pending — scheduler will retry next hour
    console.log(`[booking] Not open yet, leaving pending: ${booking.id}`);
  } else {
    await bookingsRepo.updateStatus(booking.id, 'failed', { error: result.message });
  }

  return result;
}

export async function runScheduler(
  bookingsRepo: BookingsRepository,
  credentialsRepo: CredentialsRepository,
  headless = true,
): Promise<void> {
  const pending = await bookingsRepo.listPending();
  console.log(`[scheduler] Found ${pending.length} pending booking(s)`);

  for (const booking of pending) {
    const result = await processBooking(booking, bookingsRepo, credentialsRepo, headless);
    console.log(`[scheduler] Result for ${booking.id}:`, result.message);
  }
}
