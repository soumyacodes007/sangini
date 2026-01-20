#!/bin/bash

echo "Starting Weilliptic CLI..."

CLI_BIN="/Users/harsh/Downloads/cli"
WEIL_HOME="/Users/harsh/.weilliptic"
KEY_FILE="$WEIL_HOME/private.key"

# 🔐 PASTE YOUR PRIVATE KEY BELOW
PRIVATE_KEY="PASTE_YOUR_PRIVATE_KEY_HERE"

if [ -z "$PRIVATE_KEY" ]; then
  echo "ERROR: Private key not provided."
  exit 1
fi

mkdir -p "$WEIL_HOME"

# Write key to file (CLI only reads from file)
echo "$PRIVATE_KEY" > "$KEY_FILE"
chmod 600 "$KEY_FILE"

export WC_PATH="$WEIL_HOME"
export WC_PRIVATE_KEY="$KEY_FILE"

echo "Private key written to $KEY_FILE"
echo "Launching CLI..."

"$CLI_BIN"
