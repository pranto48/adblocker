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
  // Google / DoubleClick / AdSense
  "googleads.g.doubleclick.net",
  "pagead2.googlesyndication.com",
  "adservice.google.com",
  "pubads.g.doubleclick.net",
  "securepubads.g.doubleclick.net",
  "static.doubleclick.net",
  "ad.doubleclick.net",
  "stats.g.doubleclick.net",
  "cm.g.doubleclick.net",
  "adclick.g.doubleclick.net",
  "googleadservices.com",
  "partner.googleadservices.com",
  "www.googleadservices.com",

  // Amazon Ad System
  "amazon-adsystem.com",
  "aax.amazon-adsystem.com",
  "c.amazon-adsystem.com",
  "fls-na.amazon-adsystem.com",
  "s.amazon-adsystem.com",

  // AppNexus / Xandr
  "adnxs.com",
  "ib.adnxs.com",
  "secure.adnxs.com",
  "vcdn.adnxs.com",

  // Criteo
  "criteo.com",
  "static.criteo.net",
  "dis.criteo.com",
  "gum.criteo.com",

  // Major Ad Exchanges
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

  // Pop-up & Pop-under Networks (Torrent & Streaming Specific)
  "popads.net",
  "serve.popads.net",
  "c1.popads.net",
  "c2.popads.net",
  "popcash.net",
  "propellerads.com",
  "ad.propellerads.com",
  "exoclick.com",
  "syndication.exoclick.com",
  "trafficjunky.com",
  "ads.trafficjunky.net",
  "adsterra.com",
  "adtrue.com",
  "clickadu.com",
  "hilltopads.com",
  "monetag.com",
  "richads.com",
  "adcash.com",
  "revenuehits.com",
  "bidvertiser.com",
  "bidgear.com",
  "juicyads.com",
  "eroadvertising.com",
  "popmyads.com",
  "yllix.com",
  "plugrush.com",
  "clicksor.com",
  "pushwoosh.com",
  "onesignal.com",
  "wigetmedia.com",
  "vrtzads.com",
  "adnuntius.delivery",
  "tsyndicate.com",
  "traffichive.com",

  // Verification & Trackers
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
  "richaudience.com",

  // Cryptominers & Malicious Redirectors
  "coinhive.com",
  "coin-hive.com",
  "minr.pw",
  "crypto-loot.com",
  "webminepool.com",
  "coinnebula.com"
];

// CRITICAL: Include 'main_frame' so ad tabs are blocked by the browser!
const resourceTypes = [
  "main_frame",
  "sub_frame",
  "script",
  "image",
  "xmlhttprequest",
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

// Add common script, popunder, and banner URL pattern rules
const urlPatterns = [
  "*/adsbygoogle.js*",
  "*/pagead/js/*",
  "*://*/*ad-manager*.js*",
  "*://*/*adserver*.js*",
  "*://*/*popunder*.js*",
  "*://*/*popupads*.js*",
  "*://*/*advertisement*.js*",
  "*://*/*adservice*.js*",
  "*://*/*taboola*.js*",
  "*://*/*outbrain*.js*",
  "*://*/*propeller*.js*",
  "*://*/*exoclick*.js*",
  "*://*/*clickadu*.js*"
];

for (const pattern of urlPatterns) {
  rules.push({
    id: idCounter++,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: pattern,
      resourceTypes: ["main_frame", "sub_frame", "script", "xmlhttprequest"]
    }
  });
}

const outputPath = path.join(__dirname, 'rules', 'rules.json');
fs.writeFileSync(outputPath, JSON.stringify(rules, null, 2), 'utf-8');
console.log(`Generated ${rules.length} DNR rules with main_frame support in ${outputPath}`);
