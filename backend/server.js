import http from 'node:http';
const port = Number(process.env.PORT || 3000);
const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ service: 'isp-monitoring-api', status: 'ok' })); });
server.listen(port, () => console.log(`ISP Monitoring API listening on ${port}`));