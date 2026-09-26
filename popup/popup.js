/**
 * ==============================================================================
 * # Copyright (c) 2026 IT support BD (https://itsupport.com.bd)
 * # Made By Arif (https://arifmahmud.com/)
 * # Project: AmpBlock
 * ==============================================================================
 *
 * AmpBlock - Popup Logic (English)
 * Real-time stats display, Master Switch, Whitelist Drawer, Element Zapper, and Analytics.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const currentDomainEl = document.getElementById('currentDomain');
  const siteStatusPill = document.getElementById('siteStatusPill');
  const siteStatusText = document.getElementById('siteStatusText');
  const statusSubtitle = document.getElementById('statusSubtitle');
  const masterToggle = document.getElementById('masterToggle');
  const whitelistToggle = document.getElementById('whitelistToggle');
  const pageCountEl = document.getElementById('pageCount');
  const totalCountEl = document.getElementById('totalCount');
  const savedDataEl = document.getElementById('savedData');
  const savedTimeEl = document.getElementById('savedTime');
  const reloadBtn = document.getElementById('reloadBtn');
  const shieldLogo = document.getElementById('shieldLogo');
  const zapperBtn = document.getElementById('zapperBtn');
  const openSettingsBtn = document.getElementById('openSettingsBtn');

  // Whitelist Drawer Elements
  const whitelistDrawer = document.getElementById('whitelistDrawer');
  const openWhitelistDrawerBtn = document.getElementById('openWhitelistDrawerBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const whitelistItemsList = document.getElementById('whitelistItemsList');
  const newDomainInput = document.getElementById('newDomainInput');
  const addDomainBtn = document.getElementById('addDomainBtn');

  // iOS 27 Sentinel Elements
  const sentinelStatusRing = document.getElementById('sentinelStatusRing');
  const sentinelStatusPill = document.getElementById('sentinelStatusPill');
  const sentinelStateDesc = document.getElementById('sentinelStateDesc');
  const sentinelScoreNum = document.getElementById('sentinelScoreNum');
  const sentinelBarFill = document.getElementById('sentinelBarFill');
  const threatsBlockedVal = document.getElementById('threatsBlockedVal');
  const testQuarantineBtn = document.getElementById('testQuarantineBtn');

  let activeTabId = null;
  let activeDomain = '';
  let isGlobalEnabled = true;
  let isCurrentWhitelisted = false;
  let cachedWhitelistedDomains = [];

  // Smooth number animation (en-US formatting)
  function animateValue(obj, start, end, duration, formatter) {
    if (start === end) {
      obj.textContent = formatter ? formatter(end) : end.toLocaleString('en-US');
      return;
    }
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const current = Math.floor(progress * (end - start) + start);
      obj.textContent = formatter ? formatter(current) : current.toLocaleString('en-US');
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }

  // Format saved data
  function formatData(mb) {
    if (mb >= 1024) {
      return (mb / 1024).toFixed(1) + ' GB';
    }
    return mb.toFixed(1) + ' MB';
  }

  // Format saved time
  function formatTime(minutes) {
    if (minutes >= 60) {
      return (minutes / 60).toFixed(1) + ' hrs';
    }
    return minutes.toFixed(1) + ' min';
  }

  // Get active tab info
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      activeTabId = tab.id;
      try {
        const url = new URL(tab.url);
        if (url.protocol.startsWith('http')) {
          activeDomain = url.hostname.toLowerCase();
          currentDomainEl.textContent = activeDomain;
        } else {
          activeDomain = '';
          currentDomainEl.textContent = 'Internal Page';
          whitelistToggle.disabled = true;
          zapperBtn.disabled = true;
        }
      } catch (e) {
        currentDomainEl.textContent = 'Unknown Site';
        whitelistToggle.disabled = true;
        zapperBtn.disabled = true;
      }
    }
  } catch (err) {
    console.error('Error fetching tab:', err);
  }

  // Fetch initial state from background
  function refreshState() {
    chrome.runtime.sendMessage(
      { action: 'getPopupData', tabId: activeTabId, domain: activeDomain },
      (res) => {
        if (chrome.runtime.lastError || !res) return;

        isGlobalEnabled = res.isEnabled;
        isCurrentWhitelisted = res.isWhitelisted;
        cachedWhitelistedDomains = res.whitelistedDomains || [];

        updateUIState(res);
        renderWhitelistDrawer();
      }
    );
  }

  function updateUIState(data) {
    const { isEnabled, isWhitelisted, pageBlocked, totalBlocked } = data;

    // Master Toggle Button
    if (isEnabled) {
      masterToggle.classList.add('active');
      masterToggle.classList.remove('disabled');
      masterToggle.title = 'Click to disable protection';
      shieldLogo.style.opacity = '1';
    } else {
      masterToggle.classList.remove('active');
      masterToggle.classList.add('disabled');
      masterToggle.title = 'Click to enable protection';
      shieldLogo.style.opacity = '0.4';
    }

    // Subtitle & Status
    if (!isEnabled) {
      statusSubtitle.textContent = 'Protection Disabled';
      statusSubtitle.style.color = '#94a3b8';
      siteStatusPill.className = 'status-pill whitelisted';
      siteStatusText.textContent = 'Disabled';
    } else if (isWhitelisted) {
      statusSubtitle.textContent = 'Ads Allowed on this site';
      statusSubtitle.style.color = '#f43f5e';
      siteStatusPill.className = 'status-pill whitelisted';
      siteStatusText.textContent = 'Allowed';
    } else {
      statusSubtitle.textContent = 'Protection Active';
      statusSubtitle.style.color = '#00f2fe';
      siteStatusPill.className = 'status-pill';
      siteStatusText.textContent = 'Protected';
    }

    // Whitelist switch
    whitelistToggle.checked = isWhitelisted;

    // Counts animation
    const oldPage = parseInt(pageCountEl.getAttribute('data-val') || '0', 10);
    const oldTotal = parseInt(totalCountEl.getAttribute('data-val') || '0', 10);

    pageCountEl.setAttribute('data-val', pageBlocked);
    totalCountEl.setAttribute('data-val', totalBlocked);

    animateValue(pageCountEl, oldPage, pageBlocked, 400);
    animateValue(totalCountEl, oldTotal, totalBlocked, 400);

    // Productivity metrics (1.25MB / ad, 0.05 min / ad)
    const mbSaved = totalBlocked * 1.25;
    const minSaved = totalBlocked * 0.05;
    savedDataEl.textContent = formatData(mbSaved);
    savedTimeEl.textContent = formatTime(minSaved);

    // Update iOS 27 DevOps Sentinel State
    const threatScore = Number(data.threatScore) || 0;
    const isQuarantined = Boolean(data.isQuarantined);
    const threatsTotal = Number(data.threatsBlockedTotal) || 0;

    if (threatsBlockedVal) {
      threatsBlockedVal.textContent = threatsTotal.toLocaleString('en-US');
    }

    if (sentinelScoreNum) {
      sentinelScoreNum.textContent = threatScore;
    }

    if (sentinelBarFill) {
      sentinelBarFill.style.width = Math.min(100, Math.max(0, threatScore)) + '%';
    }

    if (isQuarantined || threatScore >= 50) {
      if (sentinelStatusRing) sentinelStatusRing.className = 'sentinel-status-ring danger';
      if (sentinelStatusPill) {
        sentinelStatusPill.className = 'sentinel-pill danger';
        sentinelStatusPill.textContent = 'BLOCKED';
      }
      if (sentinelScoreNum) sentinelScoreNum.className = 'sentinel-score-num danger';
      if (sentinelBarFill) sentinelBarFill.className = 'sentinel-bar-fill danger';
      if (sentinelStateDesc) sentinelStateDesc.textContent = 'ক্ষতিকারক আচরণের কারণে সাইটটি কোয়ারেন্টাইন করা হয়েছে';
    } else if (threatScore > 0) {
      if (sentinelStatusRing) sentinelStatusRing.className = 'sentinel-status-ring warn';
      if (sentinelStatusPill) {
        sentinelStatusPill.className = 'sentinel-pill warn';
        sentinelStatusPill.textContent = 'WARNING';
      }
      if (sentinelScoreNum) sentinelScoreNum.className = 'sentinel-score-num warn';
      if (sentinelBarFill) sentinelBarFill.className = 'sentinel-bar-fill warn';
      if (sentinelStateDesc) sentinelStateDesc.textContent = 'সন্দেহজনক আচরণ নিরীক্ষণ করা হচ্ছে';
    } else {
      if (sentinelStatusRing) sentinelStatusRing.className = 'sentinel-status-ring safe';
      if (sentinelStatusPill) {
        sentinelStatusPill.className = 'sentinel-pill safe';
        sentinelStatusPill.textContent = 'CLEAN';
      }
      if (sentinelScoreNum) sentinelScoreNum.className = 'sentinel-score-num';
      if (sentinelBarFill) sentinelBarFill.className = 'sentinel-bar-fill safe';
      if (sentinelStateDesc) sentinelStateDesc.textContent = 'সাইটের আচরণ সম্পূর্ণ নিরাপদ ও পর্যবেক্ষণাধীন';
    }
  }

  // Render Whitelist Drawer
  function renderWhitelistDrawer() {
    whitelistItemsList.innerHTML = '';

    if (cachedWhitelistedDomains.length === 0) {
      whitelistItemsList.innerHTML = '<div class="empty-whitelist">No websites in the whitelist.</div>';
      return;
    }

    cachedWhitelistedDomains.forEach((d) => {
      const item = document.createElement('div');
      item.className = 'whitelist-item';

      const name = document.createElement('span');
      name.className = 'whitelist-item-domain';
      name.textContent = d;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-domain-btn';
      removeBtn.title = 'Remove';
      removeBtn.innerHTML = '🗑️';
      removeBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'removeWhitelistDomain', domain: d }, (res) => {
          if (res && res.success) {
            cachedWhitelistedDomains = res.whitelistedDomains;
            renderWhitelistDrawer();
            refreshState();
          }
        });
      });

      item.appendChild(name);
      item.appendChild(removeBtn);
      whitelistItemsList.appendChild(item);
    });
  }

  // Add Domain to Whitelist
  addDomainBtn.addEventListener('click', () => {
    let domain = newDomainInput.value.trim().toLowerCase();
    try {
      if (domain.startsWith('http')) {
        domain = new URL(domain).hostname;
      }
    } catch (e) {}

    if (!domain) return;

    chrome.runtime.sendMessage({ action: 'addWhitelistDomain', domain }, (res) => {
      if (res && res.success) {
        newDomainInput.value = '';
        cachedWhitelistedDomains = res.whitelistedDomains;
        renderWhitelistDrawer();
        refreshState();
      }
    });
  });

  // Drawer Toggles
  openWhitelistDrawerBtn.addEventListener('click', () => {
    whitelistDrawer.classList.add('open');
  });

  closeDrawerBtn.addEventListener('click', () => {
    whitelistDrawer.classList.remove('open');
  });

  // Master Power Button Click
  masterToggle.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'toggleGlobal' }, (res) => {
      if (res) {
        refreshState();
        if (activeTabId) {
          chrome.tabs.reload(activeTabId);
        }
      }
    });
  });

  // Whitelist Toggle Change
  whitelistToggle.addEventListener('change', () => {
    if (!activeDomain) return;

    // Immediate UI feedback
    statusSubtitle.textContent = whitelistToggle.checked ? 'Reloading with Ads Allowed...' : 'Reloading with Protection...';

    chrome.runtime.sendMessage(
      { action: 'toggleWhitelist', domain: activeDomain, tabId: activeTabId },
      (res) => {
        if (res) {
          refreshState();
        }
      }
    );
  });

  // Element Zapper Button Click
  zapperBtn.addEventListener('click', () => {
    if (!activeTabId) return;

    chrome.tabs.sendMessage(activeTabId, { action: 'triggerZapper' }).catch(() => {
      chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        files: ['content/element-zapper.js']
      }).catch(() => {});
    });

    window.close();
  });

  // Open Settings Dashboard
  openSettingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Reload active tab button
  reloadBtn.addEventListener('click', () => {
    if (activeTabId) {
      chrome.tabs.reload(activeTabId);
      window.close();
    }
  });

  // Test Sentinel Shield Button Click
  if (testQuarantineBtn) {
    testQuarantineBtn.addEventListener('click', () => {
      if (!activeTabId) return;
      chrome.tabs.sendMessage(activeTabId, { action: 'forceQuarantine' }, (res) => {
        if (chrome.runtime.lastError) {
          alert('এই পেজে সিকিউরিটি সেন্টিনেল রান করা সম্ভব নয় (Internal Chrome পেজ বা এক্সটেনশন স্ক্রিপ্ট নিষিদ্ধ)। সাধারণ কোনো ওয়েবসাইট পেজে টেস্ট করুন।');
        } else {
          window.close();
        }
      });
    });
  }

  // Initial load
  refreshState();
});
