const sheets = require('../src/sheets');

module.exports = async (req, res) => {
  // Set CORS headers so that it can be accessed from anywhere if needed
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const data = await sheets.fetchSheetData();
    res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching sheet data for Vercel API:', err.message);
    res.status(500).json({ error: 'Failed to read educational books data' });
  }
};
