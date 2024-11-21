
const express = require('express');
const request = require('request');
const compression = require('compression');
const ProxyAgent = require('proxy-agent');
const fetch = require('node-fetch');

const app = express();
app.use(compression());

// Proxy lists
const proxyList = {
    HTTP: [],
    SOCKS4: [],
    SOCKS5: []
};

// Load proxy lists from files
function loadProxyLists() {
    const fs = require('fs');
    const path = require('path');
    const types = ['HTTP', 'SOCKS4', 'SOCKS5'];
    types.forEach(type => {
        const filePath = path.join(__dirname, 'proxy_lists', `${type.toLowerCase()}_proxies.txt`);
        if (fs.existsSync(filePath)) {
            proxyList[type] = fs.readFileSync(filePath, 'utf-8').split('\n').filter(line => line.trim() !== '');
        }
    });
}
loadProxyLists();

// Detect proxy location using IP geolocation API
async function detectProxyLocation(proxy) {
    try {
        const response = await fetch(`http://ip-api.com/json/${proxy.split(':')[0]}`);
        const data = await response.json();
        return `${data.city}, ${data.country} (${data.query})`;
    } catch (err) {
        console.error('Error detecting proxy location:', err.message);
        return 'Unknown Location';
    }
}

// Proxy handler
app.get('/proxy/:type/:url', async (req, res) => {
    const type = req.params.type.toUpperCase();
    const targetUrl = decodeURIComponent(req.params.url);

    if (!proxyList[type] || proxyList[type].length === 0) {
        res.status(500).send(`No proxies available for type: ${type}`);
        return;
    }

    // Select a random proxy from the list
    const proxy = proxyList[type][Math.floor(Math.random() * proxyList[type].length)];
    const location = await detectProxyLocation(proxy);

    // Use ProxyAgent to route requests through the proxy
    const agent = new ProxyAgent(proxy);
    res.setHeader('X-Proxy-Info', location); // Send proxy info in response header
    request.get(targetUrl, { agent })
        .on('error', (err) => {
            console.error('Proxy request error:', err.message);
            res.status(500).send('Error proxying the request.');
        })
        .pipe(res);
});

// Serve existing static files
app.use('/', express.static(__dirname + '/public'));

// Existing routes and logic

const express = require('express');
const request = require('request');
const compression = require('compression');
const ProxyAgent = require('proxy-agent');
const fetch = require('node-fetch');

const app = express();
app.use(compression());

// Real proxy list fetched from a proxy provider
let proxyList = {
    US: [],
    EU: [],
    ASIA: []
};

// Function to fetch proxy lists from a provider
async function fetchProxies() {
    try {
        // Example provider: ProxyScrape (or similar)
        const regions = {
            US: 'https://proxyscrape.com/proxies/US',
            EU: 'https://proxyscrape.com/proxies/EU',
            ASIA: 'https://proxyscrape.com/proxies/ASIA'
        };

        for (const [region, url] of Object.entries(regions)) {
            const response = await fetch(url);
            const text = await response.text();
            proxyList[region] = text.split('\n').filter(proxy => proxy.trim() !== '');
        }

        console.log('Proxy lists updated:', proxyList);
    } catch (err) {
        console.error('Error fetching proxies:', err.message);
    }
}

// Fetch proxies at startup and periodically refresh
fetchProxies();
setInterval(fetchProxies, 3600000); // Refresh every hour

// Middleware to handle proxying with region-based routing
app.get('/proxy/:region/:url', (req, res) => {
    const region = req.params.region.toUpperCase();
    const targetUrl = decodeURIComponent(req.params.url);

    if (!proxyList[region] || proxyList[region].length === 0) {
        res.status(500).send(`No proxies available for region: ${region}`);
        return;
    }

    // Select a random proxy from the chosen region
    const proxy = proxyList[region][Math.floor(Math.random() * proxyList[region].length)];

    // Use ProxyAgent to route requests through the proxy
    const agent = new ProxyAgent(proxy);
    request.get(targetUrl, { agent })
        .on('error', (err) => {
            console.error('Proxy request error:', err.message);
            res.status(500).send('Error proxying the request.');
        })
        .pipe(res);
});

// Serve static files
app.use('/', express.static(__dirname + '/public'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error occurred:', err.message);
    res.status(500).send('Internal Server Error.');
});

// Default 404 handler
app.use((req, res) => {
    res.status(404).send('404 - Not Found');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error occurred:', err.message);
    res.status(500).send('Internal Server Error.');
});

// Default 404 handler
app.use((req, res) => {
    res.status(404).send('404 - Not Found');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
