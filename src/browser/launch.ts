import { Browser } from 'playwright-core';

export async function launchBrowser(headless = true): Promise<Browser> {
  if (process.env.AWS_EXECUTION_ENV) {
    // Lambda: use @sparticuz/chromium binary
    const chromium = require('@sparticuz/chromium');
    const { chromium: playwright } = require('playwright-core');
    return playwright.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  } else {
    // Local: use full playwright installation
    const { chromium } = require('playwright');
    return chromium.launch({ headless });
  }
}
