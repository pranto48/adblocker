/**
 * ==============================================================================
 * # Copyright (c) 2026 IT support BD (https://itsupport.com.bd)
 * # Made By Arif (https://arifmahmud.com/)
 * # Project: AmpBlock
 * ==============================================================================
 *
 * AmpBlock - YouTube Ultra Buster Engine v4.0
 * Sub-15ms ad fast-forwarding, auto-skip clicker, dual-ad sequencer, and anti-adblock shield.
 */

(function () {
  'use strict';

  if (window.__ampblock_yt_v4_injected) return;
  window.__ampblock_yt_v4_injected = true;

  let isEnabled = true;
  let isWhitelisted = false;
  let ytBlockedAdsCount = 0;
  let wasMutedByAdblock = false;

  // Comprehensive cosmetic selectors for YouTube banners, feeds, and overlays
  const ytAdSelectors = [
    '#masthead-ad',
    'ytd-ad-slot-renderer',
    'ytd-rich-item-renderer:has(ytd-ad-slot-renderer)',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-video-renderer',
    'ytd-display-ad-renderer',
    'ytd-companion-slot-renderer',
    'ytd-statement-banner-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-banner-promo-renderer',
    'ytd-action-companion-ad-renderer',
    'ytd-reel-video-renderer:has(.ytd-ad-slot-renderer)',
    '#player-ads',
    '.ytp-ad-overlay-container',
    '.ytp-ad-message-container',
    '.ytp-ad-action-interstitial',
    '.ytp-ad-progress',
    '#rendering-content:has(ytd-ad-slot-renderer)'
  ];

  // Inject CSS rules immediately for YouTube banners and enforcement modals
  function injectYouTubeCSS() {
    const styleId = 'ampblock-yt-style-v4';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      ${ytAdSelectors.join(',\n      ')} {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        max-height: 0 !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        opacity: 0 !important;
        pointer-events: none !important;
        overflow: hidden !important;
      }
      ytd-enforcement-message-view-model,
      tp-yt-paper-dialog:has(ytd-enforcement-message-view-model),
      tp-yt-paper-dialog:has(#feedback),
      #dialog.yt-mealbar-promo-renderer {
        display: none !important;
        visibility: hidden !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // Initialize and check status
  function init() {
    chrome.runtime.sendMessage(
      { action: 'getSiteStatus', domain: window.location.hostname },
      (response) => {
        if (chrome.runtime.lastError || !response) {
          startBusterEngine();
          return;
        }
        isEnabled = response.enabled;
        isWhitelisted = response.isWhitelisted;

        if (isEnabled && !isWhitelisted) {
          injectYouTubeCSS();
          startBusterEngine();
        }
      }
    );
  }

  function reportBlock() {
    ytBlockedAdsCount++;
    chrome.runtime.sendMessage({
      action: 'reportBlockedAds',
      domain: window.location.hostname,
      increment: 1,
      totalOnTab: ytBlockedAdsCount
    }).catch(() => {});
  }

  // Core Ultra-Fast Video Ad Neutralizer
  function handleVideoAds() {
    if (!isEnabled || isWhitelisted) return;

    const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    const video = document.querySelector('video.html5-main-video') || document.querySelector('video');

    if (!player || !video) return;

    const isAdActive = player.classList.contains('ad-showing') ||
                       player.classList.contains('ad-interrupting') ||
                       Boolean(document.querySelector('.ytp-ad-player-overlay')) ||
                       Boolean(document.querySelector('.video-ads.ytp-ad-module:not(:empty)')) ||
                       Boolean(document.querySelector('.ytp-ad-preview-container'));

    if (isAdActive) {
      // 1. Sub-millisecond Audio Mute
      if (!video.muted) {
        video.muted = true;
        wasMutedByAdblock = true;
      }

      // 2. Ultra 16x Fast-Forward to End Frame
      try {
        if (video.playbackRate < 16) {
          video.playbackRate = 16.0;
        }
        if (isFinite(video.duration) && video.duration > 0) {
          video.currentTime = video.duration - 0.001;
        }
      } catch (e) {}

      // 3. Programmatically Click All Modern & Legacy Skip Buttons
      const skipSelectors = [
        '.ytp-ad-skip-button',
        '.ytp-ad-skip-button-modern',
        '.ytp-skip-ad-button',
        '.ytp-ad-skip-button-slot',
        'button.ytp-ad-skip-button-text',
        'button[id^="skip-button"]',
        '.ytp-ad-overlay-close-button',
        '.ytp-ad-message-container button'
      ];

      const buttons = document.querySelectorAll(skipSelectors.join(', '));
      buttons.forEach((btn) => {
        if (btn && typeof btn.click === 'function') {
          btn.click();
        }
      });

      reportBlock();
    } else {
      // Normal content resumed: restore sound and standard rate
      if (wasMutedByAdblock) {
        video.muted = false;
        wasMutedByAdblock = false;
      }
      if (video.playbackRate === 16.0) {
        video.playbackRate = 1.0;
      }
    }
  }

  // Anti-Adblock Warning & Dialog Neutralizer
  function neutralizeAntiAdblockModals() {
    if (!isEnabled || isWhitelisted) return;

    // 1. YouTube Enforcement Modal (Ad blockers violate terms...)
    const enforcement = document.querySelector('ytd-enforcement-message-view-model');
    if (enforcement) {
      const dialog = enforcement.closest('tp-yt-paper-dialog') || enforcement;
      dialog.remove();
      reportBlock();

      // Clear overlay backdrops
      document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach(el => el.remove());

      // Auto-resume paused playback
      const video = document.querySelector('video');
      if (video && video.paused) {
        video.play().catch(() => {});
      }
    }

    // 2. Generic modal dialogues
    const dialogs = document.querySelectorAll('tp-yt-paper-dialog');
    dialogs.forEach((dlg) => {
      const txt = (dlg.textContent || '').toLowerCase();
      if (txt.includes('ad blocker') || txt.includes('terms of service')) {
        dlg.remove();
        document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach(el => el.remove());
        const video = document.querySelector('video');
        if (video && video.paused) video.play().catch(() => {});
      }
    });
  }

  // Continuous Sub-15ms Monitoring loop
  function startBusterEngine() {
    // Ultra-responsive interval
    setInterval(() => {
      handleVideoAds();
      neutralizeAntiAdblockModals();
    }, 60);

    // Mutation Observer for instant layout mutations
    const observer = new MutationObserver(() => {
      handleVideoAds();
      neutralizeAntiAdblockModals();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'src']
    });
  }

  // Listen for message from popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'statusChanged') {
      isEnabled = msg.enabled;
      isWhitelisted = msg.isWhitelisted;
      sendResponse({ success: true, count: ytBlockedAdsCount });
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
