# Payment Escrow — Sui Track 01 (Payments & Stablecoins)

A minimal escrow: a sender locks a coin for a named recipient. The
recipient claims it with `release`; the sender can reclaim it with
`cancel` any time before that. Works with native testnet SUI or any
`Coin<T>` — including testnet USDC, see below.

```
move/escrow/        Move smart contract
frontend/            React + Vite UI (connect wallet, lock/release/cancel)
```

Do the CLI setup first — it's also your safety-net demo recording if the
wallet/frontend flow isn't reliable live tomorrow.

## 0. Prerequisites

- Sui CLI: `brew install sui` (macOS), or download a binary from
  https://github.com/MystenLabs/sui/releases, or `cargo install --locked
  --git https://github.com/MystenLabs/sui.git --branch testnet sui`.
  Verify: `sui --version`.
- Node.js 18+ and npm, for the frontend.
- Do NOT touch mainnet or real funds — hackathon rules disqualify mainnet
  deployment with real funds during the hacking period. Testnet only.

## 1. Set up two testnet addresses (sender + recipient)

You need two addresses so you can demo both sides of the flow.

```bash
sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443
sui client switch --env testnet

sui client new-address ed25519   # this becomes your "sender" — note the address
sui client new-address ed25519   # this becomes your "recipient" — note the address

sui client addresses              # list both, confirm you have two
```

## 2. Fund both addresses from the faucet

The CLI faucet command now just points you to the web faucet — go to
**https://faucet.sui.io**, select Testnet, paste each address, and request
tokens for both the sender and recipient address.

```bash
sui client balance   # confirm funds landed on the active address
```

## 3. Build and publish the contract

```bash
cd move/escrow
sui client switch --address <SENDER_ADDRESS>
sui move build
sui client publish --gas-budget 100000000
```

From the output, copy the **Package ID** (under "Published Objects" /
"PackageID"). You'll need it in both the CLI commands below and in
`frontend/src/App.tsx`.

## 4. Fast path: CLI-only demo (recommended for your fallback recording)

This proves the whole flow works without depending on a browser wallet
extension — safest thing to have in your back pocket for tomorrow.

**Create the escrow, as the sender.** `create_escrow` takes a `Coin<T>` by
value, so first split off a coin of the amount you want to lock:

```bash
sui client switch --address <SENDER_ADDRESS>
sui client gas   # pick a coin object ID with enough balance

sui client split-coin --coin-id <GAS_COIN_ID> --amounts 500000000 --gas-budget 100000000
# 500000000 MIST = 0.5 SUI. Copy the new coin's object ID from the output.

sui client call \
  --package <PACKAGE_ID> --module payment_escrow --function create_escrow \
  --type-args 0x2::sui::SUI \
  --args <SPLIT_COIN_ID> <RECIPIENT_ADDRESS> \
  --gas-budget 100000000
```

Copy the new **Escrow** object's ID from "Created Objects" in the output.

**Release, as the recipient:**

```bash
sui client switch --address <RECIPIENT_ADDRESS>
sui client call \
  --package <PACKAGE_ID> --module payment_escrow --function release \
  --type-args 0x2::sui::SUI \
  --args <ESCROW_OBJECT_ID> \
  --gas-budget 100000000

sui client balance   # confirm the recipient received the funds
```

**Or cancel, as the sender** (instead of release, to show the refund path):

```bash
sui client switch --address <SENDER_ADDRESS>
sui client call \
  --package <PACKAGE_ID> --module payment_escrow --function cancel \
  --type-args 0x2::sui::SUI \
  --args <ESCROW_OBJECT_ID> \
  --gas-budget 100000000
```

Screen-record this sequence the moment it works — it's your fallback demo
video if the frontend has issues later.

## 5. Full path: the frontend

```bash
cd frontend
npm install
```

Open `frontend/src/App.tsx` and set:

```ts
const PACKAGE_ID = '<PACKAGE_ID from step 3>';
```

```bash
npm run dev
```

Open the printed localhost URL. You'll need a Sui wallet browser extension
(Sui Wallet or Slush) installed, switched to Testnet, importing or funding
the same sender/recipient addresses from step 1–2 — or just connect
whatever testnet wallet you have and use its address as sender/recipient
instead of the CLI addresses.

Flow in the UI:
1. Connect wallet (as sender).
2. Enter the recipient's address and an amount, click **Lock funds**. The
   escrow object ID appears once the transaction confirms.
3. Switch the wallet extension to the recipient's account (or open a
   second browser profile), paste the escrow ID, click **Release**.

## 6. Using a real stablecoin instead of SUI (optional, if time allows)

Track 01 is literally "Payments & Stablecoins" — using SUI is fine for a
fast demo, but a real stablecoin scores closer to the track's intent if
you have 15 minutes to spare. Sui's testnet USDC contract:

```
0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC
```

To use it: get testnet USDC from Circle's faucet, then change `COIN_TYPE`
in `App.tsx` (and `--type-args` in the CLI commands) from
`0x2::sui::SUI` to the address above. The contract itself needs no
changes — it's generic over `Coin<T>`. Don't attempt this until the SUI
version is already working end to end; it's a nice-to-have, not required.

## 7. Before you submit on Devfolio (deadline 11:59 PM MYT tonight)

- Public GitHub repo with this code, commit history starting no earlier
  than 26 Aug 2026.
- README covering: description, problem, blockchain used (Sui), **this
  testnet Package ID**, setup/install instructions, team members.
- 3–5 minute demo video (YouTube or Loom, unlisted is fine) — the CLI
  sequence from step 4 is a perfectly valid demo if the frontend isn't
  ready; showing a real transaction on testnet is what's being judged.
- Declaration of every AI tool used to build this.
