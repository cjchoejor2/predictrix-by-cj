import { OPENAI_API_KEY } from './config.js';
// Global variables
let tvWidget = null;
let currentSymbol = 'BTCUSDT';
let currentInterval = '15';

// Initialize the TradingView chart when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the TradingView widget with saved drawings
  initTradingViewWithSavedDrawings();
  
  // Set up event listeners
  setupEventListeners();
  
  // Update last updated time
  updateLastUpdated();
  
  // Add analysis styles
  addAnalysisStyles();
});

// Initialize the TradingView widget with saved drawings
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
    setTimeout(initTradingViewWithSavedDrawings, 1000);
    return;
  }
  
  // Get current symbol and interval from selectors
  let currentSymbol = 'BTCUSDT';
  let currentInterval = '15';
  
  const symbolSelect = document.getElementById('chartSymbol');
  const intervalSelect = document.getElementById('chartInterval');
  
  if (symbolSelect && intervalSelect) {
    currentSymbol = symbolSelect.value;
    currentInterval = intervalSelect.value;
  }
  
  // Load saved drawings from localStorage
  const savedDrawings = localStorage.getItem(`tv-drawings-${currentSymbol}-${currentInterval}`);
  
  try {
    // Create the TradingView widget
    tvWidget = new TradingView.widget({
      container_id: "tradingview_chart_container", // Use the correct ID
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
  
  // Drawing tool buttons
  setupDrawingTools();
}

// Setup drawing tools
function setupDrawingTools() {
  const toolButtons = {
    'tool-fib-retracement': 'FibRetracement',
    'tool-fib-timezone': 'FibTimeZone',
    'tool-fib-fan': 'FibFan',
    'tool-trend': 'TrendLine',
    'tool-clear': 'clear'
  };
  
  Object.entries(toolButtons).forEach(([buttonId, toolName]) => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener('click', () => {
        if (tvWidget && tvWidget.activeChart) {
          if (toolName === 'clear') {
            // Clear all drawings
            tvWidget.activeChart().removeAllShapes();
            tvWidget.activeChart().removeAllStudies();
            
            // Clear from localStorage
            localStorage.removeItem(`tv-drawings-${currentSymbol}-${currentInterval}`);
          } else {
            // Activate drawing tool
            tvWidget.activeChart().createDrawing(toolName);
          }
        }
      });
    }
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
    // Show loading state
    showAnalysisLoading(true);
    
    // Get current symbol and timeframe
    const symbol = document.getElementById('chartSymbol').value;
    const interval = document.getElementById('chartInterval').value;
    
    // Extract data from TradingView chart
    let chartData = {};
    if (tvWidget && tvWidget.activeChart) {
      try {
        // Get visible series data
        const symbolInfo = tvWidget.activeChart().symbolInfo();
        const visibleRange = tvWidget.activeChart().getVisibleRange();
        const priceScale = tvWidget.activeChart().priceScale();
        
        // Get studies/indicators on the chart
        const studies = tvWidget.activeChart().getAllStudies();
        const studyNames = studies.map(s => s.name).join(", ");
        
        // Get price data if available
        chartData = {
          symbol: symbolInfo.name,
          interval: interval,
          currentPrice: symbolInfo.last || "Unknown",
          priceChange: symbolInfo.change || "Unknown",
          percentChange: symbolInfo.change_percent || "Unknown",
          volume: symbolInfo.volume || "Unknown",
          indicators: studyNames || "None",
          timeframe: `${visibleRange.from} to ${visibleRange.to}`,
          trend: symbolInfo.last > symbolInfo.prev_close ? "bullish" : "bearish"
        };
      } catch (e) {
        console.warn('Could not extract all chart data:', e);
      }
    }
    
    // Fetch additional OHLCV data using your existing API
    const apiUrl = `/.netlify/functions/okx-data?symbol=${symbol}&interval=${interval}&limit=100`;
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
      ...chartData,
      candles: candles.slice(-10), // Send only the last 10 candles to save tokens
      indicators: {
        sma20,
        sma50,
        rsi14
      },
      keyLevels: keyLevels.map(l => ({
        price: l.level.toFixed(2),
        type: l.type,
        significance: l.significance
      }))
    };
    
    // Create a prompt for GPT-3.5
    const prompt = `
      You are a professional crypto market analyst. I'm providing you with data from a TradingView chart for ${symbol} on the ${interval} timeframe.
      
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
        model: "gpt-3.5-turbo",
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
    
    showAnalysisLoading(false);
    
  } catch (error) {
    console.error('Error analyzing chart:', error);
    showAnalysisError(error.message);
    showAnalysisLoading(false);
  }
}

// Helper functions for technical indicators
function calculateSMA(values, period) {
  if (values.length < period) return null;
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
  // Update Fibonacci Levels table
  const fibLevelsTable = document.getElementById('fibLevelsTable');
  if (fibLevelsTable && analysisData.keyLevels) {
    // Clear existing content except header
    const header = fibLevelsTable.querySelector('.fib-row.header');
    fibLevelsTable.innerHTML = '';
    if (header) {
      fibLevelsTable.appendChild(header);
    }
    
    // Add new levels
    analysisData.keyLevels.forEach(level => {
      const row = document.createElement('div');
      row.className = 'fib-row';
      
      const typeCell = document.createElement('div');
      typeCell.className = 'fib-cell';
      typeCell.textContent = level.type.charAt(0).toUpperCase() + level.type.slice(1);
      
      const priceCell = document.createElement('div');
      priceCell.className = 'fib-cell';
      priceCell.textContent = level.price;
      
      const actionCell = document.createElement('div');
      actionCell.className = 'fib-cell';
      
      if (level.type === 'support') {
        actionCell.textContent = 'Buy near';
        actionCell.style.color = 'var(--success)';
      } else if (level.type === 'resistance') {
        actionCell.textContent = 'Sell near';
        actionCell.style.color = 'var(--danger)';
      } else {
        actionCell.textContent = 'Watch for reversal';
      }
      
      row.appendChild(typeCell);
      row.appendChild(priceCell);
      row.appendChild(actionCell);
      
      fibLevelsTable.appendChild(row);
    });
  }
  
  // Update Trading Strategy panel
  const entryPointsEl = document.getElementById('entryPoints');
  const takeProfitLevelsEl = document.getElementById('takeProfitLevels');
  const stopLossLevelsEl = document.getElementById('stopLossLevels');
  const keyAreasEl = document.getElementById('keyAreas');
  
  if (entryPointsEl && analysisData.entryPoints) {
    entryPointsEl.textContent = analysisData.entryPoints.join(', ');
    entryPointsEl.style.color = analysisData.direction === 'bullish' ? 'var(--success)' : 'var(--danger)';
  }
  
  if (takeProfitLevelsEl && analysisData.takeProfitLevels) {
    takeProfitLevelsEl.textContent = analysisData.takeProfitLevels.join(', ');
    takeProfitLevelsEl.style.color = 'var(--success)';
  }
  
  if (stopLossLevelsEl && analysisData.stopLossLevels) {
    stopLossLevelsEl.textContent = analysisData.stopLossLevels.join(', ');
    stopLossLevelsEl.style.color = 'var(--danger)';
  }
  
  if (keyAreasEl && analysisData.keyLevels) {
    const keyAreas = analysisData.keyLevels
      .filter(level => level.significance === 'high')
      .map(level => `${level.type} at ${level.price}`)
      .join(', ');
    keyAreasEl.textContent = keyAreas || 'None identified';
  }
  
  // Update Detailed Analysis
  const detailedAnalysisEl = document.getElementById('detailedAnalysis');
  if (detailedAnalysisEl && analysisData.reasoning) {
    // Create a styled analysis with direction indicator
    const directionClass = analysisData.direction === 'bullish' ? 'bullish' : 
                          (analysisData.direction === 'bearish' ? 'bearish' : 'neutral');
    
    detailedAnalysisEl.innerHTML = `
      <h3>🧠 Market Analysis <span class="direction-badge ${directionClass}">${analysisData.direction.toUpperCase()}</span></h3>
      <div class="analysis-content">
        <p class="risk-reward">Risk/Reward Ratio: <strong>${analysisData.riskReward || 'N/A'}</strong></p>
        <div class="reasoning">
          ${formatAnalysisText(analysisData.reasoning)}
        </div>
      </div>
    `;
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

// Show loading state for analysis
function showAnalysisLoading(isLoading) {
  const detailedAnalysisEl = document.getElementById('detailedAnalysis');
  if (detailedAnalysisEl) {
    if (isLoading) {
      detailedAnalysisEl.innerHTML = `
        <h3>🧠 Market Analysis</h3>
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>Analyzing market conditions...</p>
        </div>
      `;
    }
  }
}

// Show error message for analysis
function showAnalysisError(errorMessage) {
  const detailedAnalysisEl = document.getElementById('detailedAnalysis');
  if (detailedAnalysisEl) {
    detailedAnalysisEl.innerHTML = `
      <h3>🧠 Market Analysis</h3>
      <div class="error-container">
        <p>Error analyzing chart: ${errorMessage}</p>
        <p>Please try again or check your API configuration.</p>
      </div>
    `;
  }
}

// Add analysis styles
function addAnalysisStyles() {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .loading-spinner {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: var(--primary);
      animation: spin 1s ease-in-out infinite;
      margin: 0 auto;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      gap: 10px;
    }
    
    .error-container {
      background-color: rgba(214, 48, 49, 0.1);
      border-left: 3px solid var(--danger);
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    
    .direction-badge {
      font-size: 12px;
      padding: 3px 8px;
      border-radius: 12px;
      margin-left: 10px;
      font-weight: 600;
    }
    
    .direction-badge.bullish {
      background-color: var(--success);
      color: white;
    }
    
    .direction-badge.bearish {
      background-color: var(--danger);
      color: white;
    }
    
    .direction-badge.neutral {
      background-color: var(--warning);
      color: #333;
    }
    
    .risk-reward {
      font-size: 14px;
      margin-bottom: 15px;
      padding: 8px 12px;
      background-color: var(--bg-tertiary);
      border-radius: 6px;
      display: inline-block;
    }
    
    .reasoning {
      line-height: 1.6;
      font-size: 14px;
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
