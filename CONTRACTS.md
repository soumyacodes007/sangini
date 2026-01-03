# Sangini Smart Contracts

## Deployed Contracts (Testnet)

| Contract         | ID                                                         | Network         |
| ---------------- | ---------------------------------------------------------- | --------------- |
| Invoice Contract | `CAOD7GFA7XTDT6ONOGHVZVOZVITFLSQ7OPNC3Y5VAZ3RXXUJ5ZH6E6AH` | Stellar Testnet |
| Token Contract   | `CAU7GKIL6IMSSPLGUSOOAUW3ZVIQKVGVE3ZCTV2ZKJHUQMTHSFDSQAUV` | Stellar Testnet |

## Build & Deploy

```bash
# Build contracts
cd contracts
cargo build --target wasm32-unknown-unknown --release

# Test contracts
./test-sangini.ps1

# Deploy (replace with your account)
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/sangini_invoice.wasm --source-account alice --network testnet
```

## Test Accounts

- Admin: `GCVO7HCVWKCC34QTNZSJKF2JGEADXNODDTDV4RCA4DVXRI3I6D3KY27H`
- Supplier: `GDCX276WMNPKAHAQ2BKCR6TZ6FYUMW5DZTUPPJOMQIIM7B4SULMUQ5DJ`
- Buyer: `GDW5RZPMMMCEM2X3G2VBCQWF2HD724E3G3QAFMKLIKOYVASJYAO7ZZDM`
- Investor: `GCUM5BYT2DLUDUE7QAYKT7VNCT6M2BJSBUBZHQXFLYCDGZJKTNM5WODJ`
