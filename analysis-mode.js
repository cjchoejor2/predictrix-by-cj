import { OPENAI_API_KEY } from './config.js';

// Global variables
let tvWidget = null;
let currentSymbol = 'BTCUSDT';
let currentInterval = '15';

// Initialize the TradingView chart when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Wait a moment to ensure DOM is fully loaded
  setTimeout(() => {
    // Initialize the TradingView widget with saved drawings
    initTradingViewWithSavedDrawings();
    
    // Set up event listeners
    setupEventListeners();
    
    // Update last updated time
    updateLastUpdated();
    
    // Add analysis styles
    addAnalysisStyles();
  }, 100);
});

// Initialize the TradingView widget with saved drawings
function initTradingViewWithSavedDrawings() {
  // Make sure the container exists
  const container = document.getElementById('tradingview_chart_container');
  if (!container) {
    console.error('TradingView container not found');
    return;
  }
  
  // Make sure TradingView library is loaded
  if (typeof TradingView === 'undefined') {
    console.error('TradingView library not loaded');
    // Try to load it again or wait
    setTimeout(initTradingViewWithSavedDrawings, 500);
    return;
  }
  
  // Get current symbol and interval from selectors
  const symbolSelect = document.getElementById('chartSymbol');
  const intervalSelect = document.getElementById('chartInterval');
  
  if (symbolSelect && intervalSelect) {
    currentSymbol = symbolSelect.value;
    currentInterval = intervalSelect.value;
  }
  
  // Load saved drawings from localStorage
  const savedDrawings = localStorage.getItem(`tv-drawings-${currentSymbol}-${currentInterval}`);
  
  try {
    // Create the TradingView widget with minimal configuration first
    tvWidget = new TradingView.widget({
      container_id: "tradingview_chart_container",
      width: "100%",
      height: "600px",
      symbol: `OKEX:${currentSymbol}`,
      interval: currentInterval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1", // Candles
      locale: "en",
      toolbar_bg: "#1E1E2D",
      enable_publishing: false,
      withdateranges: true,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      save_image: true,
      studies: [
        "MASimple@tv-basicstudies",
        "RSI@tv-basicstudies",
        "MACD@tv-basicstudies",
        "BB@tv-basicstudies"
      ],
      saved_data: savedDrawings ? JSON.parse(savedDrawings) : null,
      drawings_access: {
        type: 'fullaccess',
        tools: [
          { name: "Trend Line" },
          { name: "Fibonacci Retracement" },
          { name: "Fibonacci Fan" },
          { name: "Fibonacci Time Zone" },
          { name: "Rectangle" },
          { name: "Ellipse" },
          { name: "Path" },
          { name: "Polyline" },
          { name: "Text" }
        ]
      }
    });
    
    // Save drawings when they change
    tvWidget.onChartReady(() => {
      console.log("TradingView chart is ready");
      // Save drawings when chart is modified
      tvWidget.subscribe('onAutoSaveNeeded', () => {
        tvWidget.save(chartData => {
          localStorage.setItem(`tv-drawings-${currentSymbol}-${currentInterval}`, JSON.stringify(chartData));
        });
      });
      
      // Also save when user manually adds a drawing
      tvWidget.subscribe('onDrawingComplete', () => {
        tvWidget.save(chartData => {
          localStorage.setItem(`tv-drawings-${currentSymbol}-${currentInterval}`, JSON.stringify(chartData));
        });
      });
    });
    
    console.log("TradingView widget initialized");
  } catch (error) {
    console.error("Error initializing TradingView widget:", error);
  }
}

