/**
 * ==============================================================================
 * # Copyright (c) 2026 IT support BD (https://itsupport.com.bd)
 * # Made By Arif (https://arifmahmud.com/)
 * # Project: AmpBlock
 * ==============================================================================
 *
 * AmpBlock - Ultra Popunder & Click-Hijack Defeater (Runs in MAIN World)
 * Neutralizes torrent/piracy site popup traps, artificial anchor clicks, and window.open hijackers.
 */

(function () {
  'use strict';

  if (window.__ampblock_main_world_guard) return;
  window.__ampblock_main_world_guard = true;

  const currentHost = window.location.hostname.toLowerCase();
  const baseDomain = currentHost.split('.').slice(-2).join('.');

  const adKeywords = [
    'popads',
    'popcash',
    'propeller',
    'exoclick',
    'trafficjunky',
    'clickadu',
    'hilltopads',
    'monetag',
    'adsterra',
    'adtrue',
    'richads',
    'yllix',
    'betting',
    'casino',
    'redirect',
    'rotator',
    'track',
    'delivery',
    'syndicate',
    'adx',
    'adv'
  ];

  function isAdOrSuspiciousUrl(url) {
    if (!url || typeof url !== 'string') return true; // Block empty or non-string popup attempts
    const lower = url.toLowerCase();

    // Check against keywords
    if (adKeywords.some(kw => lower.includes(kw))) return true;

    // Check domain mismatch
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const destHost = new URL(url).hostname.toLowerCase();
        const destBase = destHost.split('.').slice(-2).join('.');
        if (destBase && baseDomain && destBase !== baseDomain) {
          // If destination domain does not match current domain on ad-heavy site, treat as ad popup
          return true;
        }
      }
    } catch (e) {
      return true;
    }
    return false;
  }

  // Safe dummy window proxy to prevent site scripts from crashing
  function createSafeWindowProxy() {
    return {
      closed: true,
      close: function () {},
      focus: function () {},
      blur: function () {},
      postMessage: function () {},
      document: {
        write: function () {},
        writeln: function () {},
        open: function () {},
        close: function () {}
      },
      location: {
        replace: function () {},
        assign: function () {},
        href: ''
      }
    };
  }

  // 1. Hook window.open in MAIN world
  try {
    const originalOpen = window.open;
    window.open = function (url, target, features) {
      const urlStr = String(url || '');

      // Check if this window.open call is an ad or off-domain popunder
      if (isAdOrSuspiciousUrl(urlStr)) {
        console.warn('[AmpBlock] Blocked popup/popunder window.open:', urlStr || '(empty)');
        return createSafeWindowProxy();
      }

      return originalOpen.apply(this, arguments);
    };
  } catch (err) {}

  // 2. Hook HTMLAnchorElement.prototype.click to prevent programmatic ad tab spawning
  try {
    const originalAnchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      const href = this.href || '';
      const target = this.target || '';

      // If opening in new tab and pointing to suspicious/different domain
      if (target === '_blank' && isAdOrSuspiciousUrl(href)) {
        console.warn('[AmpBlock] Blocked programmatic anchor click:', href);
        return false;
      }

      return originalAnchorClick.apply(this, arguments);
    };
  } catch (err) {}

  // 3. Pre-empt link click-hijacking in capture phase
  document.addEventListener('click', (e) => {
    // If the click triggered an invisible full-page element
    const target = e.target;
    if (!target) return;

    if (target.tagName === 'A') {
      const href = target.getAttribute('href') || '';
      if (isAdOrSuspiciousUrl(href) && href.startsWith('http')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.warn('[AmpBlock] Blocked ad link click:', href);
      }
    }
  }, true);

  // 4. Neutralize transparent click-traps
  function removeClickTraps() {
    try {
      const elements = document.querySelectorAll('div, a, span, section');
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (!el || el.id?.startsWith('ampblock')) continue;

        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' || style.position === 'absolute') {
          const zIndex = parseInt(style.zIndex, 10);
          if (zIndex >= 1000 || zIndex >= 2147483640) {
            const rect = el.getBoundingClientRect();
            if (rect.width >= winW * 0.6 && rect.height >= winH * 0.6) {
              const opacity = parseFloat(style.opacity);
              const isTransparent = opacity < 0.1 || style.visibility === 'hidden' || style.backgroundColor.includes('rgba(0, 0, 0, 0)');
              if (isTransparent) {
                el.style.setProperty('display', 'none', 'important');
                el.style.setProperty('pointer-events', 'none', 'important');
                if (el.parentNode) el.parentNode.removeChild(el);
                console.warn('[AmpBlock] Neutralized full-page click-trap overlay');
              }
            }
          }
        }
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      removeClickTraps();
      setInterval(removeClickTraps, 800);
    });
  } else {
    removeClickTraps();
    setInterval(removeClickTraps, 800);
  }
})();
