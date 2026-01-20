# InvoiceAgent Execute Commands

Contract Address: `aaaaaas5zw2kyj724q7pn2nndho2yecyfeutgowuapg4oxyvxsw5iyorwm`

## Query Methods (Read-only, no gas cost)

### Get Counter Value
```bash
execute -n aaaaaas5zw2kyj724q7pn2nndho2yecyfeutgowuapg4oxyvxsw5iyorwm -m get_count
```

### Get Invoice Count
```bash
execute -c aaaaaas5zw2kyj724q7pn2nndho2yecyfeutgowuapg4oxyvxsw5iyorwm -m get_invoice_count
```

## Mutate Methods (Modify state, costs gas)

### Increment Counter
```bash
execute -n aaaaaas5zw2kyj724q7pn2nndho2yecyfeutgowuapg4oxyvxsw5iyorwm -m increment
```

### Create Invoice
```bash
execute -c aaaaaas5zw2kyj724q7pn2nndho2yecyfeutgowuapg4oxyvxsw5iyorwm -m create_invoice
```

### Reset Counters
```bash
execute -c aaaaaas5zw2kyj724q7pn2nndho2yecyfeutgowuapg4oxyvxsw5iyorwm -m reset
```

## Example Workflow

1. **Check initial state:**
   ```bash
   execute -c aaaaaas5zw2kyj724q7pn2nndho2yecyfeutgowuapg4oxyvxsw5iyorwm -m get_count
   execute -c aaaaaas5zw2kyj724q7pn2nndho2yecyfeutgowuapg4oxyvxsw5iyorwm -m get_invoice_count
   ```

2. **Increment counter:**
   ```bash
   execute -c aaaaaas5zw2kyj724q7pn2nndho2yecyfeutgowuapg4oxyvxsw5iyorwm -m increment
   ```

3. **Verify increment:**
   ```bash
   execute -c aaaaaas5zw2kyj724q7pn2nndho2yecyfeutgowuapg4oxyvxsw5iyorwm -m get_count
   ```

4. **Create invoices:**
   ```bash
   execute -c aaaaaas5zw2kyj724q7pn2nndho2yecyfeutgowuapg4oxyvxsw5iyorwm -m create_invoice
   execute -c aaaaaas5zw2kyj724q7pn2nndho2yecyfeutgowuapg4oxyvxsw5iyorwm -m create_invoice
   execute -c aaaaaas5zw2kyj724q7pn2nndho2yecyfeutgowuapg4oxyvxsw5iyorwm -m create_invoice
   ```

5. **Check invoice count:**
   ```bash
   execute -c aaaaaas5zw2kyj724q7pn2nndho2yecyfeutgowuapg4oxyvxsw5iyorwm -m get_invoice_count
   ```

6. **Reset everything:**
   ```bash
   execute -c aaaaaas5zw2kyj724q7pn2nndho2yecyfeutgowuapg4oxyvxsw5iyorwm -m reset
   ```

7. **Verify reset:**
   ```bash
   execute -c aaaaaas5zw2kyj724q7pn2nndho2yecyfeutgowuapg4oxyvxsw5iyorwm -m get_count
   execute -c aaaaaas5zw2kyj724q7pn2nndho2yecyfeutgowuapg4oxyvxsw5iyorwm -m get_invoice_count
   ```

## Notes

- **Query methods** (`get_count`, `get_invoice_count`) are read-only and don't cost gas
- **Mutate methods** (`increment`, `create_invoice`, `reset`) modify state and require gas
- All commands should be run in the Weilliptic CLI after connecting to a sentinel node
- Expected response format:
  ```json
  {
    "status": "Success",
    "txn_result": <result_value>,
    "batch_id": "...",
    "block_height": ...,
    ...
  }
  ```
