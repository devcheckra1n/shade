
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

// Proxy handler with SOCKS5 default
app.get('/proxy/:url', async (req, res) => {
    const targetUrl = decodeURIComponent(req.params.url);
    const type = req.query.type?.toUpperCase() || 'SOCKS5';

    if (!proxyList[type] || proxyList[type].length === 0) {
        res.status(500).send(`No proxies available for type: ${type}`);
        return;
    }

    // Select a random proxy from the chosen list
    const proxy = proxyList[type][Math.floor(Math.random() * proxyList[type].length)];
    const location = await detectProxyLocation(proxy);

    // Use ProxyAgent to route requests through the proxy
    const agent = new ProxyAgent(proxy);
    res.setHeader('X-Proxy-Info', location); // Send proxy info in response header
    request.get(targetUrl, { agent, followRedirect: true })
        .on('error', (err) => {
            console.error('Proxy request error:', err.message);
            res.status(500).send('Error proxying the request.');
        })
        .pipe(res);
});

// Serve existing static files
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
