require('dotenv').config();
const express = require('express');
const path = require('path');
const sheets = require('./sheets');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Books API Endpoint
// Fetches data from Google Sheets (cached) and returns it as JSON
app.get('/api/books', async (req, res) => {
  try {
    const data = await sheets.fetchSheetData();
    res.json(data);
  } catch (err) {
    console.error('Error fetching sheet data for API:', err.message);
    res.status(500).json({ error: 'Failed to read educational books data' });
  }
});

// Root endpoint serves the interactive wizard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Local Web App URL: http://localhost:${PORT}`);
  console.log(`Books API Endpoint: http://localhost:${PORT}/api/books`);
});
