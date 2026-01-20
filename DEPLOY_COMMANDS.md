# Deploy Your Agent to Weilliptic

## ✅ You're already connected!
```
Connected to: sentinel.unweil.me
```

## 📦 Your agent is built!
```
WASM file: agent/target/wasm32-unknown-unknown/release/invoice_agent.wasm (290 bytes)
WIDL file: agent/invoice_agent.widl
```

## 🚀 Deploy Command

In your Weilliptic CLI, run:

```bash
deploy --file-path agent/target/wasm32-unknown-unknown/release/invoice_agent.wasm --widl-file agent/invoice_agent.widl
```

## 📝 Expected Response

You should see something like:
```json
{
  "status": "success",
  "contract_address": "wei1...",
  "transaction_hash": "0x...",
  "gas_used": 12345
}
```

**IMPORTANT:** Save the `contract_address` - you'll need it!

---

## 🧪 Test Your Agent

After deployment, test it with these commands:

### 1. Initialize the agent
```bash
execute -c <contract_address> -m new
```

Expected result: `0`

### 2. Create an invoice
```bash
execute -c <contract_address> -m create_invoice
```

Expected result: `1` (invoice count)

### 3. Get invoice count
```bash
execute -c <contract_address> -m get_invoice_count
```

Expected result: `1`

### 4. Increment counter
```bash
execute -c <contract_address> -m increment
```

Expected result: `1`

### 5. Get counter value
```bash
execute -c <contract_address> -m get_count
```

Expected result: `1`

### 6. Reset everything
```bash
execute -c <contract_address> -m reset
```

Expected result: `0`

---

## 📋 Full Test Sequence

```bash
# In Weilliptic CLI:
Weilliptic$$$> deploy --file-path agent/target/wasm32-unknown-unknown/release/invoice_agent.wasm --widl-file agent/invoice_agent.widl

# Save the contract_address from response, then:
Weilliptic$$$> execute -c <contract_address> -m new
Weilliptic$$$> execute -c <contract_address> -m create_invoice
Weilliptic$$$> execute -c <contract_address> -m create_invoice
Weilliptic$$$> execute -c <contract_address> -m get_invoice_count
# Should return: 2

Weilliptic$$$> execute -c <contract_address> -m increment
Weilliptic$$$> execute -c <contract_address> -m increment
Weilliptic$$$> execute -c <contract_address> -m increment
Weilliptic$$$> execute -c <contract_address> -m get_count
# Should return: 3
```

---

## 🎯 What This Agent Does

This is a simple demonstration agent with:

1. **Counter functionality** - Basic increment/get operations
2. **Invoice tracking** - Counts invoices created
3. **Reset capability** - Reset all counters

### Available Methods:
- `new()` - Initialize the agent
- `increment()` - Increment counter, returns new value
- `get_count()` - Get current counter value
- `create_invoice()` - Create invoice, returns count
- `get_invoice_count()` - Get total invoices
- `reset()` - Reset all counters to 0

---

## 🔄 Next Steps

After successful deployment:

1. **Save contract address** to `.env.local`:
   ```bash
   NEXT_PUBLIC_WEILLIPTIC_AGENT_ADDRESS=wei1...
   ```

2. **Test all methods** to ensure they work

3. **Integrate with frontend** (see WEILLIPTIC_DEPLOYMENT_GUIDE.md)

4. **Expand functionality** - Add more complex invoice logic

---

## ❓ Troubleshooting

### Deploy fails with "insufficient gas"
```bash
# Check your balance
balance

# Request testnet tokens
faucet
```

### Deploy fails with "file not found"
```bash
# Use absolute path
deploy --file-path /Users/harsh/Desktop/sangini/agent/target/wasm32-unknown-unknown/release/invoice_agent.wasm --widl-file /Users/harsh/Desktop/sangini/agent/invoice_agent.widl
```

### Execute fails with "method not found"
- Check method name spelling
- Ensure agent was initialized with `new()`
- Verify contract address is correct

---

## 📊 Monitor Your Agent

### Check agent status
```bash
status -c <contract_address>
```

### View transaction history
```bash
history -c <contract_address>
```

### Check logs
```bash
logs -c <contract_address>
```

---

Good luck with your deployment! 🚀
