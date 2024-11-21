

var url = require('url');
var querystring = require('querystring');
var express = require('express');
var Unblocker = require('unblocker');
var Transform = require('stream').Transform;
var youtube = require('unblocker/examples/youtube/youtube.js')

var app = express();

var google_analytics_id = process.env.GA_ID || null;

function addGa(html) {
    if (google_analytics_id) {
        var ga = [
            "<script type=\"text/javascript\">",
            "var _gaq = []; // overwrite the existing one, if any",
            "_gaq.push(['_setAccount', '" + google_analytics_id + "']);",
            "_gaq.push(['_trackPageview']);",
            "(function() {",
            "  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;",
            "  ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';",
            "  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);",
            "})();",
            "</script>"
            ].join("\n");
        html = html.replace("</body>", ga + "\n\n</body>");
    }
    return html;
}

function googleAnalyticsMiddleware(data) {
    if (data.contentType == 'text/html') {

        // https://nodejs.org/api/stream.html#stream_transform
        data.stream = data.stream.pipe(new Transform({
            decodeStrings: false,
            transform: function(chunk, encoding, next) {
                this.push(addGa(chunk.toString()));
                next();
            }
        }));
    }
}

var unblocker = new Unblocker({
    prefix: '/proxy/',
    requestMiddleware: [
        youtube.processRequest
    ],
    responseMiddleware: [
        googleAnalyticsMiddleware
    ]
});

// this line must appear before any express.static calls (or anything else that sends responses)
app.use(unblocker);

// serve up static files *after* the proxy is run
app.use('/', express.static(__dirname + '/public'));

// this is for users who's form actually submitted due to JS being disabled or whatever
app.get("/no-js", function(req, res) {
    // grab the "url" parameter from the querystring
    var site = querystring.parse(url.parse(req.url).query).url;
    // and redirect the user to /proxy/url
    res.redirect(unblockerConfig.prefix + site);
});

const port = process.env.PORT || process.env.VCAP_APP_PORT || 8080;

app.listen(port, function() {
    console.log(`node unblocker process listening at http://localhost:${port}/`);
}).on("upgrade", unblocker.onUpgrade); // onUpgrade handles websockets

// === Enhancements for Proxy Features ===

// Content Type Filtering
app.use('/proxy', (req, res, next) => {
    const blockTypes = req.query.block || ''; // e.g., 'images,videos'
    const blocked = blockTypes.split(',').map(type => type.trim());
    res.on('pipe', (src) => {
        if (blocked.includes('images') && src.headers['content-type']?.startsWith('image')) {
            src.unpipe(res);
        }
        if (blocked.includes('videos') && src.headers['content-type']?.startsWith('video')) {
            src.unpipe(res);
        }
    });
    next();
});

// Ad Blocker
app.use('/proxy', (req, res, next) => {
    if (req.url.includes('ads') || req.url.includes('trackers')) {
        return res.status(403).send('Blocked ad/tracker content');
    }
    next();
});

// Cookie Management
app.get('/cookies', (req, res) => {
    res.json(req.cookies || {});
});
app.post('/cookies', (req, res) => {
    Object.entries(req.body || {}).forEach(([key, value]) => res.cookie(key, value));
    res.send('Cookies updated');
});

// Bandwidth Throttling
const rateLimit = require('express-rate-limit');
const throttle = rateLimit({ windowMs: 60 * 1000, max: 100 }); // 100 requests per minute
app.use('/proxy', throttle);

// Compression
const compression = require('compression');
app.use(compression());

// HTTPS Inspection
// Add SSL decryption using a middleware or third-party service
// (Requires certificates and advanced setup)

// IP Rotation
// Example: Use public proxies or a proxy service (code omitted for brevity)

// Geo-Unblocking
// Example: Use proxies with region settings or integrate with a service like ProxyMesh
// (code omitted for brevity)

// Cache Responses
const cache = new Map();
app.use('/proxy', (req, res, next) => {
    const cachedResponse = cache.get(req.url);
    if (cachedResponse) {
        res.send(cachedResponse);
    } else {
        res.once('finish', () => cache.set(req.url, res));
        next();
    }
});

// URL Shortener (Placeholder API)
app.post('/shorten', async (req, res) => {
    const { url } = req.body;
    // Add actual shortening logic
    res.send({ shortUrl: `https://short.url/${Buffer.from(url).toString('base64')}` });
});


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
