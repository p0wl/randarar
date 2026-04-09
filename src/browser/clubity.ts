import * as fs from 'fs';
import * as path from 'path';
import { launchBrowser } from './launch';
import { Credential, BookingResult } from '../types';

const DEBUG_SCREENSHOTS = process.env.DEBUG_SCREENSHOTS === 'true';

async function screenshot(page: import('playwright-core').Page, name: string): Promise<void> {
  if (!DEBUG_SCREENSHOTS) return;
  const dir = 'screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const file = path.join(dir, `${name}-${Date.now()}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`[clubity] Screenshot: ${file}`);
}

async function isVisible(page: import('playwright-core').Page, selector: string, timeoutMs = 3000): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

async function logPageState(page: import('playwright-core').Page): Promise<void> {
  const text = await page.locator('body').innerText().catch(() => '');
  console.log('[clubity] Page text:', text.replace(/\s+/g, ' ').trim().slice(0, 600));
}

export async function bookCourse(
  url: string,
  credential: Credential,
  headless = true,
): Promise<BookingResult> {
  console.log('[clubity] Launching browser, URL:', url);
  const browser = await launchBrowser(headless);

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(20_000);

    await page.goto(url, { waitUntil: 'networkidle' });
    console.log('[clubity] Page loaded');
    await screenshot(page, '01-loaded');
    await logPageState(page);

    // --- Phase 1: Login (if inline login form is present) ---

    const hasEmailInput = await isVisible(page, 'input[type="email"], input[name="email"]', 5000);

    if (hasEmailInput) {
      console.log('[clubity] Inline login form found — filling credentials');
      await screenshot(page, '02-login-form');

      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();

      await emailInput.fill(credential.email);
      await passwordInput.fill(credential.password);

      // Submit the login form
      const submitBtn = page.locator([
        'button[type="submit"]',
        'button:has-text("Anmelden")',
        'button:has-text("Login")',
        'button:has-text("Einloggen")',
        'button:has-text("Weiter")',
      ].join(', ')).first();

      await submitBtn.click();
      await page.waitForLoadState('networkidle');
      console.log('[clubity] Credentials submitted');
      await screenshot(page, '03-after-login');
      await logPageState(page);

    } else {
      console.log('[clubity] No inline login form — assuming already logged in or booking not open');
    }

    // --- Phase 2: Check for booking not open yet ---

    // If "buchbar ab" is visible and no book button, registration isn't open
    const buchbarAbVisible = await isVisible(page, 'text=/[Bb]uchbar ab/', 2000);
    if (buchbarAbVisible) {
      const buchbarText = await page.locator('text=/[Bb]uchbar ab/').first().textContent().catch(() => '');
      console.log('[clubity] Buchbar ab:', buchbarText?.trim());
    }

    // --- Phase 3: Look for booking button (with optional checkbox) ---

    const bookBtnSelector = [
      'button:has-text("Buchen")',
      'button:has-text("Jetzt buchen")',
      'button:has-text("Kurs buchen")',
    ].join(', ');

    const hasBookBtn = await isVisible(page, bookBtnSelector, 5000);

    if (!hasBookBtn) {
      console.log('[clubity] No booking button visible');
      await screenshot(page, '04-no-book-button');
      return {
        success: false,
        notOpenYet: true,
        message: buchbarAbVisible
          ? 'Course not yet open for booking ("buchbar ab" shown)'
          : 'No booking button visible — may not be open yet or already booked',
      };
    }

    const bookBtn = page.locator(bookBtnSelector).first();
    const isEnabled = await bookBtn.isEnabled();

    if (!isEnabled) {
      console.log('[clubity] Booking button is disabled');
      return {
        success: false,
        notOpenYet: true,
        message: 'Booking button found but disabled — course is not yet open for booking',
      };
    }

    // Tick confirmation checkbox if present
    if (await isVisible(page, 'input[type="checkbox"]', 2000)) {
      console.log('[clubity] Checking confirmation checkbox');
      await page.locator('input[type="checkbox"]').first().check();
    }

    await screenshot(page, '04-before-book');
    console.log('[clubity] Clicking booking button...');
    await bookBtn.click();
    await page.waitForLoadState('networkidle');
    await screenshot(page, '05-after-book');
    await logPageState(page);

    // --- Phase 4: Check result ---

    const successPatterns = [
      'text=/[Ee]rfolgreich/',
      'text=/[Bb]uchung bestätigt/',
      'text=/[Gg]ebucht/',
      'text=/[Bb]estätigt/',
      'text=/[Aa]ngemeldet/',
    ];
    for (const pattern of successPatterns) {
      if (await isVisible(page, pattern, 3000)) {
        const text = await page.locator(pattern).first().textContent().catch(() => 'confirmed');
        return { success: true, message: `Booking confirmed: ${text?.trim()}` };
      }
    }

    const errorPatterns = ['text=/[Ff]ehler/', 'text=/[Ee]rror/'];
    for (const pattern of errorPatterns) {
      if (await isVisible(page, pattern, 1000)) {
        const text = await page.locator(pattern).first().textContent().catch(() => 'unknown error');
        return { success: false, message: `Booking error: ${text?.trim()}` };
      }
    }

    return { success: true, message: 'Booking submitted — please verify in the app' };

  } finally {
    await browser.close();
  }
}
