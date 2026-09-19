/*
==============================================================================
# Copyright (c) 2026 IT support BD (https://itsupport.com.bd)
# Made By Arif (https://arifmahmud.com/)
# Project: AmpBlock
==============================================================================
*/

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Nav Toggle
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      const isOpen = navLinks.classList.contains('open');
      navToggle.setAttribute('aria-expanded', isOpen);
      navToggle.innerHTML = isOpen ? '&#10005;' : '&#9776;';
    });

    // Close menu when clicking link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.innerHTML = '&#9776;';
      });
    });
  }

  // Browser Detection for Hero Button
  const browserBtn = document.getElementById('primaryInstallBtn');
  const browserNotice = document.getElementById('browserNotice');
  if (browserBtn) {
    const userAgent = navigator.userAgent;
    let browserName = "Chrome";
    let iconSvg = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>';

    if (userAgent.indexOf("Edg") > -1) {
      browserName = "Microsoft Edge";
    } else if (userAgent.indexOf("Brave") > -1 || (navigator.brave && navigator.brave.isBrave)) {
      browserName = "Brave Browser";
    } else if (userAgent.indexOf("OPR") > -1 || userAgent.indexOf("Opera") > -1) {
      browserName = "Opera Browser";
    } else if (userAgent.indexOf("Vivaldi") > -1) {
      browserName = "Vivaldi";
    }

    const btnText = browserBtn.querySelector('.btn-label');
    if (btnText) {
      btnText.textContent = `Get AmpBlock for ${browserName}`;
    }
    if (browserNotice) {
      browserNotice.textContent = `Compatible with Chromium & Manifest V3 engines (${browserName}, Chrome, Edge, Brave).`;
    }
  }

  // Live Stats Increment Animation
  const blockedCounter = document.getElementById('counterBlocked');
  const speedSaved = document.getElementById('counterTime');
  const bandwidthSaved = document.getElementById('counterBandwidth');

  if (blockedCounter) {
    let count = 4872954;
    setInterval(() => {
      count += Math.floor(Math.random() * 4) + 1;
      blockedCounter.textContent = count.toLocaleString();
    }, 1800);
  }

  // Interactive Live Ad Simulator
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
          simBadge.textContent = 'WARNING: 5 CLUTTERED ADS DETECTED';
          simBadge.className = 'sim-status-badge unprotected';
        }
      }
    });
  }

  // FAQ Accordion (Download Page)
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
