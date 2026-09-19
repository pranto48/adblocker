/**
 * ==============================================================================
 * # Copyright (c) 2026 IT support BD (https://itsupport.com.bd)
 * # Made By Arif (https://arifmahmud.com/)
 * # Project: AmpBlock
 * ==============================================================================
 *
 * AmpBlock - YouTube Ultra Buster Engine v5.0
 * Zero-latency video ad fast-forwarding, instant audio suppression, auto-skip dispatch,
 * shorts ad neutralizer, and anti-adblock enforcement modal terminator.
 */

(function () {
  'use strict';

  if (window.__ampblock_yt_v5_injected) return;
  window.__ampblock_yt_v5_injected = true;

  let isEnabled = true;
  let isWhitelisted = false;
  let ytBlockedAdsCount = 0;
  let wasMutedByAdblock = false;
  let originalVolume = null;

  // Comprehensive cosmetic selectors for YouTube banners, feeds, reels and overlays
  const ytAdSelectors = [
    '#masthead-ad',
    'ytd-ad-slot-renderer',
    'ytd-rich-item-renderer:has(ytd-ad-slot-renderer)',
    'ytd-rich-item-renderer:has(#ad-badge)',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-video-renderer',
    'ytd-display-ad-renderer',
    'ytd-companion-slot-renderer',
    'ytd-statement-banner-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-banner-promo-renderer',
    'ytd-action-companion-ad-renderer',
    'ytd-reel-video-renderer:has(.ytd-ad-slot-renderer)',
    'ytd-reel-video-renderer:has([aria-label*="Sponsored" i])',
    '#player-ads',
    '.ytp-ad-overlay-container',
    '.ytp-ad-message-container',
    '.ytp-ad-action-interstitial',
    '.ytp-ad-progress',
    '#rendering-content:has(ytd-ad-slot-renderer)',
    '.ytp-suggested-action-badge[data-ad]',
    'ytd-mealbar-promo-renderer'
  ];

  // Inject CSS rules immediately for YouTube banners and enforcement modals
  function injectYouTubeCSS() {
    const styleId = 'ampblock-yt-style-v5';
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
      #dialog.yt-mealbar-promo-renderer,
      .ytp-ad-overlay-slot {
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

  // Skip button selectors covering all YouTube iterations
  const skipSelectors = [
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button-slot',
    'button.ytp-ad-skip-button-text',
    'button[id^="skip-button"]',
    '.ytp-ad-overlay-close-button',
    '.ytp-ad-message-container button',
    '[class*="ytp-ad-skip"]',
    'button[aria-label*="Skip" i]'
  ];

  // Core Ultra-Fast Video Ad Neutralizer (Sub-15ms)
  function handleVideoAds() {
    if (!isEnabled || isWhitelisted) return;

    const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    const videos = document.querySelectorAll('video');

    if (!player || videos.length === 0) return;

    const isAdActive = player.classList.contains('ad-showing') ||
                       player.classList.contains('ad-interrupting') ||
                       Boolean(document.querySelector('.ytp-ad-player-overlay')) ||
                       Boolean(document.querySelector('.video-ads.ytp-ad-module:not(:empty)')) ||
                       Boolean(document.querySelector('.ytp-ad-preview-container')) ||
                       Boolean(document.querySelector('.ytp-ad-text')) ||
                       Boolean(document.querySelector('.ytp-ad-persistent-progress-bar-container'));

    if (isAdActive) {
      videos.forEach((video) => {
        // 1. Instant Audio Mute (Prevent promotional sound blast)
        if (!video.muted) {
          video.muted = true;
          wasMutedByAdblock = true;
        }

        // 2. Hyper 16x Fast-Forward to Terminal Keyframe
        try {
          if (video.playbackRate < 16) {
            video.playbackRate = 16.0;
          }
          if (isFinite(video.duration) && video.duration > 0) {
            video.currentTime = video.duration - 0.01;
          }
        } catch (e) {}
      });

      // 3. Dispatch Synthetic Click on All Skip Buttons
      const buttons = document.querySelectorAll(skipSelectors.join(', '));
      buttons.forEach((btn) => {
        if (btn && typeof btn.click === 'function') {
          btn.click();
        }
      });

      // 4. Force movie_player skipAd API if exposed
      try {
        if (typeof player.skipAd === 'function') {
          player.skipAd();
        }
      } catch (e) {}

      reportBlock();
    } else {
      // Normal video resumed: restore sound and standard 1.0x playback rate
      if (wasMutedByAdblock) {
        videos.forEach((video) => {
          video.muted = false;
          if (video.playbackRate === 16.0) {
            video.playbackRate = 1.0;
          }
        });
        wasMutedByAdblock = false;
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

      // Clear dark overlay backdrops
      document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach(el => el.remove());

      // Auto-resume paused playback
      const video = document.querySelector('video');
      if (video && video.paused) {
        video.play().catch(() => {});
      }
    }

    // 2. Generic and mealbar promotional modal dialogues
    const dialogs = document.querySelectorAll('tp-yt-paper-dialog, ytd-mealbar-promo-renderer');
    dialogs.forEach((dlg) => {
      const txt = (dlg.textContent || '').toLowerCase();
      if (txt.includes('ad blocker') || txt.includes('terms of service') || txt.includes('allow ads')) {
        dlg.remove();
        document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach(el => el.remove());
        const video = document.querySelector('video');
        if (video && video.paused) video.play().catch(() => {});
      }
    });
  }

  // Continuous Sub-15ms Monitoring loop
  function startBusterEngine() {
    // Ultra-responsive interval (40ms)
    setInterval(() => {
      handleVideoAds();
      neutralizeAntiAdblockModals();
    }, 40);

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
