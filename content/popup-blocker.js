/**
 * ==============================================================================
 * # Copyright (c) 2026 IT support BD (https://itsupport.com.bd)
 * # Made By Arif (https://arifmahmud.com/)
 * # Project: AmpBlock Pro
 * ==============================================================================
 *
 * AmpBlock - Smart Popunder & Click-Hijack Defeater (Runs in MAIN World)
 * Neutralizes piracy/streaming popunder traps and ad network redirects
 * while fully preserving Google/Facebook OAuth, SSO popups, and trusted site navigation.
 */

(function () {
  'use strict';

  if (window.__ampblock_main_world_guard) return;
  window.__ampblock_main_world_guard = true;

  const currentHost = window.location.hostname.toLowerCase();

  // 1. Whitelist of trusted SSO, OAuth, Payment, and Cloud Identity Providers
  const TRUSTED_AUTH_HOSTS = [
    'accounts.google.com',
    'apis.google.com',
    'google.com',
    'facebook.com',
    'm.facebook.com',
    'connect.facebook.net',
    'appleid.apple.com',
    'login.microsoftonline.com',
    'login.live.com',
    'github.com',
    'twitter.com',
    'x.com',
    'linkedin.com',
    'auth0.com',
    'firebaseapp.com',
    'identitytoolkit.googleapis.com',
    'supabase.co',
    'discord.com',
    'slack.com',
    'paypal.com',
    'stripe.com',
    'checkout.stripe.com',
    'amazon.com'
  ];

  // 2. Specific known malicious pop-up / pop-under ad network signatures
  const adNetworkKeywords = [
    'popads',
    'popcash',
    'propellerads',
    'exoclick',
    'trafficjunky',
    'clickadu',
    'hilltopads',
    'monetag',
    'adsterra',
    'adtrue',
    'richads',
    'yllix',
    'adcash',
    'revenuehits',
    'bidvertiser',
    'plugrush',
    'clicksor',
    'vrtzads',
    'adnuntius',
    'tsyndicate',
    'traffichive',
    'wigetmedia'
  ];

  // Helper: Check if site is whitelisted or protection is globally disabled
  function isSiteWhitelistedOrDisabled() {
    if (document.documentElement) {
      if (document.documentElement.dataset.ampblockWhitelisted === 'true' ||
          document.documentElement.dataset.ampblockDisabled === 'true') {
        return true;
      }
    }
    try {
      if (sessionStorage.getItem('__ampblock_whitelisted') === 'true' ||
          sessionStorage.getItem('__ampblock_disabled') === 'true') {
        return true;
      }
    } catch (e) {}
    return false;
  }

  // Helper: Determine if URL is a legitimate OAuth or SSO window
  function isTrustedAuthOrTarget(url) {
    if (!url || typeof url !== 'string') return false;
    const lower = url.trim().toLowerCase();

    // Standard OAuth popup initialization patterns (window.open('', 'auth') or 'about:blank')
    if (lower === '' || lower === 'about:blank' || lower.startsWith('javascript:')) {
      return true;
    }

    try {
      if (lower.startsWith('http://') || lower.startsWith('https://')) {
        const destHost = new URL(lower).hostname.toLowerCase();
        if (TRUSTED_AUTH_HOSTS.some(auth => destHost === auth || destHost.endsWith('.' + auth))) {
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  function isAdOrSuspiciousUrl(url) {
    if (isSiteWhitelistedOrDisabled()) return false;
    if (!url || typeof url !== 'string') return false; // Allow empty initializers for OAuth

    const lower = url.trim().toLowerCase();

    // Never block trusted OAuth/SSO or standard popup initialization
    if (isTrustedAuthOrTarget(lower)) return false;

    // Check against verified ad network keywords
    if (adNetworkKeywords.some(kw => lower.includes(kw))) {
      return true;
    }

    return false;
  }

  // Safe dummy window proxy to prevent site scripts from crashing when an ad popup IS blocked
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
      if (isSiteWhitelistedOrDisabled()) {
        return originalOpen.apply(this, arguments);
      }

      const urlStr = String(url || '');

      // Check if this window.open call is an ad popunder
      if (isAdOrSuspiciousUrl(urlStr)) {
        console.warn('[AmpBlock] Blocked ad popunder window.open:', urlStr);
        return createSafeWindowProxy();
      }

      return originalOpen.apply(this, arguments);
    };
  } catch (err) {}

  // 2. Hook HTMLAnchorElement.prototype.click to prevent programmatic ad tab spawning
  try {
    const originalAnchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (isSiteWhitelistedOrDisabled()) {
        return originalAnchorClick.apply(this, arguments);
      }

      const href = this.href || '';
      const target = this.target || '';

      // If opening in new tab and pointing to confirmed ad network
      if (target === '_blank' && isAdOrSuspiciousUrl(href)) {
        console.warn('[AmpBlock] Blocked programmatic ad click:', href);
        return false;
      }

      return originalAnchorClick.apply(this, arguments);
    };
  } catch (err) {}

  // 3. Pre-empt ad link click-hijacking in capture phase
  document.addEventListener('click', (e) => {
    if (isSiteWhitelistedOrDisabled()) return;

    const target = e.target;
    if (!target) return;

    const anchor = target.tagName === 'A' ? target : target.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href') || anchor.href || '';
      if (isAdOrSuspiciousUrl(href)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.warn('[AmpBlock] Blocked ad link click:', href);
      }
    }
  }, true);

  // 4. Neutralize transparent click-traps without breaking Google One Tap, dialogs, or modals
  function removeClickTraps() {
    if (isSiteWhitelistedOrDisabled()) return;

    try {
      const elements = document.querySelectorAll('div, a, span, section');
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (!el || el.id?.startsWith('ampblock')) continue;

        // Never touch legitimate Google One Tap, Facebook SDK, or standard modal containers
        const idLower = (el.id || '').toLowerCase();
        const classLower = (el.className || '').toString().toLowerCase();
        if (
          idLower.includes('google') ||
          idLower.includes('credential') ||
          idLower.includes('fb-root') ||
          classLower.includes('fb_dialog') ||
          classLower.includes('modal') ||
          classLower.includes('dialog') ||
          el.getAttribute('role') === 'dialog' ||
          el.tagName === 'DIALOG'
        ) {
          continue;
        }

        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' || style.position === 'absolute') {
          const zIndex = parseInt(style.zIndex, 10);
          if (zIndex >= 1000 || zIndex >= 2147483640) {
            const rect = el.getBoundingClientRect();
            if (rect.width >= winW * 0.8 && rect.height >= winH * 0.8) {
              const opacity = parseFloat(style.opacity);
              const isTransparent = opacity < 0.05 || style.visibility === 'hidden' || style.backgroundColor.includes('rgba(0, 0, 0, 0)');
              // Ensure it has no visible child elements
              if (isTransparent && el.innerText.trim() === '' && el.querySelectorAll('input, button, a').length === 0) {
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
      setInterval(removeClickTraps, 1500);
    });
  } else {
    removeClickTraps();
    setInterval(removeClickTraps, 1500);
  }
})();
