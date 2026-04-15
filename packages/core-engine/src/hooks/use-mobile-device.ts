import { useEffect, useState } from 'react';

/**
 * Detects if the user is on an actual mobile or tablet device
 * based on user agent and device capabilities, not screen size.
 */
export function useIsMobileDevice() {
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(() => {
    // Initial check on the client
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }
    return detectMobileDevice();
  });

  useEffect(() => {
    setIsMobileDevice(detectMobileDevice());
  }, []);

  return isMobileDevice;
}

/**
 * Detects mobile/tablet devices using multiple signals:
 * 1. User agent string patterns
 * 2. Touch capability combined with other indicators
 * 3. Platform-specific checks
 */
function detectMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent || navigator.vendor || '';

  // Check for common mobile/tablet user agent patterns
  const mobileRegex =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;

  if (mobileRegex.test(userAgent)) {
    return true;
  }

  // Check for iPad on iOS 13+ (reports as Mac in user agent)
  // iPad with iPadOS 13+ has 'Macintosh' in UA but supports touch
  if (
    /Macintosh/i.test(userAgent) &&
    navigator.maxTouchPoints &&
    navigator.maxTouchPoints > 1
  ) {
    return true;
  }

  // Check platform for mobile indicators
  const platform = navigator.platform || '';
  const mobilePlatforms = /iPhone|iPod|iPad|Android|webOS|BlackBerry/i;
  if (mobilePlatforms.test(platform)) {
    return true;
  }

  // Additional check using userAgentData if available (modern browsers)
  if ('userAgentData' in navigator) {
    const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } })
      .userAgentData;
    if (uaData?.mobile) {
      return true;
    }
  }

  return false;
}
