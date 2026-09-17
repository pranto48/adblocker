/**
 * ==============================================================================
 * # Copyright (c) 2026 IT support BD (https://itsupport.com.bd)
 * # Made By Arif (https://arifmahmud.com/)
 * # Project: AmpBlock
 * ==============================================================================
 *
 * AmpBlock - YouTube Ad Buster & Anti-Detection Bypass
 * Seamlessly neutralizes YouTube video ads, sponsors, banners, and anti-adblock modals.
 */

(function () {
  'use strict';

  if (window.__ampblock_yt_injected) return;
  window.__ampblock_yt_injected = true;

  let isEnabled = true;
  let isWhitelisted = false;
  let ytBlockedAdsCount = 0;
  let wasMutedByAdblock = false;
  let originalRate = 1.0;

  // Cosmetic selectors for YouTube banner & overlay ads
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
    '#player-ads',
    '.ytp-ad-overlay-container',
    '.ytp-ad-message-container',
    '.ytp-ad-action-interstitial'
  ];

  // Inject CSS rules immediately for YouTube banners
  function injectYouTubeCSS() {
    const styleId = 'ampblock-yt-style';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      ${ytAdSelectors.join(',\n      ')} {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      ytd-enforcement-message-view-model,
      tp-yt-paper-dialog:has(ytd-enforcement-message-view-model) {
        display: none !important;
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
          startBuster();
          return;
        }
        isEnabled = response.enabled;
        isWhitelisted = response.isWhitelisted;

        if (isEnabled && !isWhitelisted) {
          injectYouTubeCSS();
          startBuster();
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

  // Core Video Ad Neutralizer
  function handleVideoAds() {
    if (!isEnabled || isWhitelisted) return;

    const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    const video = document.querySelector('video.html5-main-video') || document.querySelector('video');

    if (!player || !video) return;

    const isAdShowing = player.classList.contains('ad-showing') ||
                        player.classList.contains('ad-interrupting') ||
                        Boolean(document.querySelector('.ytp-ad-player-overlay')) ||
                        Boolean(document.querySelector('.video-ads.ytp-ad-module:not(:empty)'));

    if (isAdShowing) {
      // 1. Instantly mute audio so no ad sound leaks
      if (!video.muted) {
        video.muted = true;
        wasMutedByAdblock = true;
      }

      // 2. Accelerate ad to max speed and skip to the end
      try {
        if (video.playbackRate < 16) {
          video.playbackRate = 16.0;
        }
        if (isFinite(video.duration) && video.duration > 0) {
          video.currentTime = video.duration - 0.01;
        }
      } catch (e) {}

      // 3. Programmatically click all possible skip buttons
      const skipButtons = document.querySelectorAll(
        '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button-slot, button.ytp-ad-skip-button-text'
      );
      skipButtons.forEach((btn) => {
        if (btn && typeof btn.click === 'function') {
          btn.click();
        }
      });

      // Close overlay ad cards if present
      const overlayClose = document.querySelector('.ytp-ad-overlay-close-button');
      if (overlayClose) overlayClose.click();

      reportBlock();
    } else {
      // Normal video playing - restore normal audio and playback rate
      if (wasMutedByAdblock) {
        video.muted = false;
        wasMutedByAdblock = false;
      }
      if (video.playbackRate === 16.0) {
        video.playbackRate = 1.0;
      }
    }
  }

  // Anti-Adblock modal detector and neutralizer
  function neutralizeAntiAdblockModals() {
    if (!isEnabled || isWhitelisted) return;

    // 1. YouTube Enforcement Modal
    const enforcement = document.querySelector('ytd-enforcement-message-view-model');
    if (enforcement) {
      const dialog = enforcement.closest('tp-yt-paper-dialog') || enforcement;
      dialog.remove();
      reportBlock();

      // Remove greyed-out backdrop overlay
      document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach((el) => el.remove());

      // Auto-resume video if YouTube paused it
      const video = document.querySelector('video');
      if (video && video.paused) {
        video.play().catch(() => {});
      }
    }

    // 2. Generic warning dialogs containing "Ad blocker"
    const dialogs = document.querySelectorAll('tp-yt-paper-dialog');
    dialogs.forEach((dlg) => {
      const text = (dlg.textContent || '').toLowerCase();
      if (text.includes('ad blocker') || text.includes('terms of service')) {
        dlg.remove();
        document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach((el) => el.remove());
        const video = document.querySelector('video');
        if (video && video.paused) video.play().catch(() => {});
      }
    });
  }

  // Active continuous monitoring
  function startBuster() {
    // Check at fast cadence for snappy skip response
    setInterval(() => {
      handleVideoAds();
      neutralizeAntiAdblockModals();
    }, 120);

    // Also observe DOM tree modifications for instant trigger
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
