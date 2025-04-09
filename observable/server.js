const express = require('express');
const path = require('path');

const app = express();

// Serve static files from node_modules
app.use('/@observablehq/runtime', express.static(path.join(__dirname, 'node_modules/@observablehq/runtime/dist')));
app.use('/@observablehq/stdlib', express.static(path.join(__dirname, 'node_modules/@observablehq/stdlib/dist')));

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
}); 