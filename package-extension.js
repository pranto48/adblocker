/**
 * ==============================================================================
 * # Copyright (c) 2026 IT support BD (https://itsupport.com.bd)
 * # Made By Arif (https://arifmahmud.com/)
 * # Project: AmpBlock Pro
 * ==============================================================================
 *
 * Packaging script: Creates a clean, cross-platform AmpBlock-Pro.zip
 * with standard forward-slash paths for the website downloads folder.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = __dirname;
const outputDir = path.join(rootDir, 'AmpBlock-web', 'downloads');
const outputFile = path.join(outputDir, 'AmpBlock-Pro.zip');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read version from manifest.json
const manifestPath = path.join(rootDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifest.version;

console.log(`📦 Packaging AmpBlock Pro v${version}...`);

// Generate version.json for the website
const versionInfo = {
  name: "AmpBlock Pro",
  version: version,
  releaseDate: "2026-09-26",
  downloadUrl: "https://ampblock.itsupport.com.bd/downloads/AmpBlock-Pro.zip",
  fileSize: "75 KB",
  manifestVersion: 3,
  changelog: [
    "Fixed Google & Facebook OAuth login compatibility (no blocked auth popups)",
    "Fixed Trusted Site whitelist bypass for SSO and popups",
    "Dynamic cosmetic CSS injection - no leftover layout breaks when ads are allowed",
    "Safe Bot-Verification for reCAPTCHA and Cloudflare Turnstile",
    "Auto-reload on whitelist toggle for instant results",
    "High-priority DNR dynamic rules for authentication providers"
  ]
};

fs.writeFileSync(
  path.join(rootDir, 'AmpBlock-web', 'version.json'),
  JSON.stringify(versionInfo, null, 2),
  'utf8'
);
console.log('✅ Generated AmpBlock-web/version.json');

// Write a clean temporary PowerShell script to create the zip file with forward-slash entry names
const tempPsScript = path.join(rootDir, '_build_zip.ps1');
const psContent = `
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPath = "${outputFile.replace(/\\/g, '\\\\')}"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
$baseDir = (Get-Item -LiteralPath .).FullName

$items = @('manifest.json', 'README.md', 'background', 'content', 'icons', 'options', 'popup', 'rules')

foreach ($item in $items) {
    $fullPath = Join-Path $baseDir $item
    if (Test-Path $fullPath -PathType Leaf) {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $fullPath, $item, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    } elseif (Test-Path $fullPath -PathType Container) {
        $files = Get-ChildItem -Path $fullPath -Recurse -File
        foreach ($file in $files) {
            $relPath = $file.FullName.Substring($baseDir.Length + 1).Replace('\\', '/')
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $relPath, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
    }
}

$zip.Dispose()
$size = (Get-Item $zipPath).Length
Write-Host "Zip created successfully: $size bytes"
`;

fs.writeFileSync(tempPsScript, psContent, 'utf8');

try {
  const run = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tempPsScript], {
    encoding: 'utf8'
  });

  if (run.error || run.status !== 0) {
    console.error('PowerShell error:', run.stderr || run.error);
    process.exit(1);
  }

  console.log('✅', run.stdout.trim());
  console.log(`🎉 AmpBlock Pro v${version} package ready at: AmpBlock-web/downloads/AmpBlock-Pro.zip`);
} finally {
  if (fs.existsSync(tempPsScript)) {
    fs.unlinkSync(tempPsScript);
  }
}
