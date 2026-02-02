/**
 * Stealth plugin configuration for Playwright.
 *
 * Applies puppeteer-extra-plugin-stealth evasions to playwright-extra's
 * chromium instance. The plugin is applied only once (guarded by module flag)
 * to prevent duplicate registration errors.
 */

import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

let stealthApplied = false;

/**
 * Configure and return the stealth-enabled chromium instance.
 *
 * Applies stealth evasions that:
 * - Remove navigator.webdriver flag
 * - Patch headless fingerprints (WebGL, canvas, etc.)
 * - Normalize plugin/mime arrays
 * - Spoof chrome.runtime
 *
 * Safe to call multiple times; plugin is only applied once.
 */
export function configureStealthBrowser(): typeof chromium {
  if (!stealthApplied) {
    chromium.use(StealthPlugin());
    stealthApplied = true;
  }
  return chromium;
}
