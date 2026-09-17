/**
 * ==============================================================================
 * # Copyright (c) 2026 IT support BD (https://itsupport.com.bd)
 * # Made By Arif (https://arifmahmud.com/)
 * # Project: AmpBlock
 * ==============================================================================
 */

// Script to generate rules/rules.json with high-efficiency DNR rules
const fs = require('fs');
const path = require('path');

const adDomains = [
  "googleads.g.doubleclick.net",
  "pagead2.googlesyndication.com",
  "adservice.google.com",
  "pubads.g.doubleclick.net",
  "securepubads.g.doubleclick.net",
  "static.doubleclick.net",
  "ad.doubleclick.net",
  "stats.g.doubleclick.net",
  "cm.g.doubleclick.net",
  "amazon-adsystem.com",
  "aax.amazon-adsystem.com",
  "c.amazon-adsystem.com",
  "fls-na.amazon-adsystem.com",
  "adnxs.com",
  "ib.adnxs.com",
  "secure.adnxs.com",
  "criteo.com",
  "static.criteo.net",
  "dis.criteo.com",
  "rubiconproject.com",
  "fastclick.net",
  "casalemedia.com",
  "openx.net",
  "us-u.openx.net",
  "outbrain.com",
  "widgets.outbrain.com",
  "taboola.com",
  "trc.taboola.com",
  "media.net",
  "contextweb.com",
  "adroll.com",
  "d.adroll.com",
  "adcolony.com",
  "quantserve.com",
  "pixel.quantserve.com",
  "scorecardresearch.com",
  "sb.scorecardresearch.com",
  "popads.net",
  "serve.popads.net",
  "popcash.net",
  "propellerads.com",
  "exoclick.com",
  "trafficjunky.com",
  "adsterra.com",
  "adtrue.com",
  "moatads.com",
  "smartadserver.com",
  "sharethrough.com",
  "bidswitch.net",
  "revcontent.com",
  "zergnet.com",
  "adform.net",
  "infolinks.com",
  "chitika.net",
  "tribalfusion.com",
  "sovrn.com",
  "lijit.com",
  "advertising.com",
  "an.yandex.ru",
  "coinhive.com",
  "coin-hive.com",
  "minr.pw",
  "crypto-loot.com",
  "yieldmo.com",
  "teads.tv",
  "gumgum.com",
  "sonobi.com",
  "triplelift.com",
  "nativo.com",
  "undertone.com",
  "connatix.com",
  "adblade.com",
  "adkernel.com",
  "adpushup.com",
  "adbutler.com",
  "buysellads.com",
  "carbonads.net",
  "admanmedia.com",
  "mgid.com",
  "richaudience.com"
];

const resourceTypes = [
  "script",
  "image",
  "xmlhttprequest",
  "sub_frame",
  "ping",
  "media",
  "other"
];

const rules = [];
let idCounter = 1;

for (const domain of adDomains) {
  rules.push({
    id: idCounter++,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: resourceTypes
    }
  });
}

// Add common script & banner URL pattern rules
const urlPatterns = [
  "*/adsbygoogle.js*",
  "*/pagead/js/*",
  "*://*/*ad-manager*.js*",
  "*://*/*adserver*.js*",
  "*://*/*popunder*.js*",
  "*://*/*advertisement*.js*"
];

for (const pattern of urlPatterns) {
  rules.push({
    id: idCounter++,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: pattern,
      resourceTypes: ["script", "xmlhttprequest", "sub_frame"]
    }
  });
}

const outputPath = path.join(__dirname, 'rules', 'rules.json');
fs.writeFileSync(outputPath, JSON.stringify(rules, null, 2), 'utf-8');
console.log(`Generated ${rules.length} DNR rules in ${outputPath}`);
