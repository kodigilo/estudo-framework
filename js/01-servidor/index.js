const http = require('node:http');
const { route } = require('./functions');

http.createServer((req, res) => {
  // if (req.method === 'POST') {
  //   let body = '';
  //
  //   req.on('data', (chunk) => {
  //     body += chunk;
  //   });
  //
  //   req.on('end', () => {
  //     console.log('Headers:', req.headers);
  //     console.log('Body bruto:', body);
  //
  //     res.writeHead(200, { 'Content-Type': 'text/plain' });
  //     res.end('recebido');
  //   });
  //
  //   return;
  // }
  //
  // res.writeHead(200, { 'Content-Type': 'text/plain' });
  // res.end('ola mundo');

  if (route(req, res, '/quem-somos', 'quem_somos.js')) return;
  if (route(req, res, '/contato', 'contato.js')) return;
  if (route(req, res, '/blog', 'blog.js')) return;
  if (route(req, res, '/', 'home.js')) return;

  res.end('não encontrado');
}).listen(3001);
