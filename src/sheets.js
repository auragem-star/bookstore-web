const axios = require('axios');
const NodeCache = require('node-cache');

// Cache data for 5 minutes (300 seconds)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const CACHE_KEY = 'sheet_data';

const GRADE_MAPPING = [
  { name: "كي جي 1", col: 0 },
  { name: "كي جي 2", col: 2 },
  { name: "1 ابتدائي", col: 4 },
  { name: "2 ابتدائي", col: 6 },
  { name: "3 ابتدائي", col: 8 },
  { name: "4 ابتدائي", col: 10 },
  { name: "5 ابتدائي", col: 12 },
  { name: "6 ابتدائي", col: 14 },
  { name: "1 إعدادي", col: 17 },
  { name: "2 إعدادي", col: 19 },
  { name: "3 إعدادي", col: 21 },
  { name: "1 ثانوي", col: 23 },
  { name: "2 ثانوي", col: 25 },
  { name: "3 ثانوي", col: 27 }
];

/**
 * Split CSV line respecting quotes
 */
function splitCSVLine(line) {
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
}

/**
 * Check if a string is numeric (a price)
 */
function isPrice(val) {
  if (!val) return false;
  // Match digits, decimals, and optional arabic/english price suffixes
  const trimmed = val.replace(/[\u0660-\u0669]/g, d => d.charCodeAt(0) - 1632) // Convert Arabic digits to English
                     .trim();
  return /^\d+(\.\d+)?$/.test(trimmed);
}

/**
 * Format price to float
 */
function parsePrice(val) {
  if (!val) return 0;
  const clean = val.replace(/[\u0660-\u0669]/g, d => d.charCodeAt(0) - 1632).trim();
  return parseFloat(clean);
}

/**
 * Fetch and parse Google Sheet
 */
async function fetchSheetData() {
  const cachedData = cache.get(CACHE_KEY);
  if (cachedData) {
    return cachedData;
  }

  const csvUrl = process.env.SHEET_CSV_URL || 'https://docs.google.com/spreadsheets/d/1dJMN6Bv9heYDzQHJfg1_PyUwcNmp0CR18H0rWBKouJ8/export?format=csv';
  
  try {
    const response = await axios.get(csvUrl, { responseType: 'arraybuffer' });
    // Google Sheets uses UTF-8, but let's decode correctly
    const decoder = new TextDecoder('utf-8');
    const csvText = decoder.decode(response.data);
    
    const lines = csvText.split(/\r?\n/);
    const rows = lines.map(splitCSVLine);

    // Find the header row containing "كي جي 1"
    const headerRowIndex = rows.findIndex(row => row.some(cell => cell.includes('كي جي 1')));
    if (headerRowIndex === -1) {
      throw new Error('Could not find header row in Google Sheet');
    }

    // Initialize data structures for each grade
    const bookstoreData = {};
    const currentPublishers = {};
    
    GRADE_MAPPING.forEach(g => {
      bookstoreData[g.name] = [];
      currentPublishers[g.name] = ''; // Keep track of current publisher section
    });

    // Parse data rows
    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      GRADE_MAPPING.forEach(grade => {
        const hCol = grade.col;
        if (hCol >= row.length) return;

        const valH = row[hCol] ? row[hCol].trim() : '';
        const valHNext = row[hCol + 1] ? row[hCol + 1].trim() : '';

        if (!valH && !valHNext) {
          return; // Empty cell pair, skip
        }

        if (isPrice(valH)) {
          // If valH is a price, then valHNext is the book name
          if (valHNext) {
            const price = parsePrice(valH);
            const bookName = valHNext;
            const publisher = currentPublishers[grade.name] || '';
            const displayName = publisher ? `${bookName} (${publisher})` : bookName;
            
            bookstoreData[grade.name].push({
              name: displayName,
              price: price,
              publisher: publisher,
              rawName: bookName
            });
          }
        } else {
          // If valH is not a price, check if it's a publisher header
          // Typically, a publisher row has a value in row[H] and empty in row[H+1]
          if (valH && !valHNext) {
            // Update active publisher for this grade
            // Exclude common words like "الكتب المتوفرة" if they appear
            if (!valH.includes('الكتب') && !valH.includes('مكتبة')) {
              currentPublishers[grade.name] = valH;
            }
          }
        }
      });
    }

    // Sort books inside each grade alphabetically
    Object.keys(bookstoreData).forEach(grade => {
      bookstoreData[grade].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    });

    cache.set(CACHE_KEY, bookstoreData);
    return bookstoreData;
  } catch (error) {
    console.error('Error fetching/parsing Google Sheet:', error.message);
    throw error;
  }
}

module.exports = {
  fetchSheetData,
  GRADE_MAPPING
};
