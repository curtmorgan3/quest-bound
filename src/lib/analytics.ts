/**
 * Lightweight analytics for DAU and page views.
 * Uses Plausible when VITE_PLAUSIBLE_DOMAIN is set (no cookies, privacy-friendly).
 * Dashboard: https://plausible.io → your site shows "Unique visitors" per day = DAU.
 */
export function initAnalytics(): void {
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
  if (!domain || typeof document === 'undefined') return;

  const script = document.createElement('script');
  script.defer = true;
  script.setAttribute('data-domain', domain);
  script.src = 'https://plausible.io/js/script.js';
  document.head.appendChild(script);
}
