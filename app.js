const express = require('express');
const request = require('request');
const compression = require('compression');
const ProxyAgent = require('proxy-agent');
const fetch = require('node-fetch');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(compression());
app.use(cookieParser());

// Proxy lists (preloaded from provided files)
const proxyList = {
    HTTP: [],
    SOCKS4: [],
    SOCKS5: []
};

// Load proxy lists from files
function loadProxyLists() {
    const proxyDir = path.join(__dirname, 'proxy_lists');
    const types = ['HTTP', 'SOCKS4', 'SOCKS5'];
    types.forEach(type => {
        const filePath = path.join(proxyDir, `${type.toLowerCase()}.txt`);
        if (fs.existsSync(filePath)) {
            proxyList[type] = fs.readFileSync(filePath, 'utf-8').split('\n').filter(line => line.trim() !== '');
        } else {
            console.error(`Proxy list file not found for type: ${type}`);
        }
    });
}
loadProxyLists();

// Features toggles and default settings
let settings = {
    adBlock: true,
    trackerBlock: true,
    contentFiltering: {
        images: false,
        videos: false,
        scripts: false,
    },
    theme: 'dark',
    analytics: {
        requestCount: 0,
        dataTransferred: 0, // in bytes
    },
    customUserAgent: '',
    cookieManagement: {
        enabled: true,
    },
};

// Detect proxy location using IP geolocation API
async function detectProxyLocation(proxy) {
    try {
        const response = await fetch(`http://ip-api.com/json/${proxy.split(':')[0]}`);
        const data = await response.json();
        return `${data.city || 'Unknown City'}, ${data.country || 'Unknown Country'} (${data.query || 'Unknown IP'})`;
    } catch (err) {
        console.error('Error detecting proxy location:', err.message);
        return 'Unknown Location';
    }
}

// Middleware for Ad Blocker and Tracker Blocker
app.use((req, res, next) => {
    if (settings.adBlock || settings.trackerBlock) {
        res.setHeader('Content-Security-Policy', "script-src 'none'; img-src 'none';"); // Blocks ads and trackers
    }
    next();
});

// Proxy handler with SOCKS5 default
app.get('/proxy/:type/:url', async (req, res) => {
    const targetUrl = decodeURIComponent(req.params.url);
    const type = req.params.type?.toUpperCase() || 'SOCKS5';

    if (!proxyList[type] || proxyList[type].length === 0) {
        res.status(500).send(`No proxies available for type: ${type}`);
        return;
    }

    // Select a random proxy from the chosen list
    const proxy = proxyList[type][Math.floor(Math.random() * proxyList[type].length)];
    const location = await detectProxyLocation(proxy);

    // Use ProxyAgent to route requests through the proxy
    const agent = new ProxyAgent(proxy);

    // Custom User-Agent
    const headers = {};
    if (settings.customUserAgent) {
        headers['User-Agent'] = settings.customUserAgent;
    }

    // Update analytics
    settings.analytics.requestCount++;

    request
        .get(targetUrl, { agent, headers, followRedirect: true })
        .on('response', (response) => {
            // Calculate data transferred
            settings.analytics.dataTransferred += parseInt(response.headers['content-length'] || '0', 10);
        })
        .on('error', (err) => {
            console.error('Proxy request error:', err.message);
            res.status(500).send('Error proxying the request.');
        })
        .pipe(res);
});

// Cookie Management
app.get('/cookies', (req, res) => {
    if (settings.cookieManagement.enabled) {
        res.json({ cookies: req.cookies });
    } else {
        res.status(403).send('Cookie management is disabled.');
    }
});

// Dynamic Content Filtering
app.use((req, res, next) => {
    if (settings.contentFiltering.images) {
        res.setHeader('Content-Type', 'text/plain');
        res.send('Images are blocked.');
    } else if (settings.contentFiltering.videos) {
        res.setHeader('Content-Type', 'text/plain');
        res.send('Videos are blocked.');
    } else if (settings.contentFiltering.scripts) {
        res.setHeader('Content-Type', 'text/plain');
        res.send('Scripts are blocked.');
    } else {
        next();
    }
});

// Theme Toggle
app.get('/theme', (req, res) => {
    settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
    res.send(`Theme switched to ${settings.theme}`);
});

// Analytics Endpoint
app.get('/analytics', (req, res) => {
    res.json(settings.analytics);
});

// Serve existing static files
app.use('/', express.static(path.join(__dirname, 'public')));

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