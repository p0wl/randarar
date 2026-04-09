import { launchBrowser } from './launch';
import { Credential, BookingResult } from '../types';

const LOGIN_SELECTORS = [
  'button:has-text("Anmelden")',
  'a:has-text("Anmelden")',
  'button:has-text("Login")',
  'a:has-text("Login")',
];

const BOOK_BUTTON_SELECTORS = [
  'button:has-text("Buchen")',
  'button:has-text("Jetzt buchen")',
  'button:has-text("Anmelden")',
];

const SUCCESS_INDICATORS = [
  'text=erfolgreich',
  'text=Buchung bestätigt',
  'text=gebucht',
  'text=bestätigt',
];

async function isVisible(page: import('playwright-core').Page, selector: string, timeoutMs = 3000): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

async function findFirst(page: import('playwright-core').Page, selectors: string[]): Promise<import('playwright-core').Locator | null> {
  for (const selector of selectors) {
    if (await isVisible(page, selector, 2000)) {
      return page.locator(selector).first();
    }
  }
  return null;
}

async function performLogin(page: import('playwright-core').Page, credential: Credential): Promise<void> {
  console.log('[clubity] Attempting login...');

  // Fill email
  await page.fill('input[type="email"], input[name="email"], input[name="username"]', credential.email);

  // Fill password
  await page.fill('input[type="password"]', credential.password);

  // Submit
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  console.log('[clubity] Login submitted, current URL:', page.url());
}

export async function bookCourse(
  url: string,
  credential: Credential,
  headless = true,
): Promise<BookingResult> {
  console.log('[clubity] Launching browser for URL:', url);
  const browser = await launchBrowser(headless);

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(15_000);

    console.log('[clubity] Navigating to URL...');
    await page.goto(url, { waitUntil: 'networkidle' });
    console.log('[clubity] Page loaded, URL:', page.url());

    // Handle redirect to login page
    if (page.url().includes('/login') || page.url().includes('/auth')) {
      await performLogin(page, credential);
      await page.goto(url, { waitUntil: 'networkidle' });
    }

    // Check for inline login button (e.g. modal or nav login)
    const loginBtn = await findFirst(page, LOGIN_SELECTORS);
    if (loginBtn) {
      console.log('[clubity] Found login button, clicking...');
      await loginBtn.click();
      await page.waitForLoadState('networkidle');

      // Login form may now be visible (modal or new page)
      await page.waitForSelector('input[type="password"]', { timeout: 10_000 });
      await performLogin(page, credential);

      // Navigate back to booking URL after login if redirected away
      if (!page.url().startsWith(new URL(url).origin + new URL(url).pathname)) {
        await page.goto(url, { waitUntil: 'networkidle' });
      }
    }

    console.log('[clubity] Looking for booking button...');

    // Check if booking button exists and is enabled
    const bookBtn = await findFirst(page, BOOK_BUTTON_SELECTORS);
    if (!bookBtn) {
      console.log('[clubity] No booking button found — not open yet or already booked');
      return { success: false, notOpenYet: true, message: 'Booking button not found — class may not be open for registration yet' };
    }

    const isEnabled = await bookBtn.isEnabled();
    if (!isEnabled) {
      console.log('[clubity] Booking button is disabled — not open yet');
      return { success: false, notOpenYet: true, message: 'Booking button is disabled — class is not open for registration yet' };
    }

    // Check for "buchbar ab" text to log when it opens
    const buchbarAb = page.locator('text=/[Bb]uchbar ab/').first();
    if (await isVisible(page, 'text=/[Bb]uchbar ab/', 1000)) {
      const text = await buchbarAb.textContent();
      console.log('[clubity] Booking opens:', text);
    }

    // Tick any confirmation checkbox (T&Cs, participation, etc.)
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await isVisible(page, 'input[type="checkbox"]', 2000)) {
      console.log('[clubity] Checking confirmation checkbox...');
      await checkbox.check();
    }

    // Click book button
    console.log('[clubity] Clicking booking button...');
    await bookBtn.click();
    await page.waitForLoadState('networkidle');

    // Check for success indicator
    const successEl = await findFirst(page, SUCCESS_INDICATORS);
    if (successEl) {
      const text = await successEl.textContent();
      console.log('[clubity] Booking confirmed:', text);
      return { success: true, message: `Booking confirmed: ${text}` };
    }

    // If no explicit success text, assume success (page changed after button click)
    console.log('[clubity] Booking submitted, no explicit confirmation text found');
    return { success: true, message: 'Booking submitted successfully' };
  } finally {
    await browser.close();
  }
}
