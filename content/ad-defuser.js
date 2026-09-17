/**
 * ==============================================================================
 * # Copyright (c) 2026 IT support BD (https://itsupport.com.bd)
 * # Made By Arif (https://arifmahmud.com/)
 * # Project: AmpBlock
 * ==============================================================================
 *
 * AmpBlock - Anti-Adblock Defuser & Scriptlet Mock Engine
 * Injects safe mock ad globals at document_start to deceive anti-adblock detection scripts.
 */

(function () {
  'use strict';

  if (window.__ampblock_defuser_injected) return;
  window.__ampblock_defuser_injected = true;

  // Code to run inside page's main context
  const defuserPayload = `
    try {
      window.canRunAds = true;
      window.isAdBlockActive = false;
      window.adBlockDetected = false;
      window.google_ad_client = 'ca-pub-9999999999999999';
      window.google_ad_slot = '9999999999';

      // Mock adsbygoogle array
      if (!window.adsbygoogle) {
        window.adsbygoogle = [];
      }
      window.adsbygoogle.loaded = true;
      const origPush = window.adsbygoogle.push;
      window.adsbygoogle.push = function(arg) {
        if (typeof origPush === 'function') {
          try { origPush.call(this, arg); } catch(e) {}
        }
        return 1;
      };

      // Mock FuckAdBlock / BlockAdBlock
      window.fuckAdBlock = {
        check: function() { return false; },
        on: function(isAdblock, callback) {
          if (!isAdblock && typeof callback === 'function') callback();
          return this;
        },
        onDetected: function() { return this; },
        onNotDetected: function(callback) {
          if (typeof callback === 'function') callback();
          return this;
        }
      };
      window.blockAdBlock = window.fuckAdBlock;
    } catch(e) {}
  `;

  // Inject into DOM
  const script = document.createElement('script');
  script.textContent = defuserPayload;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
})();
