import { OPENAI_API_KEY } from './config.js';
// Global variables
let tvWidget = null;
let currentSymbol = 'BTCUSDT';

// Initialize the TradingView chart when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the TradingView widget
  initializeTradingViewWidget();
  
  // Set up event listeners
  setupEventListeners();
  
  // Update last updated time
  updateLastUpdated();
  
  // Add analysis styles
  addAnalysisStyles();
});

// Initialize the TradingView widget
function initializeTradingViewWidget() {
  const container = document.getElementById('tradingview_chart_container');
  if (!container) {
    console.error('TradingView container not found');
    return;
  }
  
  // Create the TradingView widget
  tvWidget = new TradingView.widget({
    width: container.offsetWidth,
    height: container.offsetHeight,
    symbol: "OKEX:BTCUSDT", // Default symbol
    interval: '15', // Default interval (15 minutes)
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
    container_id: "tradingview_chart_container",
    // Use the chart ID from the URL you provided
    // This will load the same chart layout
    chart_url: "https://www.tradingview.com/chart/IC6vPTVf/",
  });
  
  // Make the widget responsive
  window.addEventListener('resize', () => {
    if (container) {
      // Unfortunately, TradingView widget doesn't have a direct resize method
      // The best approach is to recreate the widget on significant size changes
      // For performance reasons, you might want to debounce this
      if (Math.abs(container.offsetWidth - tvWidget.options.width) > 100 ||
          Math.abs(container.offsetHeight - tvWidget.options.height) > 100) {
        tvWidget.options.width = container.offsetWidth;
        tvWidget.options.height = container.offsetHeight;
        // Recreate widget only on significant size changes
        initializeTradingViewWidget();
      }
    }
  });
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
  
  // Trendict button
  const trendictButton = document.getElementById('trendictButton');
  if (trendictButton) {
    trendictButton.addEventListener('click', analyzeTradingViewChart);
  }
  
  // Tab buttons
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons and content
      tabButtons.forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked button and corresponding content
      this.classList.add('active');
      const tabId = this.getAttribute('data-tab');
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
    const trendictButton = document.getElementById('trendictButton');
    if (trendictButton) {
      trendictButton.disabled = true;
      trendictButton.innerHTML = `
        <div class="loading-spinner"></div>
        Analyzing...
      `;
    }
    
    // Capture screenshot
    const chartImageData = await captureChartScreenshot();
    
    // Analyze the chart with AI
    await analyzeChartWithAI(chartImageData);
    
    // Reset button state
    if (trendictButton) {
      trendictButton.disabled = false;
      trendictButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2"/>
          <path d="M12 7V12L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Trendict
      `;
    }
    
  } catch (error) {
    console.error('Error in chart analysis:', error);
    
    // Reset button state
    const trendictButton = document.getElementById('trendictButton');
    if (trendictButton) {
      trendictButton.disabled = false;
      trendictButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2"/>
          <path d="M12 7V12L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Trendict
      `;
    }
    
    // Show error message
    showAnalysisError(error.message);
  }
}