// Set up event listeners
function setupEventListeners() {
  // Mode toggle
  const modeToggle = document.getElementById('modeToggle');
  if (modeToggle) {
    modeToggle.addEventListener('change', function() {
      if (!this.checked) {
        // If unchecked, redirect to index.html (dashboard view)
        window.location.href = 'index.html';
      }
    });
  }
  
  // Fullscreen toggle
  const toggleFullscreenBtn = document.getElementById('toggleFullscreen');
  if (toggleFullscreenBtn) {
    toggleFullscreenBtn.addEventListener('click', toggleFullscreen);
  }
  
  // Analyze button
  const analyzeChartBtn = document.getElementById('analyzeChartBtn');
  if (analyzeChartBtn) {
    analyzeChartBtn.addEventListener('click', analyzeTradingViewChart);
  }
  
  // Symbol and interval change handlers
  const symbolSelect = document.getElementById('chartSymbol');
  const intervalSelect = document.getElementById('chartInterval');
  
  if (symbolSelect) {
    symbolSelect.addEventListener('change', () => {
      // Save current drawings before changing symbol
      if (tvWidget) {
        tvWidget.save(chartData => {
          localStorage.setItem(`tv-drawings-${currentSymbol}-${currentInterval}`, JSON.stringify(chartData));
        });
      }
      
      // Update current symbol
      currentSymbol = symbolSelect.value;
      
      // Reinitialize with new symbol
      if (tvWidget && tvWidget.activeChart) {
        tvWidget.activeChart().setSymbol(`OKEX:${currentSymbol}`, () => {
          // Load saved drawings for new symbol/interval combination
          const savedDrawings = localStorage.getItem(`tv-drawings-${currentSymbol}-${currentInterval}`);
          if (savedDrawings) {
            tvWidget.load(JSON.parse(savedDrawings));
          }
        });
      }
    });
  }
  
  if (intervalSelect) {
    intervalSelect.addEventListener('change', () => {
      // Save current drawings before changing interval
      if (tvWidget) {
        tvWidget.save(chartData => {
          localStorage.setItem(`tv-drawings-${currentSymbol}-${currentInterval}`, JSON.stringify(chartData));
        });
      }
      
      // Update current interval
      currentInterval = intervalSelect.value;
      
      // Reinitialize with new interval
      if (tvWidget && tvWidget.activeChart) {
        tvWidget.activeChart().setResolution(currentInterval, () => {
          // Load saved drawings for new symbol/interval combination
          const savedDrawings = localStorage.getItem(`tv-drawings-${currentSymbol}-${currentInterval}`);
          if (savedDrawings) {
            tvWidget.load(JSON.parse(savedDrawings));
          }
        });
      }
    });
  }
  
  // Set up tab switching
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and content
      tabButtons.forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked button and corresponding content
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
}

