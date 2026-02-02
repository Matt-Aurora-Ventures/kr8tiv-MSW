/**
 * Browser-related type definitions for MSW Protocol.
 */

export interface Viewport {
  width: number;
  height: number;
}

export interface BrowserConfig {
  /** Directory for persistent Chrome profile */
  profileDir: string;
  /** Whether to run headless (should be false for Google services) */
  headless: boolean;
  /** Browser viewport dimensions */
  viewport: Viewport;
  /** Optional custom user agent string */
  userAgent?: string;
}

export interface LaunchOptions extends BrowserConfig {
  /** Additional Chromium launch arguments */
  args?: string[];
}

/** Default Chrome user agent to avoid headless detection */
export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
  profileDir: getDefaultProfileDir(),
  headless: false,
  viewport: { width: 1280, height: 900 },
  userAgent: DEFAULT_USER_AGENT,
};

function getDefaultProfileDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return `${home}/.msw/chrome-profile`;
}
