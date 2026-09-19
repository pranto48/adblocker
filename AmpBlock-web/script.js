/*
==============================================================================
# Copyright (c) 2026 IT support BD (https://itsupport.com.bd)
# Made By Arif (https://arifmahmud.com/)
# Project: AmpBlock
==============================================================================
*/

document.addEventListener('DOMContentLoaded', () => {
  // 1. Scroll-aware Header Backdrop Blur
  const siteHeader = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      siteHeader?.classList.add('scrolled');
    } else {
      siteHeader?.classList.remove('scrolled');
    }
  });

  // 2. Mobile Nav Toggle & Drawer
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen);
      navToggle.innerHTML = isOpen ? '&#10005;' : '&#9776;';
    });

    // Close menu when clicking any nav link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.innerHTML = '&#9776;';
        navToggle.setAttribute('aria-expanded', false);
      });
    });

    // Close menu on click outside
    document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && !navToggle.contains(e.target) && navLinks.classList.contains('open')) {
        navLinks.classList.remove('open');
        navToggle.innerHTML = '&#9776;';
        navToggle.setAttribute('aria-expanded', false);
      }
    });
  }

  // 3. Intelligent Browser Detection for Hero & CTA Buttons
  const browserBtn = document.getElementById('primaryInstallBtn');
  const browserNotice = document.getElementById('browserNotice');
  if (browserBtn) {
    const ua = navigator.userAgent;
    let browserName = "Chrome";
    let iconSvg = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>';

    if (ua.indexOf("Edg") > -1) {
      browserName = "Microsoft Edge";
    } else if (ua.indexOf("Brave") > -1 || (navigator.brave && navigator.brave.isBrave)) {
      browserName = "Brave Browser";
    } else if (ua.indexOf("OPR") > -1 || ua.indexOf("Opera") > -1) {
      browserName = "Opera Browser";
    } else if (ua.indexOf("Vivaldi") > -1) {
      browserName = "Vivaldi";
    }

    const btnLabel = browserBtn.querySelector('.btn-label');
    if (btnLabel) {
      btnLabel.textContent = `Get AmpBlock for ${browserName}`;
    }
    if (browserNotice) {
      browserNotice.innerHTML = `Native Manifest V3 engine for <strong>${browserName}</strong>, Chrome, Edge, Brave & Opera.`;
    }
  }

  // 4. Smooth Counter Animation for Stats Ribbon
  const blockedCounter = document.getElementById('counterBlocked');
  if (blockedCounter) {
    let count = 4872954;
    setInterval(() => {
      count += Math.floor(Math.random() * 5) + 2;
      blockedCounter.textContent = count.toLocaleString();
    }, 1500);
  }

  // 5. Interactive Live Ad Simulator Toggle
  const simToggle = document.getElementById('simToggle');
  const simViewport = document.getElementById('simViewport');
  const simBadge = document.getElementById('simStatusBadge');

  if (simToggle && simViewport) {
    simToggle.addEventListener('change', () => {
      const isProtected = simToggle.checked;
      if (isProtected) {
        simViewport.classList.remove('sim-unprotected');
        simViewport.classList.add('sim-protected');
        if (simBadge) {
          simBadge.textContent = 'AMPBLOCK ACTIVE: 0 ADS & POPUPS';
          simBadge.className = 'sim-status-badge protected';
        }
      } else {
        simViewport.classList.remove('sim-protected');
        simViewport.classList.add('sim-unprotected');
        if (simBadge) {
          simBadge.textContent = 'WARNING: 4 CLUTTERED ADS DETECTED';
          simBadge.className = 'sim-status-badge unprotected';
        }
      }
    });
  }

  // 6. Download Tracking & Instant Download Feedback
  const dlButtons = document.querySelectorAll('a[download]');
  dlButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span>⚡ Downloading AmpBlock-Pro.zip...</span>';
      setTimeout(() => {
        btn.innerHTML = originalText;
      }, 3000);
    });
  });

  // 7. FAQ Accordion (Download Page)
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        faqItems.forEach(i => i.classList.remove('active'));
        if (!isActive) {
          item.classList.add('active');
        }
      });
    }
  });
});
