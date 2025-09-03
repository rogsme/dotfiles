#!/bin/bash

# Fetch Bitcoin price from CoinGecko API
response=$(curl -s "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true")

# Check if we got rate limited or any error
if [[ $response == *"error_code"* ]] || [[ $response == *"Rate Limit"* ]] || [[ -z "$response" ]]; then
    exit 0  # Exit silently
fi

# Extract price and change using simple sed
price=$(echo "$response" | sed 's/.*"usd":\([0-9.]*\).*/\1/')
change=$(echo "$response" | sed 's/.*"usd_24h_change":\(-\?[0-9.]*\).*/\1/')

# If we couldn't extract valid numbers, exit silently
if [[ -z "$price" ]] || [[ -z "$change" ]] || [[ "$price" == "$response" ]]; then
    exit 0
fi

# Format price to 2 decimal places
formatted_price=$(printf "%.2f" "$price")

# Check if change is negative (starts with -)
if [[ $change == -* ]]; then
    # Red for negative
    printf "%%{F#BB0000}₿: \$%s%%{F-}\n" "$formatted_price"
else
    # Green for positive
    printf "%%{F#00BB00}₿: \$%s%%{F-}\n" "$formatted_price"
fi
