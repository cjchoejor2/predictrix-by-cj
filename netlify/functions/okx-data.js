const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Get query parameters
    const { symbol, interval, limit } = event.queryStringParameters || {};
    
    if (!symbol || !interval) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          code: "400", 
          msg: "Missing required parameters: symbol and interval are required" 
        })
      };
    }

    // Convert symbol to OKX format (BTCUSDT → BTC-USDT)
    const okxSymbol = symbol.replace(/([A-Z]+)(USDT)/, '$1-$2');
    
    // Map interval to OKX format
    const intervalMap = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '1h': '1H',
      '2h': '2H',
      '4h': '4H',
      '1d': '1D'
    };
    
    const okxInterval = intervalMap[interval] || '1H';
    const limitValue = limit || 100;
    
    // Construct OKX API URL
    const url = `https://www.okx.com/api/v5/market/candles?instId=${okxSymbol}&bar=${okxInterval}&limit=${limitValue}`;
    
    console.log(`Fetching data from OKX: ${url}`);
    
    // Fetch data from OKX
    const response = await fetch(url);
    const data = await response.json();
    
    // Return the data with CORS headers
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
    
  } catch (error) {
    console.error('Function error:', error);
    
    // Return error with CORS headers
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        code: "500", 
        msg: `Server error: ${error.message}` 
      })
    };
  }
};
