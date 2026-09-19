/**
 * ==============================================================================
 * # Copyright (c) 2026 IT support BD (https://itsupport.com.bd)
 * # Made By Arif (https://arifmahmud.com/)
 * # Project: AmpBlock
 * ==============================================================================
 *
 * AmpBlock - Options Dashboard Logic (English)
 * Manages engine toggles, whitelist domains, custom zapper rules, backup, and restore.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const globalEngineToggle = document.getElementById('globalEngineToggle');
  const youtubeBusterToggle = document.getElementById('youtubeBusterToggle');
  const cosmeticFilterToggle = document.getElementById('cosmeticFilterToggle');
  const whitelistInput = document.getElementById('whitelistInput');
  const addWhitelistBtn = document.getElementById('addWhitelistBtn');
  const whitelistTableBody = document.getElementById('whitelistTableBody');
  const zapperRulesList = document.getElementById('zapperRulesList');
  const exportSettingsBtn = document.getElementById('exportSettingsBtn');
  const importSettingsInput = document.getElementById('importSettingsInput');
  const resetStatsBtn = document.getElementById('resetStatsBtn');
  const statusNotification = document.getElementById('statusNotification');

  function showNotification(msg, isError = false) {
    statusNotification.textContent = msg;
    statusNotification.style.color = isError ? '#f43f5e' : '#10b981';
    statusNotification.style.display = 'block';
    setTimeout(() => {
      statusNotification.style.display = 'none';
    }, 3500);
  }

  // Load all settings
  function loadDashboard() {
    chrome.storage.local.get(
      ['isEnabled', 'whitelistedDomains', 'customBlockedSelectors', 'totalBlocked'],
      (data) => {
        const isEnabled = typeof data.isEnabled === 'boolean' ? data.isEnabled : true;
        const whitelistedDomains = data.whitelistedDomains || [];
        const customRules = data.customBlockedSelectors || {};

        globalEngineToggle.checked = isEnabled;

        renderWhitelistTable(whitelistedDomains);
        renderZapperRules(customRules);
      }
    );
  }

  // Render Whitelist Table
  function renderWhitelistTable(domains) {
    whitelistTableBody.innerHTML = '';
    if (domains.length === 0) {
      whitelistTableBody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align:center; color: #64748b; padding: 20px;">
            No websites currently in the whitelist.
          </td>
        </tr>
      `;
      return;
    }

    domains.forEach((domain) => {
      const tr = document.createElement('tr');

      const tdDomain = document.createElement('td');
      tdDomain.textContent = domain;
      tdDomain.style.fontWeight = '500';

      const tdStatus = document.createElement('td');
      tdStatus.innerHTML = '<span class="table-badge">Allowed</span>';

      const tdAction = document.createElement('td');
      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.innerHTML = '🗑️ Remove';
      delBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'removeWhitelistDomain', domain }, (res) => {
          if (res && res.success) {
            renderWhitelistTable(res.whitelistedDomains);
            showNotification(`'${domain}' removed from whitelist.`);
          }
        });
      });

      tdAction.appendChild(delBtn);
      tr.appendChild(tdDomain);
      tr.appendChild(tdStatus);
      tr.appendChild(tdAction);
      whitelistTableBody.appendChild(tr);
    });
  }

  // Render Custom Zapper Rules
  function renderZapperRules(rulesObj) {
    zapperRulesList.innerHTML = '';
    const domains = Object.keys(rulesObj);

    if (domains.length === 0 || domains.every(d => !rulesObj[d] || rulesObj[d].length === 0)) {
      zapperRulesList.innerHTML = `
        <div style="text-align:center; color: #64748b; padding: 15px; font-size: 12px;">
          No custom elements zapped yet. Use the 'Element Zapper' from the extension popup while browsing!
        </div>
      `;
      return;
    }

    domains.forEach((domain) => {
      const selectors = rulesObj[domain] || [];
      if (selectors.length === 0) return;

      const group = document.createElement('div');
      group.className = 'zapper-domain-group';

      const title = document.createElement('div');
      title.className = 'zapper-domain-title';
      title.textContent = `🌐 ${domain} (${selectors.length} rules)`;

      const tagList = document.createElement('div');
      tagList.className = 'zapper-tag-list';

      selectors.forEach((sel) => {
        const tag = document.createElement('span');
        tag.className = 'zapper-tag';
        tag.textContent = sel;

        const removeSpan = document.createElement('span');
        removeSpan.className = 'tag-remove';
        removeSpan.textContent = '✕';
        removeSpan.title = 'Delete Rule';
        removeSpan.addEventListener('click', () => {
          rulesObj[domain] = rulesObj[domain].filter(s => s !== sel);
          if (rulesObj[domain].length === 0) delete rulesObj[domain];
          chrome.storage.local.set({ customBlockedSelectors: rulesObj }, () => {
            renderZapperRules(rulesObj);
            showNotification(`Rule '${sel}' deleted.`);
          });
        });

        tag.appendChild(removeSpan);
        tagList.appendChild(tag);
      });

      group.appendChild(title);
      group.appendChild(tagList);
      zapperRulesList.appendChild(group);
    });
  }

  // Add domain from input
  addWhitelistBtn.addEventListener('click', () => {
    let domain = whitelistInput.value.trim().toLowerCase();
    try {
      if (domain.startsWith('http')) {
        domain = new URL(domain).hostname;
      }
    } catch (e) {}

    if (!domain) return;

    chrome.runtime.sendMessage({ action: 'addWhitelistDomain', domain }, (res) => {
      if (res && res.success) {
        whitelistInput.value = '';
        renderWhitelistTable(res.whitelistedDomains);
        showNotification(`'${domain}' added to whitelist.`);
      }
    });
  });

  // Toggle Global Engine
  globalEngineToggle.addEventListener('change', () => {
    chrome.runtime.sendMessage({ action: 'toggleGlobal' }, (res) => {
      if (res) {
        showNotification(res.isEnabled ? 'Protection engine enabled.' : 'Protection engine disabled.');
      }
    });
  });

  // Export Settings (JSON)
  exportSettingsBtn.addEventListener('click', () => {
    chrome.storage.local.get(null, (allData) => {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `ampblock_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showNotification('Settings backup downloaded successfully!');
    });
  });

  // Import Settings (JSON)
  importSettingsInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        chrome.storage.local.set(imported, () => {
          loadDashboard();
          showNotification('Settings restored successfully!');
        });
      } catch (err) {
        showNotification('Invalid backup file!', true);
      }
    };
    reader.readAsText(file);
  });

  // Reset Stats
  resetStatsBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all ad blocking statistics to zero?')) {
      chrome.runtime.sendMessage({ action: 'resetStats' }, (res) => {
        if (res && res.success) {
          showNotification('All statistics have been reset.');
        }
      });
    }
  });

  loadDashboard();
});
