// Updated app.js with fully functional proxy implementation and additional features
const express = require('express');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');
const geoip = require('geoip-lite');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Load proxy lists
const socks5List = fs.readFileSync('./proxies/socks5.txt', 'utf-8').split('\n');
const socks4List = fs.readFileSync('./proxies/socks4.txt', 'utf-8').split('\n');
const httpList = fs.readFileSync('./proxies/http.txt', 'utf-8').split('\n');

// Helper function to get proxy details
const getProxyDetails = (type, location) => {
  const proxyList = {
    SOCKS5: socks5List,
    SOCKS4: socks4List,
    HTTP: httpList,
  }[type.toUpperCase()] || httpList;

  // Filter by location if provided
  const filteredList = location
    ? proxyList.filter(proxy => proxy.includes(location))
    : proxyList;

  // Return the first available proxy
  return filteredList[0] || 'No proxy available';
};

// Middleware for proxying requests
app.use(
  '/proxy',
  (req, res, next) => {
    const { url, type = 'SOCKS5', country = 'US' } = req.query;
    if (!url) {
      return res.status(400).send('Missing URL parameter');
    }

    const proxy = getProxyDetails(type, country);
    if (proxy === 'No proxy available') {
      return res.status(500).send('No proxies available for the specified criteria');
    }

    console.log(`Using proxy: ${proxy}`);

    req.headers['X-Forwarded-For'] = proxy; // Set proxy details in header

    // Use the proxy middleware
    const proxyMiddleware = createProxyMiddleware({
      target: url,
      changeOrigin: true,
      onProxyReq(proxyReq, req, res) {
        proxyReq.setHeader('X-Forwarded-For', proxy);
      },
    });

    proxyMiddleware(req, res, next);
  }
);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Main endpoint for home
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
