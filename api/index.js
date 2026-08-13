// api/index.js
// Vercel serverless entry point. Vercel treats this file as the handler for
// any request routed to /api/* (see the rewrite in vercel.json). It simply
// hands the request to our normal Express app.
module.exports = require("../server");
