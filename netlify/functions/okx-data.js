const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    // Get parameters from query string
    const { symbol, interval, limit } = event.queryStringParameters || {};
    
    if (!symbol || !interval || !limit) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required parameters" })
      };
    }
    
    // Convert symbol to OKX format
    const okxSymbol = symbol.replace(/([A-Z]+)(USDT)/, '$1-$2');
    
    // Define interval mapping
    const intervalMap = {
      '1m': '1m', '5m': '5m', '15m': '15m',
      '1h': '1H', '2h': '2H', '4h': '4H', '1d': '1D'
    };
    
    const okxInterval = intervalMap[interval] || '1H';
    const apiUrl = `https://www.okx.com/api/v5/market/candles?instId=${okxSymbol}&bar=${okxInterval}&limit=${limit}`;
    
    console.log("Fetching from OKX:", apiUrl);
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.log("Function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
