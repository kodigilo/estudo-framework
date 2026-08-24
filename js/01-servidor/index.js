const http = require('node:http');

http.createServer((req, res) => {
  if (req.method === 'POST') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      console.log('Headers:', req.headers);
      console.log('Body bruto:', body);

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('recebido');
    });

    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ola mundo');
}).listen(3001);
