/**
 * ==============================================================================
 * # Copyright (c) 2026 IT support BD (https://itsupport.com.bd)
 * # Made By Arif (https://arifmahmud.com/)
 * # Project: AmpBlock
 * ==============================================================================
 *
 * AmpBlock - Background Service Worker (Manifest V3)
 * Controls DNR rules, domain whitelist allow-system, tab badges, context menus, and storage stats.
 */

// In-memory tab counts
const tabStats = new Map();

// Helper: Normalize domain name
function extractHostname(url) {
  try {
    if (!url) return '';
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch (e) {
    return '';
  }
}

// Initial setup on install/update
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get([
    'isEnabled',
    'whitelistedDomains',
    'totalBlocked',
    'customBlockedSelectors'
  ]);

  if (typeof data.isEnabled === 'undefined') {
    await chrome.storage.local.set({ isEnabled: true });
  }
  if (!Array.isArray(data.whitelistedDomains)) {
    await chrome.storage.local.set({ whitelistedDomains: [] });
  }
  if (typeof data.totalBlocked === 'undefined') {
    await chrome.storage.local.set({ totalBlocked: 0 });
  }
  if (!data.customBlockedSelectors) {
    await chrome.storage.local.set({ customBlockedSelectors: {} });
  }

  // Setup Context Menus
  setupContextMenus();

  // Ensure default badge styling
  try {
    chrome.action.setBadgeBackgroundColor({ color: '#00d2ff' });
  } catch (e) {}

  await syncDynamicRules();
});

// Setup Context Menus
function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'ampblock_root',
      title: 'AmpBlock Pro',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'ampblock_zap',
      parentId: 'ampblock_root',
      title: '🎯 উপাদান জ্যাপ করুন (Zap Element)',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'ampblock_toggle_allow',
      parentId: 'ampblock_root',
      title: '🛡️ বর্তমান সাইটে বিজ্ঞাপন অনুমোদন/ব্লক করুন',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'ampblock_settings',
      parentId: 'ampblock_root',
      title: '⚙️ সেটিংস ড্যাশবোর্ড খুলুন',
      contexts: ['all']
    });
  });
}

// Context Menu click handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;

  if (info.menuItemId === 'ampblock_zap') {
    chrome.tabs.sendMessage(tab.id, { action: 'triggerZapper' }).catch(() => {
      // If script not loaded, inject it
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/element-zapper.js']
      }).catch(() => {});
    });
  } else if (info.menuItemId === 'ampblock_toggle_allow') {
    const domain = extractHostname(tab.url);
    if (!domain) return;

    const { whitelistedDomains = [] } = await chrome.storage.local.get(['whitelistedDomains']);
    let updated;
    if (whitelistedDomains.includes(domain)) {
      updated = whitelistedDomains.filter(d => d !== domain);
    } else {
      updated = [...whitelistedDomains, domain];
    }
    await chrome.storage.local.set({ whitelistedDomains: updated });
    await syncDynamicRules();
    chrome.tabs.reload(tab.id);
  } else if (info.menuItemId === 'ampblock_settings') {
    chrome.runtime.openOptionsPage();
  }
});

// Sync DNR rules based on whitelisted domains
async function syncDynamicRules() {
  const { isEnabled = true, whitelistedDomains = [] } = await chrome.storage.local.get([
    'isEnabled',
    'whitelistedDomains'
  ]);

  try {
    if (!isEnabled) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: ['ruleset_1']
      });
      const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
      const oldRuleIds = oldRules.map(r => r.id);
      if (oldRuleIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: oldRuleIds });
      }
      return;
    } else {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: ['ruleset_1']
      });
    }
  } catch (err) {
    console.error('Error toggling rulesets:', err);
  }

  // Build whitelist override rules
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map(r => r.id);

    const newRules = [];
    let ruleId = 10000;

    for (const domain of whitelistedDomains) {
      if (!domain) continue;
      newRules.push({
        id: ruleId++,
        priority: 100,
        action: { type: 'allow' },
        condition: {
          initiatorDomains: [domain],
          resourceTypes: [
            'script',
            'image',
            'xmlhttprequest',
            'sub_frame',
            'ping',
            'media',
            'other'
          ]
        }
      });
    }

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds,
      addRules: newRules
    });
  } catch (err) {
    console.error('Failed to sync dynamic whitelist rules:', err);
  }
}

