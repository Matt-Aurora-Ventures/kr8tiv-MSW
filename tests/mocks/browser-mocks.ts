import { vi } from "vitest";
import type { Page, BrowserContext, Cookie } from "playwright";

export function createMockPage(options?: {
  cookies?: Cookie[];
  url?: string;
}): Page {
  const mockPage = {
    cookies: vi.fn().mockResolvedValue(options?.cookies ?? []),
    url: vi.fn().mockReturnValue(options?.url ?? "https://notebooklm.google.com"),
    goto: vi.fn().mockResolvedValue(null),
    waitForLoadState: vi.fn().mockResolvedValue(null),
    context: vi.fn().mockReturnValue(createMockContext({ cookies: options?.cookies })),
  } as unknown as Page;

  return mockPage;
}

export function createMockContext(options?: {
  cookies?: Cookie[];
}): BrowserContext {
  const mockContext = {
    cookies: vi.fn().mockResolvedValue(options?.cookies ?? []),
    addCookies: vi.fn().mockResolvedValue(null),
  } as unknown as BrowserContext;

  return mockContext;
}
