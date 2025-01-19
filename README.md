# Solana Meme Coin Traders Scraper

This project scrapes the top trader wallet addresses for the top 20 meme coins on Solana using DexScreener data.

## Setup

1. Install Node.js if you haven't already
2. Clone this repository
3. Install dependencies:
```bash
npm install
```

## Running the Scraper

```bash
npm start
```

The script will:
1. Launch a browser and navigate to DexScreener's Solana page
2. Get the top 20 trending meme coins
3. For each coin, collect the top 100 trader wallet addresses
4. Save all data to `trader_addresses.csv`

## Output

The script generates a CSV file with the following columns:
- COIN: The token pair identifier
- WALLET_ADDRESS: The trader's wallet address

## Performance Notes

- The script uses Puppeteer in non-headless mode to handle dynamic content
- Includes delay mechanisms to prevent rate limiting
- Implements error handling and graceful browser closure
- Expected runtime: ~10-15 minutes for 20 coins (depending on network conditions)

## Memory Usage

The script maintains a minimal memory footprint by:
- Processing one coin at a time
- Writing to CSV incrementally
- Cleaning up browser resources properly
