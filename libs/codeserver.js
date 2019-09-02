/*
 * Hazaar Forms JS Code Execution Server
 */
const http = require('http');
const port = process.argv[2] ? process.argv[2] : 3000;
http.createServer((req, res) => {
    let body = [];
    req.on('data', (chunk) => {
        body.push(chunk);
    }).on('end', () => {
        body = Buffer.concat(body).toString();
        try {
            let result = eval(body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('ERROR: ' + e.toString());
        }
    });
}).listen(port, () => { console.log('Code execution server ready on port ' + port); });
