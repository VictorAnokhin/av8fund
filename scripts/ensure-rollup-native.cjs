#!/usr/bin/env node
/**
 * Work around npm optional-dependency bugs (e.g. github.com/npm/cli/issues/4828):
 * Rollup loads @rollup/rollup-linux-*-gnu at runtime; npm sometimes skips it in Docker.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

if (process.platform !== 'linux') {
  process.exit(0);
}

let version;
try {
  version = require(path.join(root, 'node_modules', 'rollup', 'package.json')).version;
} catch {
  process.exit(0);
}

const arch =
  process.arch === 'arm64'
    ? 'arm64'
    : process.arch === 'x64'
      ? 'x64'
      : null;

if (!arch) {
  process.exit(0);
}

const scoped = `@rollup/rollup-linux-${arch}-gnu`;
const installed = path.join(root, 'node_modules', scoped, 'package.json');

if (fs.existsSync(installed)) {
  process.exit(0);
}

const spec = `${scoped}@${version}`;
try {
  execSync(`npm install --no-save ${spec}`, {
    cwd: root,
    stdio: 'inherit',
  });
} catch (e) {
  console.error(`[ensure-rollup-native] Failed to install ${spec}`);
  process.exit(1);
}