// Toggle fullscreen
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.error(`Error attempting to enable fullscreen: ${err.message}`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

// Update last updated time
// Update last updated time
function updateLastUpdated() {
    const lastUpdatedEl = document.getElementById('lastUpdated');
    if (lastUpdatedEl) {
      lastUpdatedEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }
  }
  
  // Function to analyze the TradingView chart
  async function analyzeTradingViewChart() {
    try {
      // Show loading state
      const analyzeChartBtn = document.getElementById('analyzeChartBtn');
      if (analyzeChartBtn) {
        analyzeChartBtn.disabled = true;
        analyzeChartBtn.innerHTML = `
          <div class="loading-spinner"></div>
          Analyzing...
        `;
      }
      
      // Update timestamp
      const timestampEl = document.getElementById('analysisTimestamp');
      if (timestampEl) {
        timestampEl.textContent = `Analyzing... (${new Date().toLocaleTimeString()})`;
      }
      
      // Show loading in detailed analysis
      const detailedAnalysisEl = document.getElementById('detailedAnalysis');
      if (detailedAnalysisEl) {
        detailedAnalysisEl.innerHTML = `
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Analyzing market conditions...</p>
          </div>
        `;
      }
      
      // Analyze the chart with AI
      await analyzeChartWithAI();
      
      // Reset button state
      if (analyzeChartBtn) {
        analyzeChartBtn.disabled = false;
        analyzeChartBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2"/>
            <path d="M12 7V12L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          ANALYZE
        `;
      }
      
      // Update timestamp
      if (timestampEl) {
        timestampEl.textContent = `Last analyzed: ${new Date().toLocaleTimeString()}`;
      }
      
    } catch (error) {
      console.error('Error in chart analysis:', error);
      
      // Reset button state
      const analyzeChartBtn = document.getElementById('analyzeChartBtn');
      if (analyzeChartBtn) {
        analyzeChartBtn.disabled = false;
        analyzeChartBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2"/>
            <path d="M12 7V12L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          ANALYZE
        `;
      }
      
      // Show error message
      showAnalysisError(error.message);
    }
  }
  
  // Function to analyze the chart using ChatGPT
  async function analyzeChartWithAI() {
    try {
      // Get current symbol and timeframe
      const symbol = document.getElementById('chartSymbol').value;
      const interval = document.getElementById('chartInterval').value;
      
      // Fetch market data using your existing API
      const apiUrl = `/.netlify/functions/okx-data?symbol=${symbol}&interval=${mapInterval(interval)}&limit=100`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const data = await response.json();
      if (data.code !== "0" || !data.data || data.data.length === 0) {
        throw new Error('No candle data available for this pair');
      }
      
      // Process the candle data
      const candles = data.data.map(item => ({
        timestamp: new Date(parseInt(item[0])).toISOString(),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5])
      })).reverse();
      
      // Calculate some basic indicators
      const closes = candles.map(c => c.close);
      const highs = candles.map(c => c.high);
      const lows = candles.map(c => c.low);
      
      // Simple Moving Averages
      const sma20 = calculateSMA(closes, 20);
      const sma50 = calculateSMA(closes, 50);
      
      // RSI
      const rsi14 = calculateRSI(closes, 14);
      
      // Support and resistance levels (simple implementation)
      const recentHigh = Math.max(...highs.slice(-30));
      const recentLow = Math.min(...lows.slice(-30));
      
      // Identify key price levels
      const currentPrice = closes[closes.length - 1];
      const priceRange = recentHigh - recentLow;
      const keyLevels = [
        { level: recentHigh, type: "resistance", significance: "high" },
        { level: recentLow, type: "support", significance: "high" },
        { level: recentLow + priceRange * 0.382, type: "fibonacci", significance: "medium" },
        { level: recentLow + priceRange * 0.618, type: "fibonacci", significance: "medium" }
      ];
      
      // Prepare detailed chart data for GPT
      const detailedChartData = {
        symbol: symbol,
        interval: getIntervalName(interval),
        currentPrice: currentPrice.toFixed(2),
        priceChange: ((closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2] * 100).toFixed(2) + '%',
        volume: candles[candles.length - 1].volume.toFixed(2),
        candles: candles.slice(-10), // Send only the last 10 candles to save tokens
        indicators: {
          sma20: sma20.toFixed(2),
          sma50: sma50.toFixed(2),
          rsi14: rsi14.toFixed(2)
        },
        keyLevels: keyLevels.map(l => ({
          price: l.level.toFixed(2),
          type: l.type,
          significance: l.significance
        }))
      };
      
      // Create a prompt for GPT-3.5
      const prompt = `
        You are a professional crypto market analyst. I'm providing you with data from a chart for ${symbol} on the ${getIntervalName(interval)} timeframe.
        
        Please analyze this data and provide a detailed technical analysis including:
        1. Overall market direction (bullish, bearish, or neutral)
        2. Key support and resistance levels
        3. Entry points for potential trades
        4. Take profit targets
        5. Stop loss recommendations
        6. Risk/reward ratio
        
        Here's the chart data:
        ${JSON.stringify(detailedChartData, null, 2)}
        
        Format your response as a JSON object with the following structure:
        {
          "direction": "bullish/bearish/neutral",
          "entryPoints": ["price1", "price2"],
          "takeProfitLevels": ["tp1", "tp2", "tp3"],
          "stopLossLevels": ["sl1"],
          "riskReward": "1:X",
          "keyLevels": [
            {"type": "support/resistance/fib", "price": "value", "significance": "high/medium/low"}
          ],
          "reasoning": "Your detailed analysis here"
        }
      `;
      
      // Call the OpenAI API
      const apiKey = OPENAI_API_KEY;
      
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 1000
        })
      });
      
      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || openaiResponse.statusText}`);
      }
      
      const gptData = await openaiResponse.json();
      const analysisText = gptData.choices[0].message.content;
      
      // Parse the JSON response
      try {
        const analysisData = JSON.parse(analysisText);
        updateAnalysisUI(analysisData);
      } catch (parseError) {
        console.error('Error parsing JSON from OpenAI:', parseError);
        console.log('Raw response:', analysisText);
        
        // Try to extract JSON from the text if it's not pure JSON
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extractedJson = jsonMatch[0];
            const analysisData = JSON.parse(extractedJson);
            updateAnalysisUI(analysisData);
          } catch (e) {
            throw new Error('Could not parse analysis results. The AI response was not in the expected format.');
          }
        } else {
          throw new Error('Could not parse analysis results. The AI response was not in the expected format.');
        }
      }
      
    } catch (error) {
      console.error('Error analyzing chart:', error);
      showAnalysisError(error.message);
    }
  }
  
  // Helper function to map TradingView intervals to API intervals
  function mapInterval(tvInterval) {
    const intervalMap = {
      '1': '1m',
      '5': '5m',
      '15': '15m',
      '60': '1h',
      '240': '4h',
      'D': '1d'
    };
    return intervalMap[tvInterval] || '15m';
  }
  
  // Helper function to get interval name for display
  function getIntervalName(interval) {
    const intervalNames = {
      '1': '1 Minute',
      '5': '5 Minutes',
      '15': '15 Minutes',
      '60': '1 Hour',
      '240': '4 Hours',
      'D': '1 Day'
    };
    return intervalNames[interval] || '15 Minutes';
  }
  
  // Helper functions for technical indicators
  function calculateSMA(values, period) {
    if (values.length < period) return 0;
    return values.slice(-period).reduce((sum, val) => sum + val, 0) / period;
  }
  
  function calculateRSI(closes, period) {
    if (closes.length <= period) return 50;
    let gains = 0, losses = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  // Update the UI with analysis results
  function updateAnalysisUI(analysisData) {
    // Update Trading Plan tab
    document.getElementById('tradeDirection').textContent = analysisData.direction.toUpperCase();
    document.getElementById('tradeDirection').className = analysisData.direction.toLowerCase();
    
    document.getElementById('entryPoints').textContent = analysisData.entryPoints.join(', ');
    document.getElementById('takeProfitLevels').textContent = analysisData.takeProfitLevels.join(', ');
    document.getElementById('stopLossLevels').textContent = analysisData.stopLossLevels.join(', ');
    document.getElementById('riskReward').textContent = analysisData.riskReward;
    
    // Update Key Levels tab
    const keyLevelsTable = document.getElementById('keyLevelsTable');
    // Clear existing rows except header
    while (keyLevelsTable.rows.length > 1) {
      keyLevelsTable.deleteRow(1);
    }
    
    // Add new key levels
    analysisData.keyLevels.forEach(level => {
      const row = keyLevelsTable.insertRow();
      
      const typeCell = row.insertCell();
      typeCell.textContent = level.type.charAt(0).toUpperCase() + level.type.slice(1);
      
      const priceCell = row.insertCell();
      priceCell.textContent = level.price;
      
      const significanceCell = row.insertCell();
      significanceCell.textContent = level.significance.charAt(0).toUpperCase() + level.significance.slice(1);
      significanceCell.className = level.significance.toLowerCase();
    });
    
    // Update Reasoning tab
    const detailedAnalysisEl = document.getElementById('detailedAnalysis');
    if (detailedAnalysisEl && analysisData.reasoning) {
      detailedAnalysisEl.innerHTML = formatAnalysisText(analysisData.reasoning);
    }
    
    // Update last updated time
    updateLastUpdated();
  }
  
  // Format analysis text with better styling
  function formatAnalysisText(text) {
    if (!text) return '';
    
    // Replace line breaks with paragraphs
    let formatted = text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
    
    // Wrap in paragraph if not already
    if (!formatted.startsWith('<p>')) {
      formatted = '<p>' + formatted;
    }
    if (!formatted.endsWith('</p>')) {
      formatted = formatted + '</p>';
    }
    
    // Highlight key terms
    const highlights = {
      'bullish': 'bullish-text',
      'bearish': 'bearish-text',
      'support': 'support-text',
      'resistance': 'resistance-text',
      'buy': 'bullish-text',
      'sell': 'bearish-text',
      'entry': 'highlight-text',
      'target': 'highlight-text',
      'stop loss': 'danger-text',
      'take profit': 'success-text'
    };
    
    Object.entries(highlights).forEach(([term, className]) => {
          const regex = new RegExp(`\\b${term}\\b`, 'gi');
    formatted = formatted.replace(regex, `<span class="${className}">$&</span>`);
  });
  
  return formatted;
}

// Show error message for analysis
function showAnalysisError(errorMessage) {
  const detailedAnalysisEl = document.getElementById('detailedAnalysis');
  if (detailedAnalysisEl) {
    detailedAnalysisEl.innerHTML = `
      <div class="error-container">
        <p>Error analyzing chart: ${errorMessage}</p>
        <p>Please try again or check your API configuration.</p>
      </div>
    `;
  }
  
  // Also update the trading plan fields
  document.getElementById('tradeDirection').textContent = 'ERROR';
  document.getElementById('tradeDirection').className = '';
  document.getElementById('entryPoints').textContent = '-';
  document.getElementById('takeProfitLevels').textContent = '-';
  document.getElementById('stopLossLevels').textContent = '-';
  document.getElementById('riskReward').textContent = '-';
  
  // Update timestamp
  const timestampEl = document.getElementById('analysisTimestamp');
  if (timestampEl) {
    timestampEl.textContent = `Error: ${new Date().toLocaleTimeString()}`;
  }
}

// Add analysis styles
function addAnalysisStyles() {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .analysis-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 20px;
      height: calc(100vh - 80px);
      overflow-y: auto;
    }
    
    .chart-controls {
      display: flex;
      gap: 15px;
      align-items: center;
      background-color: var(--bg-secondary);
      padding: 15px;
      border-radius: var(--border-radius);
      box-shadow: var(--box-shadow);
    }
    
    .control-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    
    .control-group label {
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    .control-group select {
      background-color: var(--bg-tertiary);
      color: var(--text-primary);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      padding: 8px 12px;
      font-size: 14px;
      min-width: 120px;
    }
    
    .analyze-btn {
      margin-left: auto;
      background-color: var(--primary);
      color: white;
      border: none;
      border-radius: 4px;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .analyze-btn:hover {
      background-color: var(--primary-light);
    }
    
    .analyze-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    .loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s ease-in-out infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .analysis-results {
      background-color: var(--bg-secondary);
      border-radius: var(--border-radius);
      box-shadow: var(--box-shadow);
      overflow: hidden;
    }
    
    .analysis-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .analysis-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    
    .analysis-timestamp {
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    .analysis-content {
      padding: 0;
    }
    
    .analysis-tabs {
      display: flex;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .tab-button {
      padding: 12px 20px;
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      border-bottom: 2px solid transparent;
    }
    
    .tab-button:hover {
      color: var(--text-primary);
    }
    
    .tab-button.active {
      color: var(--primary-light);
      border-bottom-color: var(--primary-light);
    }
    
    .tab-content {
      display: none;
      padding: 20px;
    }
    
    .tab-content.active {
      display: block;
    }
    
    .analysis-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .analysis-table th, .analysis-table td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .analysis-table th {
      font-weight: 500;
      color: var(--text-secondary);
      width: 30%;
    }
    
    .bullish {
      color: var(--success);
    }
    
    .bearish {
      color: var(--danger);
    }
    
    .neutral {
      color: var(--warning);
    }
    
    .high {
      color: var(--primary-light);
      font-weight: 500;
    }
    
    .medium {
      color: var(--text-primary);
    }
    
    .low {
      color: var(--text-secondary);
    }
    
    .reasoning-content {
      line-height: 1.6;
      font-size: 14px;
    }
    
    .error-container {
      background-color: rgba(214, 48, 49, 0.1);
      border-left: 3px solid var(--danger);
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      gap: 10px;
    }
    
    .bullish-text { color: var(--success); font-weight: 500; }
    .bearish-text { color: var(--danger); font-weight: 500; }
    .support-text { color: var(--support); font-weight: 500; }
    .resistance-text { color: var(--resistance); font-weight: 500; }
    .highlight-text { color: var(--primary-light); font-weight: 500; }
    .danger-text { color: var(--danger); font-weight: 500; }
    .success-text { color: var(--success); font-weight: 500; }
  `;
  
  document.head.appendChild(styleEl);
}
