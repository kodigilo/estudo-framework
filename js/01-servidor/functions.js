const fs = require('node:fs'); 
const path = require('node:path'); 

function route(req, res, url, page) {
  if (req.url === url) {
    const filePath = path.join(__dirname, 'pages', page);

    const content = fs.readFileSync(filePath, 'utf-8');

    res.end(content);

    return true;
  }

  return false;
}

module.exports = { route };
