const puppeteer = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const csvWriter = createCsvWriter({
    path: 'trader_addresses.csv',
    header: [
        {id: 'coin', title: 'COIN'},
        {id: 'address', title: 'WALLET_ADDRESS'}
    ]
});

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getTopMemeCoins(page) {
    try {
        // Step 1: Access Dexscreener's trending meme coins page
        await page.goto('https://dexscreener.com/solana', {
            waitUntil: 'networkidle0'
        });

        // Wait for the search input and type "meme"
        await page.waitForSelector('input[type="text"]');
        await page.type('input[type="text"]', 'meme');
        await delay(2000); // Wait for search results

        // Get the top 20 meme coins
        const coins = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('tr')).slice(1, 21); // Skip header, get top 20
            return rows.map(row => {
                const symbolElement = row.querySelector('td:nth-child(2)');
                const linkElement = row.querySelector('td:nth-child(2) a');
                if (symbolElement && linkElement) {
                    return {
                        symbol: symbolElement.textContent.trim(),
                        url: linkElement.href
                    };
                }
                return null;
            }).filter(Boolean);
        });

        return coins;
    } catch (error) {
        console.error('Error fetching top meme coins:', error.message);
        return [];
    }
}

async function getTraderAddresses(page, coin) {
    try {
        // Step 2: Access the coin's page
        await page.goto(coin.url, {
            waitUntil: 'networkidle0'
        });

        // Wait for and click the "Top Traders" tab
        await page.waitForSelector('button:has-text("Top Traders")', { timeout: 5000 });
        await page.click('button:has-text("Top Traders")');
        await delay(2000); // Wait for data to load

        // Extract trader addresses from Solscan links
        const traders = await page.evaluate(() => {
            const addresses = new Set();
            const links = document.querySelectorAll('a[href*="solscan.io/account/"]');
            links.forEach(link => {
                const address = link.href.split('/account/').pop();
                if (address && address.length > 30) {
                    addresses.add(address);
                }
            });
            return Array.from(addresses);
        });

        return traders.map(address => ({
            coin: coin.symbol,
            address: address
        }));
    } catch (error) {
        console.error(`Error fetching traders for ${coin.symbol}:`, error.message);
        return [];
    }
}

async function main() {
    let browser;
    try {
        console.log('Launching browser...');
        browser = await puppeteer.launch({
            headless: false, // Set to true in production
            defaultViewport: { width: 1366, height: 768 }
        });
        const page = await browser.newPage();

        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x32) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log('Fetching top meme coins from DexScreener...');
        const coins = await getTopMemeCoins(page);
        
        if (coins.length === 0) {
            throw new Error('No meme coins found');
        }

        console.log(`Found ${coins.length} meme coins`);
        console.log('Top meme coins:');
        coins.forEach((coin, i) => {
            console.log(`${i + 1}. ${coin.symbol}`);
        });

        const traderData = [];
        const processedAddresses = new Set();

        for (let i = 0; i < coins.length; i++) {
            const coin = coins[i];
            console.log(`\nProcessing ${i + 1}/${coins.length}: ${coin.symbol}`);

            const traders = await getTraderAddresses(page, coin);
            
            traders.forEach(item => {
                if (!processedAddresses.has(item.address)) {
                    traderData.push(item);
                    processedAddresses.add(item.address);
                }
            });

            console.log(`Found ${traders.length} traders for ${coin.symbol}`);
            console.log(`Total unique addresses so far: ${processedAddresses.size}`);
            
            // Add delay between requests to avoid rate limiting
            await delay(3000);
        }

        // Write to CSV
        await csvWriter.writeRecords(traderData);
        console.log('\nData has been written to trader_addresses.csv');
        console.log(`Total unique trading addresses found: ${traderData.length}`);

    } catch (error) {
        console.error('Error occurred:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

main();