// Update Badge for a tab
function updateTabBadge(tabId, count) {
  if (!tabId || tabId < 0) return;
  try {
    const text = count > 0 ? (count > 999 ? '999+' : String(count)) : '';
    chrome.action.setBadgeText({ text, tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#00f2fe', tabId });
  } catch (e) {}
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { action } = request;

  if (action === 'getSiteStatus') {
    const domain = (request.domain || '').toLowerCase();
    chrome.storage.local.get(['isEnabled', 'whitelistedDomains']).then(({ isEnabled = true, whitelistedDomains = [] }) => {
      const isWhitelisted = whitelistedDomains.includes(domain);
      sendResponse({ enabled: isEnabled, isWhitelisted });
    });
    return true;
  }

  if (action === 'reportBlockedAds') {
    const tabId = sender.tab ? sender.tab.id : null;
    const increment = Number(request.increment) || 1;

    if (tabId) {
      const current = (tabStats.get(tabId) || 0) + increment;
      tabStats.set(tabId, current);
      updateTabBadge(tabId, current);
    }

    chrome.storage.local.get(['totalBlocked']).then(({ totalBlocked = 0 }) => {
      chrome.storage.local.set({ totalBlocked: totalBlocked + increment });
    });

    sendResponse({ success: true });
    return false;
  }

  if (action === 'getPopupData') {
    const tabId = request.tabId;
    const domain = (request.domain || '').toLowerCase();

    chrome.storage.local.get(['isEnabled', 'whitelistedDomains', 'totalBlocked']).then((data) => {
      const isEnabled = typeof data.isEnabled === 'boolean' ? data.isEnabled : true;
      const whitelistedDomains = data.whitelistedDomains || [];
      const totalBlocked = data.totalBlocked || 0;
      const isWhitelisted = whitelistedDomains.includes(domain);
      const pageBlocked = tabId ? (tabStats.get(tabId) || 0) : 0;

      sendResponse({
        isEnabled,
        isWhitelisted,
        pageBlocked,
        totalBlocked,
        domain,
        whitelistedDomains
      });
    });
    return true;
  }

  if (action === 'saveCustomBlockedSelector') {
    const { domain, selector } = request;
    if (domain && selector) {
      chrome.storage.local.get(['customBlockedSelectors'], (data) => {
        const customRules = data.customBlockedSelectors || {};
        if (!customRules[domain]) {
          customRules[domain] = [];
        }
        if (!customRules[domain].includes(selector)) {
          customRules[domain].push(selector);
          chrome.storage.local.set({ customBlockedSelectors: customRules });
        }
      });
    }
    sendResponse({ success: true });
    return false;
  }

  if (action === 'toggleGlobal') {
    chrome.storage.local.get(['isEnabled']).then(async ({ isEnabled = true }) => {
      const newState = !isEnabled;
      await chrome.storage.local.set({ isEnabled: newState });
      await syncDynamicRules();

      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'statusChanged',
              enabled: newState,
              isWhitelisted: false
            }).catch(() => {});
            if (!newState) {
              chrome.action.setBadgeText({ text: 'OFF', tabId: tab.id });
              chrome.action.setBadgeBackgroundColor({ color: '#666666', tabId: tab.id });
            } else {
              const c = tabStats.get(tab.id) || 0;
              updateTabBadge(tab.id, c);
            }
          }
        }
      });

      sendResponse({ isEnabled: newState });
    });
    return true;
  }

  if (action === 'toggleWhitelist') {
    const domain = (request.domain || '').toLowerCase();
    if (!domain) {
      sendResponse({ error: 'Invalid domain' });
      return false;
    }

    chrome.storage.local.get(['whitelistedDomains']).then(async ({ whitelistedDomains = [] }) => {
      let updatedList;
      let isNowWhitelisted;

      if (whitelistedDomains.includes(domain)) {
        updatedList = whitelistedDomains.filter(d => d !== domain);
        isNowWhitelisted = false;
      } else {
        updatedList = [...whitelistedDomains, domain];
        isNowWhitelisted = true;
      }

      await chrome.storage.local.set({ whitelistedDomains: updatedList });
      await syncDynamicRules();

      if (request.tabId) {
        if (isNowWhitelisted) {
          tabStats.set(request.tabId, 0);
          chrome.action.setBadgeText({ text: 'PASS', tabId: request.tabId });
          chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId: request.tabId });
        }
      }

      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          if (extractHostname(tab.url) === domain) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'statusChanged',
              enabled: true,
              isWhitelisted: isNowWhitelisted
            }).catch(() => {});
          }
        }
      });

      sendResponse({ isWhitelisted: isNowWhitelisted, whitelistedDomains: updatedList });
    });
    return true;
  }

  if (action === 'removeWhitelistDomain') {
    const domain = (request.domain || '').toLowerCase();
    chrome.storage.local.get(['whitelistedDomains']).then(async ({ whitelistedDomains = [] }) => {
      const updated = whitelistedDomains.filter(d => d !== domain);
      await chrome.storage.local.set({ whitelistedDomains: updated });
      await syncDynamicRules();
      sendResponse({ success: true, whitelistedDomains: updated });
    });
    return true;
  }

  if (action === 'addWhitelistDomain') {
    const domain = (request.domain || '').toLowerCase().trim();
    if (!domain) {
      sendResponse({ success: false, error: 'Empty domain' });
      return false;
    }
    chrome.storage.local.get(['whitelistedDomains']).then(async ({ whitelistedDomains = [] }) => {
      if (!whitelistedDomains.includes(domain)) {
        whitelistedDomains.push(domain);
        await chrome.storage.local.set({ whitelistedDomains });
        await syncDynamicRules();
      }
      sendResponse({ success: true, whitelistedDomains });
    });
    return true;
  }

  if (action === 'resetStats') {
    chrome.storage.local.set({ totalBlocked: 0 }, () => {
      tabStats.clear();
      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          if (tab.id) updateTabBadge(tab.id, 0);
        }
      });
      sendResponse({ success: true });
    });
    return true;
  }
});

// Clean up tabs on close
chrome.tabs.onRemoved.addListener((tabId) => {
  tabStats.delete(tabId);
});

// Reset count when tab navigates to a new page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    tabStats.set(tabId, 0);
    chrome.action.setBadgeText({ text: '', tabId });
  }
});
