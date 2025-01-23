const { connect } = require('puppeteer-real-browser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const PROXY_CONFIG = {
    host: 'proxy.nodemaven.com',  
    port: '8080',                 
    username: 'your-username',    
    password: 'your-password'     
};

const csvWriter = createCsvWriter({
    path: 'trader_addresses.csv',
    header: [
        {id: 'coin', title: 'COIN'},
        {id: 'address', title: 'WALLET_ADDRESS'}
    ]
});

async function delay(min, max) {
    const time = Math.floor(Math.random() * (max - min + 1) + min);
    return new Promise(resolve => setTimeout(resolve, time));
}

async function setupBrowser() {
    console.log('Launching browser with real browser profile and proxy...');

    const { browser, page } = await connect({
        headless: false,
        fingerprint: true,   
        turnstile: true,      
        tf: true,             
        proxy: {              
            host: PROXY_CONFIG.host,
            port: PROXY_CONFIG.port,
            username: PROXY_CONFIG.username,
            password: PROXY_CONFIG.password
        },
        args: [
            '--start-maximized',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--window-position=0,0',
            '--ignore-certifcate-errors',
            '--ignore-certifcate-errors-spki-list',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-site-isolation-trials',
            '--disable-features=site-per-process',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--hide-scrollbars',
            '--mute-audio'
        ],
        customConfig: {
            windowSize: '1920,1080'
        },
        connectOption: {
            defaultViewport: null
        }
    });

    return { page, browser };
}

async function getTopMemeCoins(page) {
    try {
        console.log('Navigating to DexScreener...');
        await delay(2000, 5000);
        
        await page.goto('https://dexscreener.com/solana', {
            waitUntil: 'networkidle0',
            timeout: 60000
        });
        
        // Wait for the table to load
        await page.waitForSelector('table', { timeout: 30000 });
        await delay(3000, 7000);

        console.log('Extracting coin data...');
        const coins = await page.evaluate(() => {
            const rows = document.querySelectorAll('table tbody tr');
            const coinList = [];
            
            rows.forEach(row => {
                try {
                    const nameElement = row.querySelector('td:first-child a');
                    if (nameElement) {
                        const href = nameElement.getAttribute('href');
                        if (href) {
                            coinList.push({
                                name: nameElement.textContent.trim(),
                                url: href
                            });
                        }
                    }
                } catch (e) {
                    console.error('Error processing row:', e);
                }
            });
            
            return coinList;
        });

        console.log(`Found ${coins.length} coins`);
        return coins;
    } catch (error) {
        console.error('Error in getTopMemeCoins:', error);
        return [];
    }
}

async function getTraderAddresses(page, coin) {
    try {
        console.log(`Getting addresses for ${coin.name}...`);
        await delay(2000, 5000);
        
        const coinUrl = coin.url.startsWith('http') ? coin.url : `https://dexscreener.com${coin.url}`;
        await page.goto(coinUrl, {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        try {
            await page.waitForSelector('button:has-text("Trades")', { timeout: 10000 });
            await delay(1000, 3000);
            await page.click('button:has-text("Trades")');
            await delay(3000, 7000);
        } catch (e) {
            console.log('Trades tab not found, continuing...');
        }

        const addresses = await page.evaluate(() => {
            const addressSet = new Set();
            
            document.querySelectorAll('a[href*="solscan.io/account/"]').forEach(link => {
                const address = link.href.split('/account/')[1];
                if (address && address.match(/^[A-HJ-NP-Za-km-z1-9]{32,44}$/)) {
                    addressSet.add(address);
                }
            });

            document.querySelectorAll('td').forEach(cell => {
                const text = cell.textContent.trim();
                if (text.match(/^[A-HJ-NP-Za-km-z1-9]{32,44}$/)) {
                    addressSet.add(text);
                }
            });

            return Array.from(addressSet);
        });

        console.log(`Found ${addresses.length} addresses for ${coin.name}`);
        return addresses;
    } catch (error) {
        console.error(`Error getting addresses for ${coin.name}:`, error);
        return [];
    }
}

async function main() {
    let browser;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
        try {
            const { page, browser: newBrowser } = await setupBrowser();
            browser = newBrowser;

            const coins = await getTopMemeCoins(page);
            if (coins.length === 0) {
                throw new Error('No coins found. Retrying...');
            }

            const processedAddresses = new Set();
            
            for (const coin of coins) {
                const addresses = await getTraderAddresses(page, coin);
                
                if (addresses.length > 0) {
                    const newAddresses = addresses.filter(addr => !processedAddresses.has(addr));
                    newAddresses.forEach(addr => processedAddresses.add(addr));
                    
                    await csvWriter.writeRecords(newAddresses.map(address => ({
                        coin: coin.name,
                        address: address
                    })));
                    
                    console.log(`Saved ${newAddresses.length} new addresses for ${coin.name}`);
                }
                
                console.log(`Total unique addresses: ${processedAddresses.size}`);
                await delay(10000, 15000);
            }

            console.log(`Scraping completed. Total unique addresses found: ${processedAddresses.size}`);
            break;
        } catch (error) {
            console.error(`Attempt ${retryCount + 1} failed:`, error);
            if (browser) {
                await browser.close();
            }
            retryCount++;
            if (retryCount < maxRetries) {
                console.log(`Retrying... (${retryCount + 1}/${maxRetries})`);
                await delay(10000, 20000);
            }
        }
    }

    if (browser) {
        await browser.close();
    }
}

main();