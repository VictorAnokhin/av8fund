# Debian-based Node (glibc). Optional Rollup binaries are enforced via npm postinstall
# (scripts/ensure-rollup-native.cjs) so bind-mounted + volume node_modules still get the right @rollup/* package.
# The full bookworm image includes python3/make/g++ for node-gyp without requiring apt-get during local builds.
FROM node:24-bookworm

WORKDIR /app

COPY package*.json ./
# postinstall needs this script before full COPY (layer cache friendly)
COPY scripts/ensure-rollup-native.cjs ./scripts/ensure-rollup-native.cjs

RUN npm install && npm cache clean --force

COPY . .

EXPOSE 3003

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3003"]
