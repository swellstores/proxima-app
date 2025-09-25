#!/usr/bin/env node

const { execSync } = require('child_process');

function checkCliVersion() {
  try {
    const output = execSync('swell --version', { encoding: 'utf8', stdio: 'pipe' });
    const match = output.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!match) return;

    const [, major, minor, patch] = match.map(Number);
    const version = `${major}.${minor}.${patch}`;

    // Check if version < 2.0.21
    if (major < 2 || (major === 2 && minor === 0 && patch <= 20)) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  Swell CLI Update Required');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   Current: v${version} | Required: v2.0.21+`);
      console.log('   This project now uses Cloudflare Workers (migrated from Pages)');
      console.log('   Update CLI: npm update -g @swell/cli\n');
    }
  } catch {
    // CLI not installed or error - skip silently
  }
}

if (process.env.CI !== 'true') {
  checkCliVersion();
}