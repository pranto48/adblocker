/**
 * ==============================================================================
 * # Copyright (c) 2026 IT support BD (https://itsupport.com.bd)
 * # Made By Arif (https://arifmahmud.com/)
 * # Project: AmpBlock Pro - DevOps Zero-Trust Security Sentinel
 * ==============================================================================
 *
 * Real-time Behavioral Threat Detection & Autonomous Quarantine Engine.
 * Monitored Vectors:
 *   1. Cryptominer WebWorkers & Stratum WebSocket traps
 *   2. History Navigation Lockout & Back-Button Flooding
 *   3. Malicious Clipboard Auto-Hijack (PowerShell / Fake Robot Verification)
 *   4. Invisible Viewport Clickjacking & Overlay Traps
 *   5. Denial-of-Navigation Loops (Alert / Prompt Storms)
 *   6. Tech Support Scam & Fake System Alert Hijacking
 */

(function () {
  'use strict';

  if (window.__ampblock_sentinel_initialized) return;
  window.__ampblock_sentinel_initialized = true;

  const currentHost = window.location.hostname.toLowerCase();
  const currentUrl = window.location.href;

  // Check if current site is exempted / temporarily bypassed in this session
  const BYPASS_KEY = '__ampblock_bypass_' + currentHost;
  try {
    if (sessionStorage.getItem(BYPASS_KEY) === 'true') {
      console.info('[AmpBlock Sentinel] Site bypassed for this session by user override:', currentHost);
      return;
    }
  } catch (e) {}

  // DevOps Telemetry State
  const telemetry = {
    domain: currentHost,
    url: currentUrl,
    startTime: Date.now(),
    threatScore: 0,
    isQuarantined: false,
    violations: [],
    workerCount: 0,
    historyCallCount: 0,
    overlayTrapsNeutralized: 0,
    alertSpamCount: 0
  };

  const THREAT_THRESHOLD = 50; // Quarantines site when score hits 50+

  // Record a violation & calculate threat score
  function recordViolation(type, severity, points, message, technicalDetails = {}) {
    const violation = {
      id: 'v_' + Math.random().toString(36).substr(2, 9),
      type,
      severity, // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
      points,
      message,
      technicalDetails,
      timestamp: new Date().toISOString()
    };

    telemetry.violations.push(violation);
    telemetry.threatScore = Math.min(100, telemetry.threatScore + points);

    console.warn(`[AmpBlock Sentinel Alert] [${severity}] +${points} pts -> Total: ${telemetry.threatScore}/100: ${message}`, technicalDetails);

    // Notify background worker or content script bridge
    dispatchThreatReport('reportThreatTelemetry', {
      domain: currentHost,
      url: currentUrl,
      threatScore: telemetry.threatScore,
      violation
    });

    // Check if score warrants full quarantine lockdown
    if (telemetry.threatScore >= THREAT_THRESHOLD && !telemetry.isQuarantined) {
      triggerQuarantineLockdown('Malicious Behavioral Threat Threshold Exceeded (' + telemetry.threatScore + '/100)');
    }
  }

  function dispatchThreatReport(action, payload) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action, ...payload }).catch(() => {});
      }
    } catch (e) {}
    try {
      window.postMessage({ type: '__AMPBLOCK_SENTINEL_EVENT__', action, payload }, '*');
    } catch (e) {}
  }

  // ============================================================================
  // VECTOR 1: Cryptomining & High-CPU Resource Hijacking
  // ============================================================================
  const miningKeywords = [
    'coinhive', 'cryptoloot', 'monerominer', 'webminepool', 'coin-have',
    'xmrig', 'hashvault', 'minergate', 'deepminer', 'authedmine',
    'crypto-loot', 'jsecoin', 'minexmr', 'nanopool', 'supportxmr'
  ];

  const stratumPorts = [3333, 4444, 5555, 7777, 8888, 9999, 14444];

  // Intercept WebSockets for Stratum mining protocol
  const OriginalWebSocket = window.WebSocket;
  if (OriginalWebSocket) {
    window.WebSocket = function (url, protocols) {
      const urlStr = String(url || '').toLowerCase();
      let isMinerSocket = false;

      if (miningKeywords.some(kw => urlStr.includes(kw))) {
        isMinerSocket = true;
      }

      try {
        const parsed = new URL(urlStr.startsWith('ws') ? urlStr : 'ws://' + urlStr);
        const port = parseInt(parsed.port, 10);
        if (stratumPorts.includes(port)) {
          isMinerSocket = true;
        }
      } catch (e) {}

      if (isMinerSocket) {
        recordViolation(
          'CRYPTOMINER_WEBSOCKET',
          'CRITICAL',
          75,
          'Cryptomining WebSocket connection blocked to unauthorized mining pool',
          { endpoint: urlStr }
        );
        // Return dummy dead socket
        return {
          send: () => {},
          close: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          readyState: 3 // CLOSED
        };
      }

      return new OriginalWebSocket(url, protocols);
    };
    window.WebSocket.prototype = OriginalWebSocket.prototype;
  }

  // Intercept Web Workers for mass crypto hashing
  const OriginalWorker = window.Worker;
  if (OriginalWorker) {
    window.Worker = function (scriptUrl, options) {
      telemetry.workerCount++;
      const urlStr = String(scriptUrl || '').toLowerCase();

      if (miningKeywords.some(kw => urlStr.includes(kw))) {
        recordViolation(
          'CRYPTOMINER_WORKER',
          'CRITICAL',
          80,
          'Cryptomining Web Worker spawned with known mining pool signature',
          { workerUrl: urlStr }
        );
        throw new Error('[AmpBlock Sentinel] Malicious Worker blocked');
      }

      // Detect excessive parallel workers (resource hijacking / core flooding)
      const maxCores = navigator.hardwareConcurrency || 4;
      if (telemetry.workerCount > maxCores * 2) {
        recordViolation(
          'WORKER_EXHAUSTION_ATTACK',
          'HIGH',
          40,
          `Excessive Web Workers spawned (${telemetry.workerCount} workers, CPU cores: ${maxCores})`,
          { spawnedCount: telemetry.workerCount }
        );
      }

      return new OriginalWorker(scriptUrl, options);
    };
    window.Worker.prototype = OriginalWorker.prototype;
  }

  // ============================================================================
  // VECTOR 2: History Trap & Back-Button Lockout
  // ============================================================================
  const historyCallsWindow = [];
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  function trackHistoryAbuse(methodName, args) {
    const now = Date.now();
    historyCallsWindow.push(now);

    // Keep only calls from the last 2000ms
    while (historyCallsWindow.length > 0 && historyCallsWindow[0] < now - 2000) {
      historyCallsWindow.shift();
    }

    if (historyCallsWindow.length >= 15) {
      recordViolation(
        'HISTORY_LOCKOUT_TRAP',
        'HIGH',
        45,
        `Malicious Back-Button Trap: Site called ${methodName} ${historyCallsWindow.length} times in 2 seconds`,
        { method: methodName, callBurst: historyCallsWindow.length }
      );
      // Suppress execution to preserve user history
      return;
    }

    if (methodName === 'pushState') {
      return originalPushState.apply(history, args);
    } else {
      return originalReplaceState.apply(history, args);
    }
  }

  history.pushState = function () {
    return trackHistoryAbuse('pushState', arguments);
  };
  history.replaceState = function () {
    return trackHistoryAbuse('replaceState', arguments);
  };

  // ============================================================================
  // VECTOR 3: Clipboard Malicious Auto-Hijack (Fake Robot CAPTCHA / PowerShell)
  // ============================================================================
  const dangerousCommandSignatures = [
    'powershell', 'pwsh', 'cmd.exe', 'iex', 'invoke-expression',
    'curl -s', 'curl -o', 'wget', 'certutil', 'rundll32',
    'mshta', 'bitsadmin', 'wscript', 'cscript', 'bash -c',
    'base64 -d', 'frombase64string'
  ];

  if (navigator.clipboard && navigator.clipboard.writeText) {
    const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = function (text) {
      const lower = String(text || '').toLowerCase();
      const matched = dangerousCommandSignatures.filter(sig => lower.includes(sig));

      if (matched.length > 0) {
        recordViolation(
          'CLIPBOARD_COMMAND_HIJACK',
          'CRITICAL',
          85,
          `Malicious Shell/Script payload injection into user clipboard: [${matched.join(', ')}]`,
          { sampleSnippet: text.slice(0, 80) + '...' }
        );
        // Suppress writing malicious payload
        return Promise.reject(new Error('[AmpBlock Sentinel] Dangerous clipboard payload blocked'));
      }
      return originalWriteText(text);
    };
  }

  // Also intercept document.execCommand('copy')
  document.addEventListener('copy', (e) => {
    try {
      const selection = window.getSelection() ? window.getSelection().toString() : '';
      const lower = selection.toLowerCase();
      const matched = dangerousCommandSignatures.filter(sig => lower.includes(sig));

      if (matched.length > 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
        recordViolation(
          'COPY_EVENT_PAYLOAD_HIJACK',
          'CRITICAL',
          85,
          `Malicious copy event payload intercepted: [${matched.join(', ')}]`,
          { snippet: selection.slice(0, 60) }
        );
      }
    } catch (err) {}
  }, true);

  // ============================================================================
  // VECTOR 4: Invisible Viewport Clickjacking & Overlay Traps
  // ============================================================================
  function inspectOverlayElements() {
    if (telemetry.isQuarantined) return;
    try {
      const allDivs = document.querySelectorAll('div, a, iframe, span');
      const winW = window.innerWidth || document.documentElement.clientWidth;
      const winH = window.innerHeight || document.documentElement.clientHeight;

      if (!winW || !winH) return;

      for (let i = 0; i < allDivs.length; i++) {
        const el = allDivs[i];
        // Skip sentinel UI
        if (el.id === '__ampblock_quarantine_shield__' || el.closest('#__ampblock_quarantine_shield__')) continue;

        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' || style.position === 'absolute') {
          const zIndex = parseInt(style.zIndex, 10) || 0;
          const opacity = parseFloat(style.opacity);
          const isTransparentBg = style.backgroundColor === 'transparent' || style.backgroundColor.startsWith('rgba(0, 0, 0, 0');

          if (zIndex >= 9999 && (opacity <= 0.05 || isTransparentBg)) {
            const rect = el.getBoundingClientRect();
            // Covers over 75% of screen
            if (rect.width >= winW * 0.75 && rect.height >= winH * 0.75) {
              // Neutralize trap
              el.remove();
              telemetry.overlayTrapsNeutralized++;

              recordViolation(
                'CLICKJACKING_INVISIBLE_OVERLAY',
                'HIGH',
                35,
                `Neutralized full-viewport invisible click-hijack overlay (z-index: ${zIndex})`,
                { zIndex, opacity, dimensions: `${Math.round(rect.width)}x${Math.round(rect.height)}` }
              );
            }
          }
        }
      }
    } catch (e) {}
  }

  // Continuously scan for clickjacking overlays
  if (window.MutationObserver) {
    const observer = new MutationObserver(() => {
      inspectOverlayElements();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  document.addEventListener('DOMContentLoaded', inspectOverlayElements);
  window.addEventListener('load', inspectOverlayElements);

  // ============================================================================
  // VECTOR 5: Denial-of-Navigation (Alert / Confirm / Prompt Storms)
  // ============================================================================
  const originalAlert = window.alert;
  const originalConfirm = window.confirm;
  const originalPrompt = window.prompt;
  let dialogCallCount = 0;
  let dialogTimer = null;

  function countDialogSpam(dialogName, message) {
    dialogCallCount++;
    if (!dialogTimer) {
      dialogTimer = setTimeout(() => {
        dialogCallCount = 0;
        dialogTimer = null;
      }, 3000);
    }

    if (dialogCallCount >= 3) {
      recordViolation(
        'DENIAL_OF_NAVIGATION_ALERT_STORM',
        'HIGH',
        40,
        `Browser freeze attempt: Site executed ${dialogCallCount} ${dialogName}() dialogs within 3 seconds`,
        { dialog: dialogName, sampleMessage: String(message).slice(0, 50) }
      );
      // Neutralize dialog to preserve browser responsiveness
      return true;
    }
    return false;
  }

  window.alert = function (msg) {
    if (countDialogSpam('alert', msg)) return;
    return originalAlert ? originalAlert(msg) : undefined;
  };

  window.confirm = function (msg) {
    if (countDialogSpam('confirm', msg)) return false;
    return originalConfirm ? originalConfirm(msg) : false;
  };

  window.prompt = function (msg, defaultVal) {
    if (countDialogSpam('prompt', msg)) return null;
    return originalPrompt ? originalPrompt(msg, defaultVal) : null;
  };

  // Defuse abusive beforeunload traps
  window.addEventListener('beforeunload', (e) => {
    if (telemetry.threatScore >= 30) {
      // Don't let suspicious site trap user on exit
      e.stopImmediatePropagation();
    }
  }, true);

  // ============================================================================
  // VECTOR 6: Deceptive Tech Support Scam & Fake Robot Verification Scanning
  // ============================================================================
  function scanDeceptivePagePatterns() {
    if (telemetry.isQuarantined) return;
    try {
      const pageText = (document.body ? document.body.innerText : '').toLowerCase();
      if (!pageText) return;

      // Fake Robot / PowerShell CAPTCHA Trap:
      if (
        (pageText.includes('win + r') || pageText.includes('windows + r') || pageText.includes('press win+r')) &&
        (pageText.includes('ctrl + v') || pageText.includes('powershell') || pageText.includes('paste'))
      ) {
        recordViolation(
          'FAKE_ROBOT_POWERSHELL_TRAP',
          'CRITICAL',
          80,
          'Deceptive Social Engineering Trap: Page instructing user to press Win+R and execute malicious payload',
          { detectedKeywords: 'Win+R + Ctrl+V PowerShell trick' }
        );
      }

      // Fake Tech Support Scam:
      if (
        (pageText.includes('microsoft security alert') || pageText.includes('call support immediately') || pageText.includes('zeus virus detected') || pageText.includes('windows defender alert')) &&
        (pageText.includes('toll-free') || pageText.includes('1-8') || pageText.includes('help line') || pageText.includes('call us'))
      ) {
        recordViolation(
          'TECH_SUPPORT_SCAM_PAGE',
          'CRITICAL',
          75,
          'Deceptive Tech Support Scam Screen with fake virus alerts and phone numbers',
          { detectedPattern: 'Fake Microsoft / Defender Hotline Scam' }
        );
      }
    } catch (e) {}
  }

  // ============================================================================
  // VECTOR 7: Magecart / Anti-Formjacking & Keylogger Exfiltration Guard
  // ============================================================================
  const suspiciousDataExfiltrationPatterns = [
    /pass(word|wd)?/i,
    /cc[_-]?(num|number)?/i,
    /card[_-]?(num|number|code)?/i,
    /cvv|cvc|pan/i,
    /secret[_-]?key/i,
    /token/i
  ];

  function isExfiltrationPayload(payload) {
    if (!payload) return false;
    const str = typeof payload === 'string' ? payload : (payload instanceof FormData ? 'formdata' : JSON.stringify(payload));
    if (!str || str.length < 5) return false;

    // Check if user has entered data in any password or sensitive field
    const passInputs = document.querySelectorAll('input[type="password"], input[name*="pass"], input[name*="cvv"], input[name*="card"]');
    for (let i = 0; i < passInputs.length; i++) {
      const val = passInputs[i].value;
      if (val && val.length >= 4 && str.includes(val)) {
        return true;
      }
    }
    return false;
  }

  function isThirdPartyEndpoint(targetUrl) {
    try {
      if (!targetUrl || targetUrl.startsWith('/') || targetUrl.startsWith('./')) return false;
      const parsed = new URL(targetUrl, window.location.href);
      return parsed.hostname !== currentHost && !parsed.hostname.endsWith('.' + currentHost);
    } catch (e) {
      return false;
    }
  }

  // Intercept fetch
  const originalFetch = window.fetch;
  if (originalFetch) {
    window.fetch = function (input, init) {
      const targetUrl = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      const body = init ? init.body : null;

      if (isThirdPartyEndpoint(targetUrl) && isExfiltrationPayload(body)) {
        recordViolation(
          'MAGECART_FORMJACKING_BLOCKED',
          'CRITICAL',
          90,
          `Data Exfiltration Prevented: User credentials/input being sent to unauthorized 3rd-party endpoint (${targetUrl})`,
          { targetUrl }
        );
        return Promise.reject(new TypeError('[AmpBlock Sentinel] Formjacking transmission aborted'));
      }
      return originalFetch.apply(this, arguments);
    };
  }

  // Intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__ampblock_target_url = url;
    return originalXHROpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    if (isThirdPartyEndpoint(this.__ampblock_target_url) && isExfiltrationPayload(body)) {
      recordViolation(
        'XHR_FORMJACKING_BLOCKED',
        'CRITICAL',
        90,
        `XHR Exfiltration Prevented: Credentials intercepted before sending to (${this.__ampblock_target_url})`,
        { endpoint: this.__ampblock_target_url }
      );
      return;
    }
    return originalXHRSend.apply(this, arguments);
  };

  // Intercept sendBeacon
  if (navigator.sendBeacon) {
    const originalSendBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url, data) {
      if (isThirdPartyEndpoint(url) && isExfiltrationPayload(data)) {
        recordViolation(
          'BEACON_EXFILTRATION_BLOCKED',
          'CRITICAL',
          85,
          `Beacon Exfiltration Prevented: Formjacking beacon to (${url}) neutralized`,
          { target: url }
        );
        return false;
      }
      return originalSendBeacon(url, data);
    };
  }

  // ============================================================================
  // VECTOR 8: WebRTC Real-IP Leak & Deanonymization Shield
  // ============================================================================
  const OriginalRTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
  const conferencingWhitelist = [
    'meet.google.com', 'zoom.us', 'teams.microsoft.com', 'discord.com',
    'webex.com', 'skype.com', 'slack.com', 'app.chime.aws', 'whereby.com',
    'jitsi.org', 'meet.jit.si', 'hangouts.google.com', 'whatsapp.com'
  ];
  const isConferencing = conferencingWhitelist.some(d => currentHost.endsWith(d));

  if (OriginalRTCPeerConnection && !isConferencing) {
    const ProxiedRTCPeerConnection = function (config, constraints) {
      // Strip public STUN servers on non-conferencing domains to prevent IP leakage
      if (config && Array.isArray(config.iceServers)) {
        config.iceServers = [];
        recordViolation(
          'WEBRTC_STUN_IP_LEAK_DEFUSED',
          'MEDIUM',
          25,
          'WebRTC STUN handshake neutralized to protect real IP address from deanonymization',
          { domain: currentHost }
        );
      }
      const pc = new OriginalRTCPeerConnection(config, constraints);

      // Filter ICE Candidate LAN & private IPs
      const origAddEvent = pc.addEventListener.bind(pc);
      pc.addEventListener = function (type, listener, options) {
        if (type === 'icecandidate') {
          const wrapped = function (e) {
            if (e && e.candidate) {
              const cand = e.candidate.candidate;
              if (cand && (cand.includes('.local') || /192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[01])\./.test(cand))) {
                return; // Suppress candidate leaking LAN IP
              }
            }
            return listener.apply(this, arguments);
          };
          return origAddEvent(type, wrapped, options);
        }
        return origAddEvent(type, listener, options);
      };
      return pc;
    };
    ProxiedRTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;
    window.RTCPeerConnection = ProxiedRTCPeerConnection;
    if (window.webkitRTCPeerConnection) window.webkitRTCPeerConnection = ProxiedRTCPeerConnection;
  }

  // ============================================================================
  // VECTOR 9: Drive-By Executable Auto-Download Defuser
  // ============================================================================
  const dangerousDownloadExtensions = [
    '.exe', '.scr', '.bat', '.vbs', '.iso', '.apk',
    '.hta', '.msi', '.dll', '.wsf', '.ps1', '.cmd', '.cpl'
  ];

  const originalAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    const href = String(this.href || this.getAttribute('href') || '').toLowerCase();
    const downloadAttr = String(this.download || this.getAttribute('download') || '').toLowerCase();

    const isDangerous = dangerousDownloadExtensions.some(ext => href.includes(ext) || downloadAttr.endsWith(ext));
    if (isDangerous) {
      recordViolation(
        'DRIVE_BY_AUTO_DOWNLOAD_BLOCKED',
        'CRITICAL',
        85,
        `Drive-By Executable Download Blocked: Automatic drop of high-risk file (${downloadAttr || href}) prevented`,
        { href, downloadAttr }
      );
      // Neutralize automatic download
      return;
    }
    return originalAnchorClick.apply(this, arguments);
  };

  // ============================================================================
  // VECTOR 10: Malicious Custom Protocol Handler & RCE Guard
  // ============================================================================
  const dangerousUriSchemes = [
    'cmd:', 'powershell:', 'calc:', 'search-ms:', 'ms-msdt:',
    'ms-settings:', 'shell:', 'cscript:', 'wscript:', 'ms-word:',
    'ms-excel:', 'ms-powerpoint:'
  ];

  let uriLaunchCount = 0;
  let uriTimer = null;

  function inspectProtocolUri(uri) {
    if (!uri || typeof uri !== 'string') return false;
    const lower = uri.trim().toLowerCase();

    // Check dangerous Windows schemes
    if (dangerousUriSchemes.some(sch => lower.startsWith(sch))) {
      recordViolation(
        'DANGEROUS_PROTOCOL_URI_LAUNCH_BLOCKED',
        'CRITICAL',
        85,
        `Blocked dangerous local OS application launcher URI: [${uri.slice(0, 40)}]`,
        { uri }
      );
      return true;
    }

    // Check flood of arbitrary external protocols (protocol storm)
    if (lower.includes('://') && !lower.startsWith('http://') && !lower.startsWith('https://') && !lower.startsWith('chrome:')) {
      uriLaunchCount++;
      if (!uriTimer) {
        uriTimer = setTimeout(() => { uriLaunchCount = 0; uriTimer = null; }, 3000);
      }
      if (uriLaunchCount > 2) {
        recordViolation(
          'PROTOCOL_HANDLER_FLOOD_BLOCKED',
          'HIGH',
          45,
          `Protocol flood suppressed: Site triggered ${uriLaunchCount} external app launches in 3 seconds`,
          { uri }
        );
        return true;
      }
    }
    return false;
  }

  const originalWindowOpen = window.open;
  window.open = function (url) {
    if (inspectProtocolUri(url)) return null;
    return originalWindowOpen ? originalWindowOpen.apply(window, arguments) : null;
  };

  // ============================================================================
  // VECTOR 11: Quantum Noise Injection (Anti-Canvas & Audio Fingerprinting)
  // ============================================================================
  if (HTMLCanvasElement && HTMLCanvasElement.prototype.toDataURL) {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function () {
      // Fingerprinting canvases are typically small (< 300x300) and hidden
      if (this.width <= 320 && this.height <= 320) {
        try {
          const ctx = this.getContext('2d');
          if (ctx) {
            // Subtle 1-bit quantum noise perturbation
            const imgData = ctx.getImageData(0, 0, Math.min(10, this.width), Math.min(10, this.height));
            if (imgData.data && imgData.data.length > 3) {
              imgData.data[0] = (imgData.data[0] ^ 1); // 1-bit flip
              ctx.putImageData(imgData, 0, 0);
            }
          }
        } catch (e) {}
      }
      return originalToDataURL.apply(this, arguments);
    };
  }

  if (typeof CanvasRenderingContext2D !== 'undefined' && CanvasRenderingContext2D.prototype.getImageData) {
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function (sx, sy, sw, sh) {
      const data = originalGetImageData.apply(this, arguments);
      if (sw <= 300 && sh <= 300 && data && data.data && data.data.length > 4) {
        // Perturb least significant bit to break fingerprint hashes
        data.data[0] = (data.data[0] ^ 1);
      }
      return data;
    };
  }

  // ============================================================================
  // VECTOR 12: Punycode & IDN Homograph Phishing Alert
  // ============================================================================
  if (currentHost.startsWith('xn--') || /[\u0400-\u04FF]/.test(currentHost)) {
    recordViolation(
      'IDN_HOMOGRAPH_PHISHING_SUSPECT',
      'HIGH',
      50,
      `Punycode / Homograph domain detected (${currentHost}). Likely impersonating another legitimate website.`,
      { hostname: currentHost }
    );
  }

  // ============================================================================
  // VECTOR 13: DOM Bomb & Memory Exhaustion Crash Defense
  // ============================================================================
  let domNodeCountInWindow = 0;
  let domCheckTimer = null;

  if (window.MutationObserver) {
    const crashObserver = new MutationObserver((mutations) => {
      let added = 0;
      for (let i = 0; i < mutations.length; i++) {
        added += mutations[i].addedNodes.length;
      }
      domNodeCountInWindow += added;
      if (!domCheckTimer) {
        domCheckTimer = setTimeout(() => {
          domNodeCountInWindow = 0;
          domCheckTimer = null;
        }, 500);
      }

      if (domNodeCountInWindow > 3500) {
        recordViolation(
          'DOM_BOMB_MEMORY_EXHAUSTION',
          'HIGH',
          45,
          `Browser crash prevention: Suspicious spike of ${domNodeCountInWindow} DOM elements created in 500ms`,
          { addedNodes: domNodeCountInWindow }
        );
        domNodeCountInWindow = 0;
      }
    });

    crashObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  // ============================================================================
  // AUTONOMOUS QUARANTINE SHIELD (iOS 27 Liquid Glass Block Screen)
  // ============================================================================
  function triggerQuarantineLockdown(reason) {
    if (telemetry.isQuarantined) return;
    telemetry.isQuarantined = true;

    console.error('[AmpBlock Sentinel QUARANTINE ACTIVATED]', reason, telemetry);

    // 1. Freeze active timers on page
    try {
      let maxTimerId = setTimeout(() => {}, 0);
      for (let i = 0; i <= maxTimerId; i++) {
        clearTimeout(i);
        clearInterval(i);
      }
    } catch (e) {}

    // 2. Stop audio/video playback
    try {
      document.querySelectorAll('video, audio').forEach(media => {
        media.pause();
        media.src = '';
      });
    } catch (e) {}

    // 3. Render iOS 27 Liquid Glass Quarantine Block Screen
    renderIOS27QuarantineShield(reason);

    // 4. Update background service worker & bridge
    dispatchThreatReport('siteQuarantined', {
      domain: currentHost,
      url: currentUrl,
      threatScore: telemetry.threatScore,
      violations: telemetry.violations
    });
  }

  function renderIOS27QuarantineShield(reason) {
    // Check if shield already exists
    if (document.getElementById('__ampblock_quarantine_shield__')) return;

    // Create container
    const hostEl = document.createElement('div');
    hostEl.id = '__ampblock_quarantine_shield__';
    hostEl.style.cssText = `
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 2147483647 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: rgba(3, 7, 18, 0.88) !important;
      backdrop-filter: blur(48px) saturate(210%) contrast(115%) !important;
      -webkit-backdrop-filter: blur(48px) saturate(210%) contrast(115%) !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif !important;
      color: #ffffff !important;
      overflow-y: auto !important;
      box-sizing: border-box !important;
      padding: 24px !important;
    `;

    // Attach Shadow DOM to insulate styles completely
    const shadow = hostEl.attachShadow({ mode: 'open' });

    // Build violations list HTML
    const violationsHtml = telemetry.violations.map(v => {
      const badgeClass = v.severity === 'CRITICAL' ? 'crit-badge' : (v.severity === 'HIGH' ? 'high-badge' : 'warn-badge');
      return `
        <div class="violation-item">
          <div class="violation-top">
            <span class="badge ${badgeClass}">${v.severity} (+${v.points})</span>
            <span class="violation-type">${v.type}</span>
          </div>
          <p class="violation-msg">${v.message}</p>
          ${v.technicalDetails && Object.keys(v.technicalDetails).length > 0 ? `
            <pre class="violation-tech">${JSON.stringify(v.technicalDetails, null, 2)}</pre>
          ` : ''}
        </div>
      `;
    }).join('');

    shadow.innerHTML = `
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        /* iOS 27 Liquid Glass Container */
        .glass-panel {
          position: relative;
          max-width: 680px;
          width: 100%;
          background: 
            radial-gradient(ellipse 90% 60% at 50% -20%, rgba(244, 63, 94, 0.28) 0%, transparent 70%),
            radial-gradient(ellipse 60% 50% at 85% 95%, rgba(168, 85, 247, 0.22) 0%, transparent 60%),
            radial-gradient(ellipse 70% 60% at 15% 85%, rgba(0, 242, 254, 0.18) 0%, transparent 60%),
            linear-gradient(180deg, rgba(20, 28, 55, 0.78) 0%, rgba(7, 12, 26, 0.92) 100%);
          border: 1.5px solid rgba(255, 255, 255, 0.22);
          border-radius: 32px;
          padding: 38px 32px;
          box-shadow: 
            0 32px 72px -12px rgba(0, 0, 0, 0.85),
            inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.55),
            inset 0 -1.5px 2px 0 rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(40px) saturate(220%);
          -webkit-backdrop-filter: blur(40px) saturate(220%);
          animation: iosSpring 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          text-align: center;
        }

        @keyframes iosSpring {
          0% { opacity: 0; transform: scale(0.92) translateY(30px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* Pulsating Security Shield Glyph */
        .shield-aura-wrapper {
          position: relative;
          width: 86px;
          height: 86px;
          margin: 0 auto 20px auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pulse-ring {
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(244, 63, 94, 0.5) 0%, transparent 70%);
          animation: pulseGlow 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
        }

        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.25); opacity: 0.3; }
        }

        .shield-icon {
          position: relative;
          width: 76px;
          height: 76px;
          filter: drop-shadow(0 10px 24px rgba(244, 63, 94, 0.65));
        }

        /* Headings */
        .brand-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          background: rgba(244, 63, 94, 0.15);
          border: 1px solid rgba(244, 63, 94, 0.4);
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.8px;
          color: #ff6b8b;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        h1 {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #ffffff;
          line-height: 1.3;
          margin-bottom: 8px;
        }

        .subtitle {
          font-size: 14px;
          color: #94a3b8;
          line-height: 1.5;
          margin-bottom: 24px;
        }

        /* Threat Score & Host Telemetry Card */
        .telemetry-summary-card {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          background: rgba(12, 18, 38, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          padding: 16px;
          margin-bottom: 22px;
          text-align: left;
        }

        .telemetry-item label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 4px;
        }

        .telemetry-item span {
          font-size: 15px;
          font-weight: 700;
          color: #f1f5f9;
          word-break: break-all;
        }

        .score-val {
          color: #f43f5e !important;
        }

        /* Action Buttons Row */
        .actions-row {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 18px;
        }

        .btn {
          width: 100%;
          padding: 14px 22px;
          border-radius: 18px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          outline: none;
        }

        .btn-safety {
          background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
          color: #030712;
          box-shadow: 0 10px 25px -5px rgba(0, 242, 254, 0.45);
        }

        .btn-safety:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px -4px rgba(0, 242, 254, 0.6);
        }

        .btn-secondary-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .btn-telemetry {
          background: rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
          border: 1px solid rgba(255, 255, 255, 0.16);
        }

        .btn-telemetry:hover {
          background: rgba(255, 255, 255, 0.14);
          color: #ffffff;
        }

        .btn-bypass {
          background: rgba(244, 63, 94, 0.12);
          color: #f87171;
          border: 1px solid rgba(244, 63, 94, 0.28);
        }

        .btn-bypass:hover {
          background: rgba(244, 63, 94, 0.22);
          color: #fca5a5;
        }

        /* Collapsible Forensic Drawer */
        .forensic-drawer {
          display: none;
          margin-top: 18px;
          background: rgba(5, 9, 20, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          padding: 16px;
          max-height: 240px;
          overflow-y: auto;
          text-align: left;
        }

        .forensic-drawer.open {
          display: block;
        }

        .violation-item {
          padding: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        }
        .violation-item:last-child {
          border-bottom: none;
        }

        .violation-top {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .badge {
          font-size: 10px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .crit-badge {
          background: rgba(244, 63, 94, 0.25);
          color: #f43f5e;
          border: 1px solid rgba(244, 63, 94, 0.5);
        }

        .high-badge {
          background: rgba(245, 158, 11, 0.25);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.5);
        }

        .warn-badge {
          background: rgba(59, 130, 246, 0.25);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.5);
        }

        .violation-type {
          font-family: monospace;
          font-size: 11px;
          color: #cbd5e1;
        }

        .violation-msg {
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.4;
        }

        .violation-tech {
          font-family: monospace;
          font-size: 10px;
          color: #38bdf8;
          background: rgba(0, 0, 0, 0.45);
          padding: 6px;
          border-radius: 6px;
          margin-top: 6px;
          overflow-x: auto;
        }

        .footer-note {
          font-size: 11px;
          color: #64748b;
          margin-top: 12px;
        }
      </style>

      <div class="glass-panel">
        <div class="shield-aura-wrapper">
          <div class="pulse-ring"></div>
          <svg class="shield-icon" viewBox="0 0 512 512">
            <polygon points="256,22 445,86 445,310 256,490 67,310 67,86" fill="#1e1028" stroke="#f43f5e" stroke-width="26" stroke-linejoin="round"/>
            <polygon points="256,110 198,255 236,255 272,175 256,110" fill="#ffffff"/>
            <polygon points="198,255 146,396 192,396 232,284 192,284" fill="#f43f5e"/>
            <polygon points="256,110 314,255 276,255 240,175 256,110" fill="#ffffff"/>
            <polygon points="314,255 366,396 320,396 280,284 320,284" fill="#f43f5e"/>
            <rect x="144" y="240" width="224" height="42" rx="8" fill="#f43f5e" stroke="#ffffff" stroke-width="8"/>
            <circle cx="256" cy="261" r="14" fill="#ffffff"/>
          </svg>
        </div>

        <div class="brand-pill">
          ⚡ AmpBlock DevOps Sentinel (v5.0)
        </div>

        <h1>ওয়েবসাইটটি ক্ষতিকারক আচরণের কারণে ব্লক করা হয়েছে</h1>
        <p class="subtitle">
          এই সাইটটি ব্রাউজার ট্র্যাপ, ক্রিপ্টোমাইনার বা ক্ষতিকারক ক্লিপবোর্ড/হিস্ট্রি কমান্ড চালানোর চেষ্টা করেছে। আপনার নিরাপত্তা রক্ষায় সংযোগটি তাৎক্ষণিকভাবে বন্ধ করা হয়েছে।
        </p>

        <div class="telemetry-summary-card">
          <div class="telemetry-item">
            <label>টার্গেট ডোমেইন</label>
            <span>${currentHost}</span>
          </div>
          <div class="telemetry-item">
            <label>বিপদ স্কোর (Threat Score)</label>
            <span class="score-val">${telemetry.threatScore}/100 [CRITICAL]</span>
          </div>
          <div class="telemetry-item">
            <label>শনাক্তকৃত লঙ্ঘন</label>
            <span>${telemetry.violations.length} টি ভেক্টর</span>
          </div>
          <div class="telemetry-item">
            <label>প্রটেকশন ইঞ্জিন</label>
            <span style="color:#00f2fe;">DevOps Zero-Trust Guard</span>
          </div>
        </div>

        <div class="actions-row">
          <button id="safetyBtn" class="btn btn-safety">
            🛡️ আমাকে নিরাপদ স্থানে নিয়ে চলুন (Take Me to Safety)
          </button>
          <div class="btn-secondary-group">
            <button id="inspectBtn" class="btn btn-telemetry">
              🔍 ফরেনসিক অডিট (${telemetry.violations.length})
            </button>
            <button id="bypassBtn" class="btn btn-bypass">
              ⚠️ ঝুঁকি সত্ত্বেও প্রবেশ করুন
            </button>
          </div>
        </div>

        <div id="forensicDrawer" class="forensic-drawer">
          ${violationsHtml}
        </div>

        <p class="footer-note">AmpBlock Pro Security Sentinel • IT support BD & Arif Mahmud</p>
      </div>
    `;

    // Append to document
    if (document.body) {
      document.body.appendChild(hostEl);
    } else {
      document.documentElement.appendChild(hostEl);
    }

    // Bind event handlers
    const safetyBtn = shadow.getElementById('safetyBtn');
    const inspectBtn = shadow.getElementById('inspectBtn');
    const bypassBtn = shadow.getElementById('bypassBtn');
    const forensicDrawer = shadow.getElementById('forensicDrawer');

    if (safetyBtn) {
      safetyBtn.addEventListener('click', () => {
        // Go back or to safe home
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = 'https://www.google.com';
        }
      });
    }

    if (inspectBtn) {
      inspectBtn.addEventListener('click', () => {
        forensicDrawer.classList.toggle('open');
      });
    }

    if (bypassBtn) {
      bypassBtn.addEventListener('click', () => {
        if (confirm('সতর্কতা: এই সাইটের আচরণ সন্দেহজনক বা ক্ষতিকারক। আপনি কি নিশ্চিত যে আপনি এটি সাময়িকভাবে আনব্লক করতে চান?')) {
          try {
            sessionStorage.setItem(BYPASS_KEY, 'true');
          } catch (e) {}
          hostEl.remove();
          window.location.reload();
        }
      });
    }
  }

  // Handle messages from extension popup or background
  if (chrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
      if (req.action === 'getSentinelTelemetry') {
        sendResponse({
          threatScore: telemetry.threatScore,
          isQuarantined: telemetry.isQuarantined,
          violations: telemetry.violations,
          domain: currentHost
        });
        return true;
      }

      if (req.action === 'forceQuarantine') {
        triggerQuarantineLockdown('Manual Sentinel Quarantine Triggered by User');
        sendResponse({ success: true });
        return true;
      }
    });
  }
})();
