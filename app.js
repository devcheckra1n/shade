
const express = require('express');
const Unblocker = require('unblocker');
const compression = require('compression');

const app = express();

// Compression middleware
app.use(compression());

// Unblocker proxy setup
const unblocker = new Unblocker({
    prefix: '/proxy/'
});
app.use(unblocker);

// Proxy route to handle user-provided URLs
app.get('/proxy/:url', (req, res) => {
    const targetUrl = decodeURIComponent(req.params.url);
    if (!targetUrl) {
        res.status(400).send('Bad Request: No URL provided.');
        return;
    }
    req.url = targetUrl;
    unblocker.handleRequest(req, res);
});

// Serve static files
app.use('/', express.static(__dirname + '/public'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Proxy Error:', err);
    res.status(500).send('Proxy Error: Unable to process your request.');
});

// Default 404 handler
app.use((req, res) => {
    res.status(404).send('404 - Not Found');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Proxy server is running on http://localhost:${PORT}`);
});
