/**
 * Browser detection utilities for Quill
 */

/**
 * Clear the browser detection cache - for testing purposes only
 * @internal
 */
export function _clearBrowserDetectionCache(): void {
  isWebkitCache = undefined;
}

// Cache results to avoid repeated calculations during typing
let isWebkitCache: boolean | undefined;

/**
 * Detects if the browser is WebKit-based (e.g., Safari, iOS browsers).
 */
export function isWebkit(): boolean {
  // Return cached result if available
  if (isWebkitCache !== undefined) {
    return isWebkitCache;
  }

  const userAgent = navigator.userAgent.toLowerCase();

  // Check for Safari on macOS
  const isSafari =
    userAgent.includes('safari') && !userAgent.includes('chrome');

  // Check for iOS/iPadOS (all browsers on iOS use WebKit)
  const isIOS =
    /iphone|ipad|ipod/.test(userAgent) ||
    (userAgent.includes('mac') && navigator.maxTouchPoints > 1);

  // Cache and return result
  isWebkitCache = isSafari || isIOS;
  return isWebkitCache;
}
