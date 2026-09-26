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

  // DevOps Sentinel Elements
  const sentinelMasterToggle = document.getElementById('sentinelMasterToggle');
  const threatsTableBody = document.getElementById('threatsTableBody');
  const exportThreatsBtn = document.getElementById('exportThreatsBtn');
  const clearThreatsBtn = document.getElementById('clearThreatsBtn');

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
      ['isEnabled', 'whitelistedDomains', 'customBlockedSelectors', 'totalBlocked', 'sentinelEnabled', 'threatIncidents', 'threatsBlockedTotal'],
      (data) => {
        const isEnabled = typeof data.isEnabled === 'boolean' ? data.isEnabled : true;
        const whitelistedDomains = data.whitelistedDomains || [];
        const customRules = data.customBlockedSelectors || {};
        const sentinelEnabled = typeof data.sentinelEnabled === 'boolean' ? data.sentinelEnabled : true;
        const threatIncidents = data.threatIncidents || [];

        globalEngineToggle.checked = isEnabled;
        if (sentinelMasterToggle) sentinelMasterToggle.checked = sentinelEnabled;

        renderWhitelistTable(whitelistedDomains);
        renderZapperRules(customRules);
        renderThreatsTable(threatIncidents);
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

  // Render DevOps Threat Incident Table
  function renderThreatsTable(incidents) {
    if (!threatsTableBody) return;
    threatsTableBody.innerHTML = '';

    if (!incidents || incidents.length === 0) {
      threatsTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; color: #64748b; padding: 22px;">
            কোনো ক্ষতিকারক বা অস্বাভাবিক আচরণের ঘটনা এখনো রেকর্ড হয়নি। সমস্ত সাইট নিরাপদ!
          </td>
        </tr>
      `;
      return;
    }

    incidents.forEach((inc) => {
      const tr = document.createElement('tr');
      const timeStr = inc.timestamp ? new Date(inc.timestamp).toLocaleTimeString() : 'N/A';

      tr.innerHTML = `
        <td style="font-family: monospace; font-size: 11px; color: #94a3b8;">${timeStr}</td>
        <td style="font-weight: 700; color: #ffffff;">${inc.domain || 'Unknown'}</td>
        <td>
          <span style="font-family: monospace; font-weight: 800; color: #f43f5e; background: rgba(244,63,94,0.15); padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(244,63,94,0.3);">
            ${inc.threatScore}/100 [CRITICAL]
          </span>
        </td>
        <td style="font-family: monospace; font-size: 11px; color: #38bdf8;">
          ${(inc.violationsSummary || []).join(', ') || `${inc.violationsCount || 1} Vectors`}
        </td>
        <td>
          <span style="background: rgba(244,63,94,0.2); color: #f87171; border: 1px solid rgba(244,63,94,0.4); padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 800;">
            QUARANTINED
          </span>
        </td>
      `;
      threatsTableBody.appendChild(tr);
    });
  }

  // Sentinel Master Toggle Event
  if (sentinelMasterToggle) {
    sentinelMasterToggle.addEventListener('change', () => {
      chrome.runtime.sendMessage({ action: 'toggleSentinel' }, (res) => {
        if (res) {
          showNotification(res.sentinelEnabled ? 'DevOps Security Sentinel Activated.' : 'DevOps Security Sentinel Deactivated.');
        }
      });
    });
  }

  // Export Threat Incident Audit Log (JSON)
  if (exportThreatsBtn) {
    exportThreatsBtn.addEventListener('click', () => {
      chrome.storage.local.get(['threatIncidents', 'threatsBlockedTotal'], (data) => {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
        const a = document.createElement('a');
        a.setAttribute('href', dataStr);
        a.setAttribute('download', `ampblock_threat_audit_${Date.now()}.json`);
        document.body.appendChild(a);
        a.click();
        a.remove();
        showNotification('Threat audit log exported successfully!');
      });
    });
  }

  // Clear Threat Incidents
  if (clearThreatsBtn) {
    clearThreatsBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all recorded threat incidents?')) {
        chrome.runtime.sendMessage({ action: 'clearThreatIncidents' }, (res) => {
          if (res && res.success) {
            renderThreatsTable([]);
            showNotification('Threat incidents log cleared.');
          }
        });
      }
    });
  }

  // Extension Version & Update Checker
  const currentVersionBadge = document.getElementById('currentVersionBadge');
  const checkUpdateBtn = document.getElementById('checkUpdateBtn');
  const updateStatusBox = document.getElementById('updateStatusBox');

  const currentVer = (chrome.runtime && chrome.runtime.getManifest) ? chrome.runtime.getManifest().version : '1.4.0';
  if (currentVersionBadge) {
    currentVersionBadge.textContent = 'v' + currentVer;
  }

  if (checkUpdateBtn) {
    checkUpdateBtn.addEventListener('click', async () => {
      checkUpdateBtn.disabled = true;
      checkUpdateBtn.textContent = 'Checking...';
      updateStatusBox.style.display = 'block';
      updateStatusBox.innerHTML = '<span style="color:#00f2fe;">Checking https://ampblock.itsupport.com.bd for updates...</span>';

      try {
        const res = await fetch('https://ampblock.itsupport.com.bd/version.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const remoteData = await res.json();
        const latestVer = remoteData.version || '1.4.0';

        if (latestVer !== currentVer) {
          updateStatusBox.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
              <div>
                <strong style="color:#10b981;">🎉 New Update Available: v${latestVer}</strong> (Installed: v${currentVer})
                <div style="margin-top:6px; font-size:12px; color:#cbd5e1;">${(remoteData.changelog || []).join(' • ')}</div>
              </div>
              <a href="https://ampblock.itsupport.com.bd/downloads/AmpBlock-Pro.zip" class="primary-btn" style="text-decoration:none; padding:6px 14px; font-size:12px;">📥 Download v${latestVer} (.ZIP)</a>
            </div>
          `;
        } else {
          updateStatusBox.innerHTML = `
            <span style="color:#10b981;">✅ You are running the latest version of AmpBlock Pro (v${currentVer}). No updates needed!</span>
          `;
        }
      } catch (err) {
        updateStatusBox.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <span>Current version is <strong>v${currentVer}</strong>. (Server check status: Offline or DNS pending)</span>
            <a href="https://ampblock.itsupport.com.bd/download.html" target="_blank" class="action-btn" style="text-decoration:none; padding:4px 10px; font-size:12px;">Visit Download Center</a>
          </div>
        `;
      } finally {
        checkUpdateBtn.disabled = false;
        checkUpdateBtn.textContent = '🔄 Check for Updates';
      }
    });
  }

  loadDashboard();
});
