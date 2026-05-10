# AV8 Capital Testnet Deploy

This runbook assumes the package root is `av8fund-react/` and the active network is Sui testnet.

## 1. Prepare CLI

Check the active network and address:

```bash
sui client active-env
sui client active-address
```

If testnet is not configured yet:

```bash
sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443
sui client switch --env testnet
```

Fund the active address:

```bash
sui client faucet
sui client gas
```

## 2. Build and publish

From the package root:

```bash
cd av8fund-react
sui move build
sui client publish --gas-budget 100000000
```

Record these values from the publish output:

- `PACKAGE_ID`
- `basket` shared object ID created by `portfolio::init`
- `registry` shared object ID created by `assets_registry::init`
- `manager_cap` owned object ID transferred to the publisher
- `owner_cap` owned object ID transferred to the publisher

The package has module initializers, so `Basket`, `Registry`, `ManagerCap`, and `OwnerCap` are created during publish.

## 3. Create the first investor position

```bash
sui client call \
  --package PACKAGE_ID \
  --module portfolio \
  --function open_position \
  --gas-budget 30000000
```

Record the new `POSITION_ID` from the transaction output.

## 4. Split a SUI coin for the first deposit

Find a gas coin:

```bash
sui client gas
```

Split one coin so the wallet has a separate payment object for deposit:

```bash
sui client split-coin \
  --coin-id GAS_COIN_ID \
  --amounts 1000000000 \
  --gas-budget 30000000
```

Record the newly created `DEPOSIT_COIN_ID`.

## 5. Deposit into the basket

`registry` and `basket` are shared objects, `position` and `payment` are owned objects.

```bash
sui client call \
  --package PACKAGE_ID \
  --module portfolio \
  --function deposit \
  --args REGISTRY_ID BASKET_ID POSITION_ID DEPOSIT_COIN_ID \
  --gas-budget 50000000
```

## 6. Initialize strategy settings

```bash
sui client call \
  --package PACKAGE_ID \
  --module strategy_manager \
  --function init_strategy \
  --args MANAGER_CAP_ID BASKET_ID 60000 300 2500 \
  --gas-budget 50000000
```

Arguments:

- `60000`: max oracle age in milliseconds for the MVP stub
- `300`: max slippage in basis points
- `2500`: max trade size in basis points

Record the returned `STRATEGY_ID`.

## 7. Configure frontend env

Add these values to your Vite env file:

```bash
VITE_SUI_NETWORK=testnet
VITE_SUI_RPC_URL=https://fullnode.testnet.sui.io:443
VITE_SUI_PACKAGE_ID=PACKAGE_ID
VITE_SUI_BASKET_ID=BASKET_ID
VITE_SUI_STRATEGY_ID=STRATEGY_ID
VITE_SUI_POSITION_ID=POSITION_ID
```

## 8. Current MVP limitations

- The deployable package currently accepts only `SUI` deposits.
- `rebalance_stub` is accounting-only and does not execute real swaps.
- The frontend can read `nav_sui` and `sui_vault`, but fallback data still includes richer mock allocations than the on-chain MVP.

## 9. Recommended next engineering step

Replace the `SUI`-only whitelist and accounting stub with:

- bridged or native stablecoin support for testnet
- a real oracle integration
- a real swap adapter module
