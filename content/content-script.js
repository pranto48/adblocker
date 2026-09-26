/**
 * ==============================================================================
 * # Copyright (c) 2026 IT support BD (https://itsupport.com.bd)
 * # Made By Arif (https://arifmahmud.com/)
 * # Project: AmpBlock Pro
 * ==============================================================================
 *
 * AmpBlock - Universal Content Script
 * Dynamically injects cosmetic filters only when active, synchronizes whitelist
 * state with the MAIN world, collapses ad frames, and instantly unhides elements
 * when ads are allowed on trusted sites.
 */

(function () {
  'use strict';

  if (window.__ampblock_injected) return;
  window.__ampblock_injected = true;

  const currentHost = window.location.hostname.toLowerCase();
  let isEnabled = true;
  let isWhitelisted = false;
  let blockedCount = 0;
  const processedNodes = new WeakSet();
  let observer = null;

  const adSelectors = [
    'ins.adsbygoogle',
    '[id^="google_ads_"]',
    '[id^="div-gpt-ad-"]',
    '[class^="google-ad-"]',
    '[id*="_ad_container"]',
    '[class*="_ad_container"]',
    '[id*="ad-wrapper"]',
    '[class*="ad-wrapper"]',
    '[id*="ad-banner"]',
    '[class*="ad-banner"]',
    '[id*="banner-ad"]',
    '[class*="banner-ad"]',
    '[data-ad-unit]',
    '[data-ad-slot]',
    '[data-ad-name]',
    '[data-google-query-id]',
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="googlesyndication.com"]',
    'iframe[src*="adnxs.com"]',
    'iframe[src*="criteo.com"]',
    'iframe[src*="amazon-adsystem.com"]',
    'iframe[src*="taboola.com"]',
    'iframe[src*="outbrain.com"]',
    'iframe[src*="popads.net"]',
    'iframe[src*="popcash.net"]',
    'iframe[src*="propellerads.com"]',
    'iframe[src*="exoclick.com"]',
    '.advertisement',
    '.ad-container',
    '.ad-placement',
    '.ad-slot',
    '.ad-box',
    '.ad-unit',
    '.ad-placeholder',
    '.ad-space',
    '.sponsored-post',
    '.sponsored-content',
    '[aria-label="advertisement" i]',
    '[aria-label="sponsored" i]',
    '[aria-label="ads" i]',
    '.trc_related_container',
    '.OUTBRAIN',
    'div[data-ad]',
    '.floating-ad',
    '.floating-banner',
    '.sticky-ad-bottom',
    '.ad-bottom-bar',
    '.ad-sticky'
  ];

  const fullSelector = adSelectors.join(', ');

  // Synchronize state with DOM dataset and sessionStorage for MAIN world scripts
  function syncStatusToDOM() {
    if (!document.documentElement) return;

    if (!isEnabled) {
      document.documentElement.dataset.ampblockDisabled = 'true';
      delete document.documentElement.dataset.ampblockActive;
      delete document.documentElement.dataset.ampblockWhitelisted;
    } else if (isWhitelisted) {
      document.documentElement.dataset.ampblockWhitelisted = 'true';
      delete document.documentElement.dataset.ampblockActive;
      delete document.documentElement.dataset.ampblockDisabled;
    } else {
      document.documentElement.dataset.ampblockActive = 'true';
      delete document.documentElement.dataset.ampblockWhitelisted;
      delete document.documentElement.dataset.ampblockDisabled;
    }

    try {
      sessionStorage.setItem('__ampblock_whitelisted', String(isWhitelisted));
      sessionStorage.setItem('__ampblock_disabled', String(!isEnabled));
    } catch (e) {}

    window.postMessage({
      type: '__AMPBLOCK_STATUS_SYNC__',
      isEnabled,
      isWhitelisted
    }, '*');
  }

  // Dynamically inject cosmetic filter CSS only when allowed
  function injectCosmeticCSS() {
    if (!isEnabled || isWhitelisted) return;
    const styleId = 'ampblock-cosmetic-filter-link';
    if (document.getElementById(styleId)) return;

    const link = document.createElement('link');
    link.id = styleId;
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('content/cosmetic-filter.css');
    (document.head || document.documentElement).appendChild(link);
  }

  // Remove cosmetic filter CSS when ads are allowed on this site
  function removeCosmeticCSS() {
    const link = document.getElementById('ampblock-cosmetic-filter-link');
    if (link) link.remove();
    const customStyle = document.getElementById('ampblock-custom-zapped-style');
    if (customStyle) customStyle.remove();
  }

  // Restore elements that were previously collapsed inline
  function restoreHiddenElements() {
    try {
      const elements = document.querySelectorAll(fullSelector);
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        el.style.removeProperty('display');
        el.style.removeProperty('visibility');
        el.style.removeProperty('height');
        el.style.removeProperty('min-height');
        el.style.removeProperty('margin');
        el.style.removeProperty('padding');
      }
    } catch (e) {}
  }

  // Inject custom user-zapped selectors for this domain
  function loadCustomRules() {
    if (!isEnabled || isWhitelisted) return;

    chrome.storage.local.get(['customBlockedSelectors'], (data) => {
      const allRules = data.customBlockedSelectors || {};
      const domainRules = allRules[currentHost] || [];

      if (domainRules.length > 0) {
        let styleEl = document.getElementById('ampblock-custom-zapped-style');
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'ampblock-custom-zapped-style';
          (document.head || document.documentElement).appendChild(styleEl);
        }
        styleEl.textContent = `
          ${domainRules.join(',\n          ')} {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            pointer-events: none !important;
          }
        `;
      }
    });
  }

  // Query background for site status and configure DOM
  function init() {
    chrome.storage.local.get(['isEnabled', 'whitelistedDomains'], (data) => {
      const enabled = typeof data.isEnabled === 'boolean' ? data.isEnabled : true;
      const whitelistedDomains = data.whitelistedDomains || [];
      const whitelisted = whitelistedDomains.includes(currentHost) ||
                          whitelistedDomains.some(d => currentHost.endsWith('.' + d));

      isEnabled = enabled;
      isWhitelisted = whitelisted;

      syncStatusToDOM();

      if (isEnabled && !isWhitelisted) {
        injectCosmeticCSS();
        loadCustomRules();
        scanAndPurge();
        startObserver();
      } else {
        removeCosmeticCSS();
        restoreHiddenElements();
      }
    });
  }

  // Scan document for ad elements and collapse them
  function scanAndPurge() {
    if (!isEnabled || isWhitelisted) return;

    try {
      const elements = document.querySelectorAll(fullSelector);
      let newlyBlocked = 0;

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (!processedNodes.has(el)) {
          processedNodes.add(el);
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('height', '0', 'important');
          el.style.setProperty('min-height', '0', 'important');
          el.style.setProperty('margin', '0', 'important');
          el.style.setProperty('padding', '0', 'important');
          newlyBlocked++;
        }
      }

      if (newlyBlocked > 0) {
        blockedCount += newlyBlocked;
        notifyBackground(newlyBlocked);
      }
    } catch (e) {}
  }

  // Send stats to service worker
  function notifyBackground(increment) {
    chrome.runtime.sendMessage({
      action: 'reportBlockedAds',
      domain: currentHost,
      increment: increment,
      totalOnTab: blockedCount
    }).catch(() => {});
  }

  // Observer for dynamic infinite scroll / AJAX loaded ads
  let debounceTimeout = null;
  function startObserver() {
    if (observer) observer.disconnect();
    if (!document.body && !document.documentElement) {
      document.addEventListener('DOMContentLoaded', startObserver, { once: true });
      return;
    }

    observer = new MutationObserver(() => {
      if (!isEnabled || isWhitelisted) return;

      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        scanAndPurge();
      }, 100);
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
  }

  // Listen for messages from popup & background worker
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'statusChanged') {
      isEnabled = msg.enabled;
      isWhitelisted = msg.isWhitelisted;
      syncStatusToDOM();

      if (isEnabled && !isWhitelisted) {
        injectCosmeticCSS();
        loadCustomRules();
        scanAndPurge();
        startObserver();
      } else {
        removeCosmeticCSS();
        restoreHiddenElements();
        if (observer) observer.disconnect();
      }
      sendResponse({ success: true, count: blockedCount });
    } else if (msg.action === 'getPageStats') {
      sendResponse({ count: blockedCount, domain: currentHost });
    } else if (msg.action === 'reloadCustomRules') {
      loadCustomRules();
      sendResponse({ success: true });
    } else if (msg.action === 'triggerZapper') {
      if (typeof window.__ampblock_exit_zapper === 'function') {
        window.__ampblock_exit_zapper();
      }
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('content/element-zapper.js');
      (document.head || document.documentElement).appendChild(script);
      script.remove();
      sendResponse({ success: true });
    }
    return true;
  });

  // Bridge listener for Security Sentinel events from MAIN world
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.type !== '__AMPBLOCK_SENTINEL_EVENT__') return;
    const { action, payload } = event.data;
    try {
      chrome.runtime.sendMessage({ action, ...payload }).catch(() => {});
    } catch (e) {}
  });

  // Ensure DOM status is set immediately
  syncStatusToDOM();
  init();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
