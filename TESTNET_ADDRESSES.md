# Generated testnet addresses

These were created via `sui client new-address ed25519` and already exist
in the sui CLI's keystore on the machine that generated them. If you're
running the CLI commands on a *different* machine, you'll need to either
re-run `sui client new-address ed25519` there (creates fresh addresses),
or import these two via their recovery phrases if you saved them from the
chat that generated this zip.

| Role      | Alias           | Address                                                              |
|-----------|-----------------|-----------------------------------------------------------------------|
| Sender    | bold-sapphire   | 0xb084e9aafd67c498d0134f05075494f975de7afb2254a0384b10c4be6f9ee1ea    |
| Recipient | trusting-jasper | 0xec60af929b6ed7e9ce2a0470e9a5e489c13374f79c83348f84404a8cbc3c9af1    |

Active environment: testnet
Active address: bold-sapphire (sender)

## Next steps (from README.md)

1. Fund both addresses at https://faucet.sui.io (select Testnet).
2. `sui client balance` (on each address) to confirm funds landed.
3. `cd move/escrow && sui move build && sui client publish --gas-budget 100000000`
4. Copy the Package ID into `frontend/src/App.tsx` (`PACKAGE_ID`).
5. `cd frontend && npm install && npm run dev`

Full walkthrough, including the CLI-only fallback demo, is in README.md.
