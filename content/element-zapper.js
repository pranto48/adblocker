/**
 * ==============================================================================
 * # Copyright (c) 2026 IT support BD (https://itsupport.com.bd)
 * # Made By Arif (https://arifmahmud.com/)
 * # Project: AmpBlock
 * ==============================================================================
 *
 * AmpBlock - Visual Element Zapper
 * Enables interactive click-to-remove element blocking and persists custom CSS rules.
 */

(function () {
  'use strict';

  // Toggle or exit if already active
  if (window.__ampblock_zapper_active) {
    if (typeof window.__ampblock_exit_zapper === 'function') {
      window.__ampblock_exit_zapper();
    }
    return;
  }

  window.__ampblock_zapper_active = true;

  let hoveredElement = null;

  // Create HUD & Target Frame
  const overlay = document.createElement('div');
  overlay.id = 'ampblock-zapper-overlay';
  overlay.style.cssText = `
    position: fixed !important;
    pointer-events: none !important;
    border: 2px dashed #00f2fe !important;
    background: rgba(0, 242, 254, 0.15) !important;
    box-shadow: 0 0 15px rgba(0, 242, 254, 0.5), inset 0 0 15px rgba(0, 242, 254, 0.2) !important;
    border-radius: 4px !important;
    z-index: 2147483646 !important;
    transition: all 0.08s ease-out !important;
    display: none !important;
  `;

  const badge = document.createElement('div');
  badge.id = 'ampblock-zapper-badge';
  badge.style.cssText = `
    position: fixed !important;
    pointer-events: none !important;
    background: #060b14 !important;
    border: 1px solid #00f2fe !important;
    color: #00f2fe !important;
    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    padding: 4px 8px !important;
    border-radius: 6px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.8) !important;
    z-index: 2147483647 !important;
    display: none !important;
  `;
  badge.textContent = '🎯 ক্লিক করে জ্যাপ করুন | ESC চেপে বাতিল';

  document.body.appendChild(overlay);
  document.body.appendChild(badge);

  // Helper: compute clean CSS selector
  function getUniqueSelector(el) {
    if (!el || el === document.body || el === document.documentElement) return null;

    if (el.id && !/\d{4,}/.test(el.id)) {
      return '#' + CSS.escape(el.id);
    }

    // Filter valid classes
    const classes = Array.from(el.classList).filter(c => !c.startsWith('ampblock-') && !/\d{4,}/.test(c));
    if (classes.length > 0) {
      return el.tagName.toLowerCase() + '.' + classes.map(c => CSS.escape(c)).join('.');
    }

    // Fallback to parent path
    let path = el.tagName.toLowerCase();
    let parent = el.parentElement;
    if (parent && parent !== document.body) {
      const parentSelector = getUniqueSelector(parent);
      if (parentSelector) {
        path = parentSelector + ' > ' + path;
      }
    }
    return path;
  }

  // Mouse Move: Highlight element
  function onMouseMove(e) {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || target === overlay || target === badge || target === document.body || target === document.documentElement) {
      overlay.style.display = 'none';
      badge.style.display = 'none';
      hoveredElement = null;
      return;
    }

    hoveredElement = target;
    const rect = target.getBoundingClientRect();

    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.display = 'block';

    const selector = getUniqueSelector(target) || target.tagName.toLowerCase();
    badge.textContent = `🎯 ${selector} | ক্লিক করে জ্যাপ করুন (ESC বাতিল)`;
    badge.style.top = `${Math.max(10, rect.top - 32)}px`;
    badge.style.left = `${Math.max(10, rect.left)}px`;
    badge.style.display = 'block';
  }

  // Click: Zap Element
  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (hoveredElement) {
      const target = hoveredElement;
      const selector = getUniqueSelector(target);

      // Disintegration Animation
      target.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      target.style.transform = 'scale(0.85)';
      target.style.opacity = '0';
      target.style.filter = 'blur(4px)';

      setTimeout(() => {
        target.style.setProperty('display', 'none', 'important');
      }, 300);

      // Save selector in storage
      if (selector) {
        chrome.runtime.sendMessage({
          action: 'saveCustomBlockedSelector',
          domain: window.location.hostname,
          selector: selector
        });
      }

      // Report block to service worker
      chrome.runtime.sendMessage({
        action: 'reportBlockedAds',
        domain: window.location.hostname,
        increment: 1
      });
    }

    cleanup();
  }

  // Escape Key: Cancel
  function onKeyDown(e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
      e.preventDefault();
      cleanup();
    }
  }

  function cleanup() {
    window.__ampblock_zapper_active = false;
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (badge.parentNode) badge.parentNode.removeChild(badge);
  }

  window.__ampblock_exit_zapper = cleanup;

  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);
})();
