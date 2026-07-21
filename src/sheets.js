const fs = require('fs');
const path = require('path');
const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const CACHE_KEY = 'sheet_data_v2';

/**
 * Fetch books data from local JSON fallback or remote CSV/API
 */
async function fetchSheetData() {
  const cachedData = cache.get(CACHE_KEY);
  if (cachedData) {
    return cachedData;
  }

  try {
    // 1. Check if remote CSV URL is provided
    if (process.env.SHEET_CSV_URL) {
      try {
        const response = await axios.get(process.env.SHEET_CSV_URL, { responseType: 'arraybuffer' });
        const decoder = new TextDecoder('utf-8');
        const csvText = decoder.decode(response.data);
        const parsedFromCsv = parseCsvStructure(csvText);
        if (parsedFromCsv && parsedFromCsv.length > 0) {
          cache.set(CACHE_KEY, parsedFromCsv);
          return parsedFromCsv;
        }
      } catch (remoteErr) {
        console.warn('Could not load remote Google Sheet CSV, falling back to local dataset:', remoteErr.message);
      }
    }

    // 2. Fallback to pre-bundled books_data.json
    const jsonPath = path.join(__dirname, 'books_data.json');
    if (fs.existsSync(jsonPath)) {
      const fileData = fs.readFileSync(jsonPath, 'utf8');
      const booksList = JSON.parse(fileData);
      cache.set(CACHE_KEY, booksList);
      return booksList;
    }

    return [];
  } catch (error) {
    console.error('Error fetching sheet data:', error.message);
    throw error;
  }
}

/**
 * Simple CSV parser for Google Sheet CSV fallback
 */
function parseCsvStructure(csvText) {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 8) return [];

  // Simple row splitter respecting quotes
  const rows = lines.map(line => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });

  const gradeCols = [
    { col: 3, id: 'كي جي 1', stage: 'kg' },
    { col: 4, id: 'كي جي 2', stage: 'kg' },
    { col: 5, id: '1 ابتدائي', stage: 'primary' },
    { col: 6, id: '2 ابتدائي', stage: 'primary' },
    { col: 7, id: '3 ابتدائي', stage: 'primary' },
    { col: 8, id: '4 ابتدائي', stage: 'primary' },
    { col: 9, id: '5 ابتدائي', stage: 'primary' },
    { col: 10, id: '6 ابتدائي', stage: 'primary' },
    { col: 11, id: '1 إعدادي', stage: 'prep' },
    { col: 12, id: '2 إعدادي', stage: 'prep' },
    { col: 13, id: '3 إعدادي', stage: 'prep' },
    { col: 14, id: '1 ثانوي', stage: 'sec' },
    { col: 15, id: '2 ثانوي', stage: 'sec' },
    { col: 16, id: '3 ثانوي', stage: 'sec' }
  ];

  let currentPathway = 'عربي';
  let currentCompany = '';
  const items = [];

  for (let r = 7; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const valA = row[0] ? row[0].trim() : '';
    const valB = row[1] ? row[1].trim() : '';
    const valC = row[2] ? row[2].trim() : '';

    if (valA) {
      if (valA.includes('لغات')) currentPathway = 'لغات';
      else if (valA.includes('أزهر') || valA.includes('ازهري')) currentPathway = 'أزهر';
      else if (valA.includes('عربي')) currentPathway = 'عربي';
    }

    if (valB) {
      currentCompany = valB;
    }

    if (valC) {
      gradeCols.forEach(g => {
        if (g.col < row.length) {
          const rawPrice = row[g.col] ? row[g.col].trim() : '';
          const cleanPrice = rawPrice.replace(/[\u0660-\u0669]/g, d => d.charCodeAt(0) - 1632);
          if (/^\d+(\.\d+)?$/.test(cleanPrice)) {
            const price = parseFloat(cleanPrice);
            if (price > 0) {
              items.push({
                pathway: currentPathway,
                company: currentCompany,
                subject: valC,
                grade: g.id,
                stage: g.stage,
                price: price
              });
            }
          }
        }
      });
    }
  }

  return items;
}

module.exports = {
  fetchSheetData
};
