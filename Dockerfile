# Debian-based Node (glibc). Optional Rollup binaries are enforced via npm postinstall
# (scripts/ensure-rollup-native.cjs) so bind-mounted + volume node_modules still get the right @rollup/* package.
FROM node:20-bookworm-slim

# Native addons (e.g. bufferutil via ws) need node-gyp: Python + compiler toolchain.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
# postinstall needs this script before full COPY (layer cache friendly)
COPY scripts/ensure-rollup-native.cjs ./scripts/ensure-rollup-native.cjs

RUN npm install && npm cache clean --force

COPY . .

EXPOSE 3003

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3003"]
