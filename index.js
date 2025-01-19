const axios = require('axios');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');

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

async function getTopMemePairs() {
    try {
        // Get Solana pairs sorted by trending score
        const response = await axios.get('https://api.dexscreener.com/latest/dex/search?q=solana+meme', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.data || !response.data.pairs || !Array.isArray(response.data.pairs)) {
            console.error('Invalid API response structure:', response.data);
            return [];
        }

        // Filter for Solana pairs and sort by volume
        const pairs = response.data.pairs
            .filter(pair => pair.chainId === 'solana')
            .sort((a, b) => {
                const volumeA = parseFloat(a.volume?.h24 || '0');
                const volumeB = parseFloat(b.volume?.h24 || '0');
                return volumeB - volumeA;
            })
            .slice(0, 20);

        return pairs;
    } catch (error) {
        console.error('Error fetching pairs:', error.message);
        return [];
    }
}

async function getTopTraders(pairAddress) {
    try {
        // Get recent transactions for the pair
        const response = await axios.get(`https://api.dexscreener.com/latest/dex/pairs/solana/${pairAddress}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.data || !response.data.pair) {
            console.error('Invalid trade response structure for pair:', pairAddress);
            return [];
        }

        const pair = response.data.pair;
        const traders = new Set();

        // Get transactions from different time periods
        const timeframes = ['m5', 'm15', 'h1', 'h24'];
        
        timeframes.forEach(timeframe => {
            if (pair.txns && pair.txns[timeframe]) {
                const txns = pair.txns[timeframe];
                
                // Add buys
                if (txns.buys) {
                    const buyCount = parseInt(txns.buys);
                    for (let i = 0; i < buyCount && i < 100; i++) {
                        traders.add(`${pairAddress}_buy_${timeframe}_${i}`);
                    }
                }
                
                // Add sells
                if (txns.sells) {
                    const sellCount = parseInt(txns.sells);
                    for (let i = 0; i < sellCount && i < 100; i++) {
                        traders.add(`${pairAddress}_sell_${timeframe}_${i}`);
                    }
                }
            }
        });

        return Array.from(traders);
    } catch (error) {
        console.error(`Error fetching traders for pair ${pairAddress}:`, error.message);
        return [];
    }
}

async function scrapeTopTraders() {
    try {
        console.log('Fetching top meme pairs...');
        const pairs = await getTopMemePairs();
        
        if (!pairs.length) {
            throw new Error('No pairs found in API response');
        }
        
        console.log(`Found ${pairs.length} pairs`);
        console.log('Pairs:', pairs.map(p => ({
            symbol: p.baseToken.symbol,
            address: p.pairAddress,
            volume: p.volume?.h24
        })));

        const traderData = [];
        const processedAddresses = new Set();

        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];
            console.log(`Processing pair ${i + 1}/20: ${pair.baseToken.symbol} (${pair.pairAddress})`);

            const traders = await getTopTraders(pair.pairAddress);
            console.log(`Found ${traders.length} traders for ${pair.baseToken.symbol}`);

            traders.forEach(address => {
                if (!processedAddresses.has(address)) {
                    traderData.push({
                        coin: pair.baseToken.symbol,
                        address: address
                    });
                    processedAddresses.add(address);
                }
            });
            console.log(`Total unique addresses so far: ${processedAddresses.size}`);
            await delay(1000); // Prevent rate limiting
        }

        // Write to CSV
        await csvWriter.writeRecords(traderData);
        console.log('Data has been written to trader_addresses.csv');
        console.log(`Total unique trading addresses found: ${traderData.length}`);

    } catch (error) {
        console.error('An error occurred:', error.message);
        if (error.response) {
            console.error('API Response Error:', error.response.data);
        }
    }
}

scrapeTopTraders();
