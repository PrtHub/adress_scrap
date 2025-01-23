# Solana Meme Coin Traders Scraper

This project scrapes the top trader wallet addresses for Solana meme coins using DexScreener data. It uses puppeteer-real-browser with proxy support to bypass Cloudflare protection.

## Features

- Automatic Cloudflare protection bypass using puppeteer-real-browser
- Proxy support for reliable scraping
- Real browser fingerprinting to avoid detection
- Automatic Turnstile challenge solving
- CSV export of trader addresses

## Prerequisites

1. Node.js (v16 or higher)
2. A proxy service subscription (recommended providers below)
3. Git (for cloning the repository)

## Setup

1. Install Node.js if you haven't already
2. Clone this repository
3. Install dependencies:
```bash
npm install
```

4. Configure your proxy in `main.js`:
```javascript
const PROXY_CONFIG = {
    host: 'your-proxy-host',
    port: 'your-proxy-port',
    username: 'your-username',
    password: 'your-password'
};
```

## Running the Scraper

```bash
npm run dev
```

The script will:
1. Launch a real browser instance with proxy configuration
2. Bypass Cloudflare protection automatically
3. Navigate to DexScreener's Solana page
4. Get the trending meme coins
5. For each coin, collect trader wallet addresses
6. Save all data to `trader_addresses.csv`

## Output

The script generates a CSV file with the following columns:
- COIN: The token pair identifier
- WALLET_ADDRESS: The trader's wallet address

## Performance Notes

- Uses real browser profiles to avoid detection
- Implements random delays between actions
- Includes retry mechanism for failed attempts
- Handles Cloudflare challenges automatically
- Expected runtime varies based on Cloudflare challenges and network conditions

## Memory Usage

The script maintains a minimal memory footprint by:
- Processing one coin at a time
- Writing to CSV incrementally
- Cleaning up browser resources properly
- Managing memory usage during long runs

## Troubleshooting

If you encounter issues:
1. Verify your proxy configuration is correct
2. Ensure you're using a residential proxy (datacenter IPs often get blocked)
3. Try increasing the delay times between requests
4. Check if your proxy provider has specific configuration requirements

## Dependencies

- puppeteer-real-browser: For browser automation and Cloudflare bypass
- csv-writer: For saving data to CSV format