// Function to analyze the chart using ChatGPT
async function analyzeChartWithAI(chartImageData) {
  try {
    // Show loading state
    showAnalysisLoading(true);
    
    // Get current symbol and timeframe from TradingView widget
    let symbol = 'BTCUSDT';
    let interval = '15';
    
    try {
      if (tvWidget && tvWidget.activeChart) {
        symbol = tvWidget.activeChart().symbol() || 'BTCUSDT';
        interval = tvWidget.activeChart().resolution() || '15';
      }
    } catch (e) {
      console.warn('Could not get symbol/interval from TradingView widget:', e);
    }
    
    // Prepare the prompt for ChatGPT
    const prompt = `
      Analyze this cryptocurrency chart of ${symbol} on the ${interval} timeframe.
      
      The chart includes my technical analysis drawings. Based on these drawings and the price action:
      
      1. Identify the overall trend direction (bullish, bearish, or neutral)
      2. Suggest optimal entry points for both long and short positions
      3. Recommend take profit levels (at least 2 levels)
      4. Recommend stop loss levels
      5. Identify key support and resistance levels
      6. Calculate the risk/reward ratio
      7. Provide a brief reasoning for your analysis
      
      Format your response as JSON with the following structure:
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
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: chartImageData } }
              ]
            }
          ],
          max_tokens: 1000
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      const analysisText = data.choices[0].message.content;
      
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
    } catch (apiError) {
      console.error('OpenAI API error:', apiError);
      
      // If API call fails, use a fallback analysis
      const fallbackAnalysis = {
        direction: "neutral",
        entryPoints: ["Current market price"],
        takeProfitLevels: ["API call failed - use TradingView tools"],
        stopLossLevels: ["API call failed - use TradingView tools"],
        riskReward: "N/A",
        keyLevels: [
          {"type": "note", "price": "N/A", "significance": "high"}
        ],
        reasoning: "Unable to analyze chart with AI. Please use TradingView's built-in tools for analysis. Error: " + apiError.message
      };
      
      updateAnalysisUI(fallbackAnalysis);
    }
    
    showAnalysisLoading(false);
    
  } catch (error) {
    console.error('Error analyzing chart:', error);
    showAnalysisError(error.message);
    showAnalysisLoading(false);
  }
}

// Function to update the analysis UI with the results
function updateAnalysisUI(analysisData) {
  // Update timestamp
  const timestampEl = document.getElementById('analysisTimestamp');
  if (timestampEl) {
    timestampEl.textContent = `Analyzed at ${new Date().toLocaleTimeString()}`;
  }
  
  // Update trading plan tab
  document.getElementById('tradeDirection').textContent = analysisData.direction || '-';
  document.getElementById('entryPoints').textContent = (analysisData.entryPoints || []).join(', ') || '-';
  document.getElementById('takeProfitLevels').textContent = (analysisData.takeProfitLevels || []).join(', ') || '-';
  document.getElementById('stopLossLevels').textContent = (analysisData.stopLossLevels || []).join(', ') || '-';
  document.getElementById('riskReward').textContent = analysisData.riskReward || '-';
  
  // Update key levels tab
  const keyLevelsTable = document.getElementById('keyLevelsTable');
  if (keyLevelsTable) {
    // Clear existing rows except header
    while (keyLevelsTable.rows.length > 1) {
      keyLevelsTable.deleteRow(1);
    }
    
    // Add new rows
    if (analysisData.keyLevels && analysisData.keyLevels.length > 0) {
      analysisData.keyLevels.forEach(level => {
        const row = keyLevelsTable.insertRow();
        
        const typeCell = row.insertCell();
        typeCell.textContent = level.type || '-';
        
        const priceCell = row.insertCell();
        priceCell.textContent = level.price || '-';
        
        const significanceCell = row.insertCell();
        significanceCell.textContent = level.significance || '-';
        
        // Add color based on type
        if (level.type && level.type.toLowerCase().includes('support')) {
          typeCell.classList.add('support-text');
        } else if (level.type && level.type.toLowerCase().includes('resistance')) {
          typeCell.classList.add('resistance-text');
        } else if (level.type && level.type.toLowerCase().includes('fib')) {
          typeCell.classList.add('fib-text');
        }
        
        // Add color based on significance
        if (level.significance && level.significance.toLowerCase() === 'high') {
          significanceCell.classList.add('high-significance');
        }
      });
    } else {
      const row = keyLevelsTable.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 3;
      cell.textContent = 'No key levels identified';
      cell.style.textAlign = 'center';
    }
  }
  
  // Update reasoning tab
  const reasoningEl = document.getElementById('analysisReasoning');
  if (reasoningEl) {
    reasoningEl.textContent = analysisData.reasoning || 'No reasoning provided';
  }
}

// Function to show loading state in the analysis UI
function showAnalysisLoading(isLoading) {
  const elements = [
    'tradeDirection', 'entryPoints', 'takeProfitLevels', 
    'stopLossLevels', 'riskReward', 'analysisReasoning'
  ];
  
  elements.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (isLoading) {
        el.innerHTML = `<div class="loading-indicator"><div class="loading-spinner"></div>Analyzing...</div>`;
      }
    }
  });
  
  // Also update the key levels table
  const keyLevelsTable = document.getElementById('keyLevelsTable');
  if (keyLevelsTable && isLoading) {
    // Clear existing rows except header
    while (keyLevelsTable.rows.length > 1) {
      keyLevelsTable.deleteRow(1);
    }
    
    // Add loading row
    const row = keyLevelsTable.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 3;
    cell.innerHTML = `<div class="loading-indicator"><div class="loading-spinner"></div>Analyzing...</div>`;
    cell.style.textAlign = 'center';
  }
}

// Function to show error in the analysis UI
function showAnalysisError(errorMessage) {
  const elements = [
    'tradeDirection', 'entryPoints', 'takeProfitLevels', 
    'stopLossLevels', 'riskReward'
  ];
  
  elements.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = 'Error';
      el.classList.add('error-text');
    }
  });
  
  // Update reasoning with error message
  const reasoningEl = document.getElementById('analysisReasoning');
  if (reasoningEl) {
    reasoningEl.innerHTML = `<div class="error-message">Error analyzing chart: ${errorMessage}</div>`;
  }
  
  // Update timestamp
  const timestampEl = document.getElementById('analysisTimestamp');
  if (timestampEl) {
    timestampEl.textContent = `Analysis failed at ${new Date().toLocaleTimeString()}`;
  }
}

// Function to take a screenshot of the TradingView chart
async function captureChartScreenshot() {
  return new Promise((resolve, reject) => {
    try {
      // First, try to use TradingView's built-in screenshot functionality
      if (tvWidget && tvWidget.activeChart && typeof tvWidget.activeChart().takeScreenshot === 'function') {
        tvWidget.activeChart().takeScreenshot().then(resolve).catch(error => {
          console.warn('TradingView screenshot failed, falling back to canvas capture:', error);
          captureWithCanvas();
        });
        return;
      } else {
        captureWithCanvas();
      }
      
      function captureWithCanvas() {
        // Fallback: Use html2canvas to take a screenshot
        if (typeof html2canvas !== 'function') {
          // If html2canvas is not available, load it dynamically
          const script = document.createElement('script');
          script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
          script.onload = () => {
            captureWithHtml2Canvas();
          };
          script.onerror = () => {
            reject(new Error('Failed to load html2canvas library'));
          };
          document.head.appendChild(script);
        } else {
          captureWithHtml2Canvas();
        }
      }
      
      function captureWithHtml2Canvas() {
        const chartContainer = document.getElementById('tradingview_chart_container');
        if (!chartContainer) {
          reject(new Error('Chart container not found'));
          return;
        }
        
        html2canvas(chartContainer, {
          allowTaint: true,
          useCORS: true,
          backgroundColor: '#1E1E2D'
        }).then(canvas => {
          const imageData = canvas.toDataURL('image/png');
          resolve(imageData);
        }).catch(error => {
          console.error('html2canvas error:', error);
          reject(new Error('Failed to capture chart screenshot'));
        });
      }
    } catch (error) {
      reject(error);
    }
  });
}

// Add CSS classes for the analysis results
function addAnalysisStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .support-text { color: var(--support); }
    .resistance-text { color: var(--resistance); }
    .fib-text { color: var(--fib); }
    .high-significance { font-weight: bold; }
    .error-text { color: var(--danger); }
    .error-message { 
      color: var(--danger); 
      padding: 10px; 
      background-color: rgba(214, 48, 49, 0.1); 
      border-radius: 4px; 
    }
    
    /* Trendict Button */
    .trendict-button-container {
      display: flex;
      justify-content: center;
      margin-top: 16px;
    }
    
    .trendict-button {
      background-color: var(--primary);
      color: white;
      border: none;
      border-radius: 6px;
      padding: 6px 16px;
      font-size: 14px;
      font-weight: 500;
      height: 36px;
      width: 87.4px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    }
    
    .trendict-button:hover {
      background-color: var(--primary-light);
      transform: translateY(-1px);
    }
    
    .trendict-button:active {
      transform: translateY(0);
    }
    
    /* Analysis Results */
    .analysis-results {
      background-color: var(--bg-secondary);
      border-radius: var(--border-radius);
      padding: 20px;
      margin-top: 16px;
      box-shadow: var(--box-shadow);
    }
    
    .analysis-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .analysis-header h3 {
      margin: 0;
      color: var(--primary-light);
    }
    
    .analysis-timestamp {
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    .analysis-tabs {
      display: flex;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      margin-bottom: 16px;
    }
    
    .tab-button {
      background: none;
      border: none;
      color: var(--text-secondary);
      padding: 8px 16px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      border-bottom: 2px solid transparent;
    }
    
    .tab-button.active {
      color: var(--primary-light);
      border-bottom: 2px solid var(--primary-light);
    }
    
    .tab-content {
      display: none;
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
      color: var(--text-secondary);
      font-weight: 500;
      width: 30%;
    }
    
    .reasoning-content {
      line-height: 1.6;
      font-size: 14px;
    }
    
    /* Loading indicator */
    .loading-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
            color: var(--text-secondary);
      font-size: 14px;
      margin: 20px 0;
    }
    
    .loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-top: 2px solid var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    /* TradingView container */
    #tradingview_chart_container {
      width: 100%;
      height: 70vh;
      min-height: 500px;
      border-radius: var(--border-radius);
      overflow: hidden;
      box-shadow: var(--box-shadow);
    }
  `;
  document.head.appendChild(style);
}