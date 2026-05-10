
  # Fintech Investment Platform Design

  This is a code bundle for Fintech Investment Platform Design. The original project is available at https://www.figma.com/design/jS5A5KXg4iklFPwDHKVFOv/Fintech-Investment-Platform-Design.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Sui MVP contract skeleton

  Contract spec:
- `docs/sui-hybrid-index-fund-spec.md`

  Move package skeleton:
- `contracts/sui-hybrid-index-fund`

  Notes:
- This package is an MVP contract baseline for the hybrid index fund design.
- Asset types and rebalance execution are still wired with placeholder/testnet assumptions and need protocol-specific integration before deployment.
- The active deployable Move package is now rooted at `Move.toml` with sources in `sources/`.

  Testnet deployment:
- `docs/testnet-deploy.md`

  ## Sui frontend env

  Add these variables in your Vite env file when switching the dashboard from fallback data to real Sui objects:

- `VITE_SUI_NETWORK=testnet`
- `VITE_SUI_RPC_URL=https://fullnode.testnet.sui.io:443`
- `VITE_SUI_PACKAGE_ID=0x...`
- `VITE_SUI_ADMIN_CAP_ID=0x...`
- `VITE_SUI_RWA_PACKAGE_ID=0x...`
- `VITE_SUI_RWA_ADMIN_CAP_ID=0x...`
- `VITE_SUI_BASKET_ID=0x...`
- `VITE_SUI_STRATEGY_ID=0x...`
- `VITE_SUI_POSITION_ID=0x...`
- `VITE_SUI_GOOGLE_CLIENT_ID=...`

  ## RWA package deployment

  The deployable RWA Move package is mounted into the `sui-tools` container from `../av8_rwa`.

  From this app directory:

- `npm run sui:build:rwa` builds `../av8_rwa` inside Docker.
- `npm run sui:deploy:rwa` publishes `../av8_rwa` to Sui testnet and updates `.env.local` plus `.env.production` with `VITE_SUI_RWA_PACKAGE_ID` and `VITE_SUI_RWA_ADMIN_CAP_ID`.

  The Sui client config is persisted in `../sui-config`. Before publishing, fund the active testnet address shown by:

- `docker compose exec -T sui-tools sui client active-address`

  Current behavior:
- if basket/package IDs are missing, the dashboard still renders using fallback allocation/performance data
- wallet connection is active through Sui dApp Kit
- zkLogin is represented as a readiness slot and requires the real OIDC/proving flow to be added next
  
