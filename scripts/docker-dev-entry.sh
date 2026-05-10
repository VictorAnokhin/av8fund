#!/bin/sh
# Used by docker-compose: /app/node_modules is an anonymous volume, so deps from
# package-lock.json are installed inside the container and verified before Vite starts.
set -e
cd /app

HASH="$( (cat package.json package-lock.json 2>/dev/null || true) | sha256sum | cut -d' ' -f1 )"
STORED="$(cat node_modules/.deps-hash 2>/dev/null || true)"

verify_modules() {
  node -e "Promise.all([import('vite'), import('rollup'), import('viem'), import('ox'), import('jose')]).catch(() => process.exit(1))" >/dev/null 2>&1
  test -f node_modules/@web3auth/ui/dist/lib.esm/packages/ui/src/components/ExternalWallet/ExternalWalletButton.js
}

if [ "$HASH" != "$STORED" ] || ! verify_modules; then
  echo "av8fund-react: installing dependencies with npm ci..."
  npm ci
  node scripts/ensure-rollup-native.cjs
  echo "$HASH" > node_modules/.deps-hash
fi

exec npm run dev -- --host 0.0.0.0 --port 3003
