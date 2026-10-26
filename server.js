const express = require('express');
const compression = require('compression'); 
const path = require('path');
const app = express();

app.use(compression({
    level: 9,
    threshold: 0,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '365d',
  immutable: true
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/:page', (req, res) => {
    const filePath = path.join(__dirname, req.params.page);
    res.sendFile(filePath);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on https://abzarbook.ir with ultra-compression enabled.`);
});
