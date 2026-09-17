/**
 * ==============================================================================
 * # Copyright (c) 2026 IT support BD (https://itsupport.com.bd)
 * # Made By Arif (https://arifmahmud.com/)
 * # Project: AmpBlock
 * ==============================================================================
 *
 * AmpBlock - Universal Content Script
 * Monitors DOM for ad elements, tracks counts, collapses empty ad frames, and syncs with background worker.
 */

(function () {
  'use strict';

  if (window.__ampblock_injected) return;
  window.__ampblock_injected = true;

  const currentHost = window.location.hostname;
  let isEnabled = true;
  let isWhitelisted = false;
  let blockedCount = 0;
  const processedNodes = new WeakSet();

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

  let fullSelector = adSelectors.join(', ');

  // Inject custom user-zapped selectors for this domain
  function loadCustomRules() {
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

  // Query background for site status
  function init() {
    chrome.runtime.sendMessage(
      { action: 'getSiteStatus', domain: currentHost },
      (response) => {
        if (chrome.runtime.lastError || !response) {
          scanAndPurge();
          loadCustomRules();
          startObserver();
          return;
        }

        isEnabled = response.enabled;
        isWhitelisted = response.isWhitelisted;

        if (isEnabled && !isWhitelisted) {
          scanAndPurge();
          loadCustomRules();
          startObserver();
        }
      }
    );
  }

  // Scan document for ad elements and aggressively collapse them
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
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', startObserver, { once: true });
      return;
    }

    const observer = new MutationObserver(() => {
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

      if (isEnabled && !isWhitelisted) {
        scanAndPurge();
        loadCustomRules();
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
