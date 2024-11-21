
var url = require('url');
var querystring = require('querystring');
var express = require('express');
var Unblocker = require('unblocker');
var Transform = require('stream').Transform;

var app = express();

// Middleware for adding Google Analytics (disabled for debugging purposes)
function addGa(html) {
    return html; // Temporarily return HTML without modification
}

// Define Google Analytics Middleware (disabled)
function googleAnalyticsMiddleware(data) {
    if (data.contentType == 'text/html') {
        data.stream = data.stream.pipe(new Transform({
            decodeStrings: false,
            transform: function(chunk, encoding, next) {
                this.push(addGa(chunk.toString()));
                next();
            }
        }));
    }
}

// Unblocker setup
var unblocker = new Unblocker({
    prefix: '/proxy/',
    requestMiddleware: [], // Temporarily disable youtube.processRequest
    responseMiddleware: [] // Temporarily disable googleAnalyticsMiddleware
});

// Use Unblocker middleware
app.use(unblocker);

// Serve static files after the Unblocker
app.use('/', express.static(__dirname + '/public'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error occurred:', err.message);
    res.status(500).send('Internal Server Error. Please try again later.');
});

// Default route for undefined paths
app.use((req, res) => {
    res.status(404).send('404 - Not Found');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
