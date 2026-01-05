# Sangini Demo Script - Updated
# New Invoice Contract: CDGFVLKALAUTFF7ZL6OYIERU37GG2F25F2QHN4P5EPIWTUNAY7RWSHM4

$INVOICE_CONTRACT = "CDGFVLKALAUTFF7ZL6OYIERU37GG2F25F2QHN4P5EPIWTUNAY7RWSHM4"
$TOKEN_CONTRACT = "CAU7GKIL6IMSSPLGUSOOAUW3ZVIQKVGVE3ZCTV2ZKJHUQMTHSFDSQAUV"

$ADMIN = "GDFCZILMBZBLAOYPKAJEG5ZBYTJ6KU6GAN5Q3APW7LN52XG4S4KGVFOP"
$SUPPLIER = "GCWGZTQJBDMS5A7F6OVUSFJIWRNREM6PCYWWIHZG6P6D6GUS7YCPL7FV"
$BUYER = "GBBLVFK64B4A5RHEZ2STRG6FFVHPTBXFXMWBFOM5HRDKSZXRDSOQRLI4"
$INVESTOR = "GCKFM7PV6E3SY7W6ZZCNCIHLRUHF2K7PRPYP4KC4JBURUUXE66D5RUGX"

$STELLAR = "C:\Program Files (x86)\Stellar CLI\stellar.exe"

Write-Host "=== SANGINI DEMO ===" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# Create a new invoice
# ============================================================================
Write-Host "Creating invoice..." -ForegroundColor Yellow
$DUE_DATE = [int][double]::Parse((Get-Date).AddDays(90).ToUniversalTime().Subtract([datetime]'1970-01-01').TotalSeconds)

& $STELLAR contract invoke `
  --id $INVOICE_CONTRACT `
  --source supplier `
  --network testnet `
  -- `
  mint_draft `
  --supplier $SUPPLIER `
  --buyer $BUYER `
  --amount 5000000000000 `
  --currency "INR" `
  --due_date $DUE_DATE `
  --description "Test Invoice Demo" `
  --purchase_order "PO-DEMO-001"

Write-Host ""

# ============================================================================
# Buyer approves (Digital Handshake)
# ============================================================================
Write-Host "Buyer approving invoice..." -ForegroundColor Yellow

& $STELLAR contract invoke `
  --id $INVOICE_CONTRACT `
  --source buyer `
  --network testnet `
  -- `
  approve_invoice `
  --invoice_id "INV-1002" `
  --buyer $BUYER

Write-Host ""

# ============================================================================
# Check invoice status
# ============================================================================
Write-Host "Checking invoice status..." -ForegroundColor Yellow

& $STELLAR contract invoke `
  --id $INVOICE_CONTRACT `
  --source admin `
  --network testnet `
  -- `
  get_invoice `
  --invoice_id "INV-1002"

Write-Host ""
Write-Host "=== DEMO COMPLETE ===" -ForegroundColor Cyan
