let isFullscreen = false;
// Global variable to track synchronization state
let isSyncEnabled = true;
let chartInstances = {};
let predictionModel = null;
let autoRefreshIntervals = {};

// Error handler - must be first
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  const predictionEl = document.getElementById('finalPrediction');
  if (predictionEl) {
    predictionEl.innerHTML = `
      <div style="color:red;padding:10px;">
        Script Error: ${e.message}<br>
        Check console for details
      </div>
    `;
  }
});

// Function to load and initialize the TensorFlow model
async function loadModel() {
  try {
    // Create a simple model for demonstration
    const model = tf.sequential();
    model.add(tf.layers.dense({
      units: 10,
      activation: 'relu',
      inputShape: [5]  // 5 features: EMA, RSI, MACD, BB position, volume ratio
    }));
    model.add(tf.layers.dense({
      units: 3,  // 3 outputs: bullish, neutral, bearish
      activation: 'softmax'
    }));
    
    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    console.log('TensorFlow model initialized successfully');
    return model;
  } catch (error) {
    console.error('Model loading failed:', error);
    return null;
  }
}

class CryptoData {
  constructor(data) {
    this.data = data;
    this.timestamps = data.map(item => new Date(item[0]));
    this.opens = data.map(item => parseFloat(item[1]));
    this.highs = data.map(item => parseFloat(item[2]));
    this.lows = data.map(item => parseFloat(item[3]));
    this.closes = data.map(item => parseFloat(item[4]));
    this.volumes = data.map(item => parseFloat(item[5]));
    this.quoteVolumes = data.map(item => parseFloat(item[7]));
  }

  getLatest() {
    const lastIndex = this.closes.length - 1;
    return {
      timestamp: this.timestamps[lastIndex],
      price: this.closes[lastIndex],
      volume: this.volumes[lastIndex],
      quoteVolume: this.quoteVolumes[lastIndex]
    };
  }
}

// Function to detect strong signals
function isStrongSignal(indicators) {
  // Check for strong bullish signal
  const strongBullish = 
    indicators.ema5 > indicators.ema10 && 
    indicators.ema10 > indicators.ema20 &&
    indicators.rsi6 > 50 &&
    indicators.macd.value > indicators.macd.signal;
  
  // Check for strong bearish signal
  const strongBearish = 
    indicators.ema5 < indicators.ema10 && 
    indicators.ema10 < indicators.ema20 &&
    indicators.rsi6 < 50 &&
    indicators.macd.value < indicators.macd.signal;
  
  return strongBullish ? 'bullish' : (strongBearish ? 'bearish' : null);
}

// Function to detect volume spikes
function detectVolumeSpike(volume, avgVolume) {
  return volume > avgVolume * 1.5;
}

// Function to calculate MACD
function calculateMACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  // Helper function for EMA calculation
  function ema(values, period) {
    if (values.length < period) return null;
    const k = 2 / (period + 1);
    let emaValue = values.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    for (let i = period; i < values.length; i++) {
      emaValue = values[i] * k + emaValue * (1 - k);
    }
    return emaValue;
  }

  const fastEMA = ema(closes, fastPeriod);
  const slowEMA = ema(closes, slowPeriod);
  const macdLine = fastEMA - slowEMA;
  
  // Calculate signal line (EMA of MACD line)
  const macdValues = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < slowPeriod - 1) {
      macdValues.push(0);
    } else {
      const fast = ema(closes.slice(0, i + 1), fastPeriod);
      const slow = ema(closes.slice(0, i + 1), slowPeriod);
      macdValues.push(fast - slow);
    }
  }
  
  const signalLine = ema(macdValues, signalPeriod);
  
  return {
    value: macdLine,
    signal: signalLine,
    histogram: macdLine - signalLine
  };
}

// Function to calculate Bollinger Bands
function calculateBollingerBands(closes, period = 20, multiplier = 2) {
  // Helper function for SMA calculation
  function sma(values, period) {
    if (values.length < period) return null;
    return values.slice(-period).reduce((sum, val) => sum + val, 0) / period;
  }

  const ma = sma(closes, period);
  
  // Calculate standard deviation
  let sum = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    sum += Math.pow(closes[i] - ma, 2);
  }
  const stdDev = Math.sqrt(sum / period);
  
  return {
    middle: ma,
    upper: ma + (multiplier * stdDev),
    lower: ma - (multiplier * stdDev)
  };
}

// Function to calculate ATR (Average True Range)
function calculateATR(highs, lows, closes, period = 14) {
  const trueRanges = [];
  
  // Calculate true ranges
  for (let i = 1; i < closes.length; i++) {
    const highLow = highs[i] - lows[i];
    const highClose = Math.abs(highs[i] - closes[i-1]);
    const lowClose = Math.abs(lows[i] - closes[i-1]);
    
    trueRanges.push(Math.max(highLow, highClose, lowClose));
  }
  
  // Helper function for SMA calculation
  function sma(values, period) {
    if (values.length < period) return null;
    return values.slice(-period).reduce((sum, val) => sum + val, 0) / period;
  }

  // Calculate ATR as average of true ranges
  return sma(trueRanges, period);
}

// Function to calculate VWAP (Volume Weighted Average Price)
function calculateVWAP(highs, lows, closes, volumes) {
  let cumulativeTPV = 0; // Typical Price × Volume
  let cumulativeVolume = 0;
  
  for (let i = 0; i < closes.length; i++) {
    const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
    cumulativeTPV += typicalPrice * volumes[i];
    cumulativeVolume += volumes[i];
  }
  
  return cumulativeTPV / cumulativeVolume;
}

// Function to get higher timeframe
function getHigherTimeframe(currentTimeframe) {
  const timeframes = ['1m', '5m', '15m', '1h', '2h', '4h', '1d'];
  const currentIndex = timeframes.indexOf(currentTimeframe);
  
  if (currentIndex < timeframes.length - 1) {
    return timeframes[currentIndex + 1];
  }
  
  return currentTimeframe; // Already at highest timeframe
}

function generateDetailedAnalysis(indicators, timeframe) {
  const price = indicators.currentPrice.toFixed(4);
  const ema5 = indicators.ema5.toFixed(4);
  const ema10 = indicators.ema10.toFixed(4);
  const ma5 = indicators.ma5.toFixed(4);
  const ma20 = indicators.ma20.toFixed(4);
  const rsi6 = indicators.rsi6.toFixed(2);
  const rsi12 = indicators.rsi12.toFixed(2);
  const rsi24 = indicators.rsi24.toFixed(2);
  const support = indicators.supportLevel.toFixed(4);
  const resistance = indicators.resistanceLevel.toFixed(4);
  const fib236 = indicators.fibLevels['0.236'].toFixed(4);
  const fib382 = indicators.fibLevels['0.382'].toFixed(4);
  const fib618 = indicators.fibLevels['0.618'].toFixed(4);
  const fib786 = indicators.fibLevels['0.786'].toFixed(4);
  const volumeBTC = indicators.volume >= 1000 ? 
    `${(indicators.volume/1000).toFixed(3)}K` : indicators.volume.toFixed(4);
  const volumeUSDT = indicators.avgVolume >= 1000000 ? 
    `${(indicators.avgVolume/1000000).toFixed(3)}M` : indicators.avgVolume.toFixed(2);
  
  // MACD values
  const macdValue = indicators.macd?.value?.toFixed(6) || 'N/A';
  const macdSignal = indicators.macd?.signal?.toFixed(6) || 'N/A';
  const macdHistogram = indicators.macd?.histogram?.toFixed(6) || 'N/A';
  
  // Bollinger Bands
  const bbUpper = indicators.bollingerBands?.upper?.toFixed(4) || 'N/A';
  const bbMiddle = indicators.bollingerBands?.middle?.toFixed(4) || 'N/A';
  const bbLower = indicators.bollingerBands?.lower?.toFixed(4) || 'N/A';
  
  // ATR and VWAP
  const atr = indicators.atr?.toFixed(4) || 'N/A';
  const vwap = indicators.vwap?.toFixed(4) || 'N/A';

  // Determine trend direction
  let trendDirection = "";
  if (indicators.ema5 > indicators.ema10 && indicators.ema10 > indicators.ema20) {
    trendDirection = "Strong uptrend";
  } else if (indicators.ema5 < indicators.ema10 && indicators.ema10 < indicators.ema20) {
    trendDirection = "Strong downtrend";
  } else {
    trendDirection = "Mixed/consolidation";
  }

  // RSI analysis
  let rsiAnalysis = "";
  if (indicators.rsi6 < 30 && indicators.rsi12 < 30) {
    rsiAnalysis = "Oversold (price may bounce soon)";
  } else if (indicators.rsi6 > 70 && indicators.rsi12 > 70) {
    rsiAnalysis = "Overbought (price may pull back soon)";
  } else {
    rsiAnalysis = "Neutral momentum";
  }
  
  // MACD analysis
  let macdAnalysis = "";
  if (indicators.macd.value > indicators.macd.signal) {
    macdAnalysis = "Bullish (MACD above signal line)";
  } else if (indicators.macd.value < indicators.macd.signal) {
    macdAnalysis = "Bearish (MACD below signal line)";
  } else {
    macdAnalysis = "Neutral";
  }
  
  // Bollinger Bands analysis
  let bbAnalysis = "";
  if (indicators.currentPrice > indicators.bollingerBands.upper) {
    bbAnalysis = "Overbought (price above upper band)";
  } else if (indicators.currentPrice < indicators.bollingerBands.lower) {
    bbAnalysis = "Oversold (price below lower band)";
  } else {
    const bbPosition = (indicators.currentPrice - indicators.bollingerBands.lower) / 
                       (indicators.bollingerBands.upper - indicators.bollingerBands.lower);
    bbAnalysis = `Price at ${(bbPosition * 100).toFixed(1)}% of BB range`;
  }

  return `
    <h3>📊 Detailed Analysis (${timeframe} Timeframe)</h3>
    
    <div class="analysis-section">
      <h4>📌 Price & Moving Averages</h4>
      <p>Price (${price}) is ${indicators.currentPrice > indicators.ema5 ? "above" : "below"} all EMAs & MAs → ${trendDirection}</p>
      <p>EMA5 (${ema5}) & MA5 (${ma5}) are closest → Short-term trend is ${indicators.ema5 > indicators.ema10 ? "positive" : "negative"}</p>
      <p>MA20 (${ma20}) is ${indicators.currentPrice > indicators.ma20 ? "below" : "above"} price → ${indicators.currentPrice > indicators.ma20 ? "Uptrend" : "Downtrend"}</p>
    </div>
    
    <div class="analysis-section">
      <h4>📌 RSI (Momentum Indicator)</h4>
      <p>RSI6 (${rsi6}) & RSI12 (${rsi12}) → ${rsiAnalysis}</p>
      <p>RSI24 (${rsi24}) → ${indicators.rsi24 > 50 ? "Bullish" : "Bearish"} momentum on higher timeframe</p>
    </div>
    
    <div class="analysis-section">
      <h4>📌 MACD</h4>
      <p>MACD (${macdValue}) vs Signal (${macdSignal}) → ${macdAnalysis}</p>
      <p>Histogram: ${macdHistogram} → ${indicators.macd.histogram > 0 ? "Positive momentum" : "Negative momentum"}</p>
    </div>
    
    <div class="analysis-section">
      <h4>📌 Bollinger Bands</h4>
      <p>Upper (${bbUpper}) | Middle (${bbMiddle}) | Lower (${bbLower})</p>
      <p>${bbAnalysis}</p>
    </div>
    
    <div class="analysis-section">
      <h4>📌 Support & Resistance</h4>
      <p>Support (${support}) → If price drops, buyers may step in</p>
      <p>Resistance (${resistance}) → A hard ceiling, breaking it means bullish breakout</p>
    </div>
    
    <div class="analysis-section">
      <h4>📌 Fibonacci Levels</h4>
      <p>Fib 0.786 (${fib786}) → Closest Fib level, possible bounce area</p>
      <p>Fib 0.618 (${fib618}) → Stronger resistance, price might reverse down</p>
      <p>Fib 0.382 (${fib382}) → Key retracement level; potential reversal zone</p>
      <p>Fib 0.236 (${fib236}) → Deep retracement; last defense before major drop</p>
    </div>
    
    <div class="analysis-section">
      <h4>📌 Volatility & Volume</h4>
      <p>ATR: ${atr} → ${parseFloat(atr) > indicators.currentPrice * 0.02 ? "High" : "Low"} volatility</p>
      <p>VWAP: ${vwap} → Price is ${indicators.currentPrice > indicators.vwap ? "above" : "below"} VWAP (${indicators.currentPrice > indicators.vwap ? "bullish" : "bearish"})</p>
      <p>VOL(BTC): ${volumeBTC} | VOL(USDT): ${volumeUSDT} → ${indicators.volume > indicators.avgVolume * 1.5 ? "High volume, potential breakout" : "Normal volume activity"}</p>
    </div>
    
    <div class="analysis-section">
      <h4>📌 Summary</h4>
      <p>${trendDirection}, RSI shows ${rsiAnalysis}</p>
      <p>MACD indicates ${macdAnalysis}</p>
      <p>Watch Fib 0.786 (${fib786}) for potential reversal</p>
      <p>Below ${support} → Bearish continuation likely</p>
      <p>Above ${resistance} → Bullish breakout possible 🚀</p>
    </div>
  `;
}

function showAnalysisPopup(content) {
  const popup = document.createElement('div');
  popup.className = 'analysis-popup';
  
  // Adjust max-width based on screen size
  const maxWidth = window.innerWidth > 768 ? '600px' : '90%';
  
  popup.innerHTML = `
    <div class="analysis-content" style="max-width: ${maxWidth};">
      <button class="close-btn">&times;</button>
      ${content}
    </div>
  `;
  
  document.body.appendChild(popup);
  
  // Close button handler
  popup.querySelector('.close-btn').addEventListener('click', () => {
    document.body.removeChild(popup);
  });
  
  // Click outside to close
  popup.addEventListener('click', (e) => {
    if (e.target === popup) {
      document.body.removeChild(popup);
    }
  });
  
  // Close on escape key
  document.addEventListener('keydown', function escapeHandler(e) {
    if (e.key === 'Escape') {
      document.body.removeChild(popup);
      document.removeEventListener('keydown', escapeHandler);
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // Load TensorFlow model
  predictionModel = await loadModel();

  // Initialize sync toggles
  const syncToggles = document.querySelectorAll('[id^="syncToggle"]');
  syncToggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      isSyncEnabled = !isSyncEnabled;
      this.classList.toggle('active', isSyncEnabled);
      
      // Update all sync toggles to match
      syncToggles.forEach(t => t.classList.toggle('active', isSyncEnabled));
    });
    
    // Set initial state
    toggle.classList.toggle('active', isSyncEnabled);
  });

  // Initialize analyze buttons only once
  const fetchButtons = document.querySelectorAll('[id^="fetchData"]');
  fetchButtons.forEach(btn => {
    const panelId = btn.id.replace('fetchData', '');
    btn.addEventListener('click', () => analyzeMarket(panelId || ''));
  });

  // Initialize fullscreen button
  const toggleFullscreenBtn = document.getElementById('toggleFullscreen');
  if (toggleFullscreenBtn) {
    toggleFullscreenBtn.addEventListener('click', toggleFullscreen);
  }
  
  // Initialize
  updateLastUpdated();
  
  function toggleFullscreen() {
    if (!isFullscreen) {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen()
          .then(() => {
            isFullscreen = true;
            document.getElementById('toggleFullscreen').textContent = 'Exit Full Screen';
            document.body.classList.add('full-screen-active');
          })
          .catch(err => {
            console.error('Error entering fullscreen:', err);
          });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => {
            isFullscreen = false;
            document.getElementById('toggleFullscreen').textContent = 'Full Screen';
            document.body.classList.remove('full-screen-active');
          })
          .catch(err => {
            console.error('Error exiting fullscreen:', err);
          });
      }
    }
  }
  
  // Add this to handle fullscreen initialization
  function initFullscreenMode() {
    if (window.location.pathname.includes('fullscreen.html')) {
      document.body.classList.add('full-screen');
      document.querySelector('.app-container').classList.add('full-screen');
      document.getElementById('toggleFullscreen').textContent = 'Exit Full Screen';
    }
  }

  async function analyzeMarket(panelId = '') {
    try {
      const suffix = panelId;
      const symbolId = `symbol${suffix}`;
      const intervalId = `interval${suffix}`;
      const limitId = `limit${suffix}`;
      const fetchBtnId = `fetchData${suffix}`;
      const finalPredictionId = `finalPrediction${suffix}`;
      const indicatorValuesId = `indicatorValues${suffix}`;
      
      const symbolEl = document.getElementById(symbolId);
      const intervalEl = document.getElementById(intervalId);
      const limitEl = document.getElementById(limitId);
      const fetchBtn = document.getElementById(fetchBtnId);
      const finalPredictionEl = document.getElementById(finalPredictionId);
      const indicatorValuesEl = document.getElementById(indicatorValuesId);
      
      if (!symbolEl || !intervalEl || !limitEl || !fetchBtn) {
        console.error(`Required elements not found for panel ${panelId}`);
        return;
      }
      
      showLoadingState(fetchBtn, true);
      
      const symbol = symbolEl.value.toUpperCase();
      const interval = intervalEl.value;
      const limit = Math.min(Math.max(parseInt(limitEl.value), 24), 1000);
      
      // Validate symbol
      if (!symbol || symbol.length < 5) {
        throw new Error('Please enter a valid trading pair (e.g., BTCUSDT)');
      }
      
      const data = await fetchMarketData(symbol, interval, limit);
      const cryptoData = new CryptoData(data);
      
      const indicators = calculateIndicators(cryptoData);
      const probabilities = calculateProbabilities(indicators, cryptoData);
      
      // Update UI for this panel
      updateUI(suffix, cryptoData, indicators, probabilities);
      updateChart(suffix, cryptoData, indicators);
      updateIndicatorValues(indicatorValuesEl, indicators, cryptoData);
      updateLastUpdated();
      
      // If sync is enabled, analyze other panels with the same symbol
      if (isSyncEnabled) {
        syncOtherPanels(suffix, symbol);
      }
      
    } catch (error) {
      console.error("Analysis error:", error);
      const finalPredictionEl = document.getElementById(`finalPrediction${panelId}`);
      if (finalPredictionEl) {
        showErrorState(finalPredictionEl, error.message || "Failed to analyze market");
      }
      
      // Show more detailed error in console
      if (error.message.includes("Instrument ID doesn't exist")) {
        console.log('Common OKX trading pairs: BTC-USDT, ETH-USDT, SOL-USDT');
        console.log('Make sure to use the correct format (BTCUSDT will be converted to BTC-USDT)');
      }
    } finally {
      const fetchBtn = document.getElementById(`fetchData${panelId}`);
      if (fetchBtn) {
        showLoadingState(fetchBtn, false);
      }
    }
  }

  function syncOtherPanels(currentPanelId, symbol) {
    // Find all symbol selects
    const symbolSelects = document.querySelectorAll('[id^="symbol"]');
    
    // For each symbol select that matches the current symbol but isn't the current panel
    symbolSelects.forEach(select => {
      const panelId = select.id.replace('symbol', '');
      
      // Skip the current panel
      if (panelId === currentPanelId) return;
      
      // If this panel has the same symbol, analyze it
      if (select.value.toUpperCase() === symbol) {
                // Get the analyze button for this panel
                const fetchBtn = document.getElementById(`fetchData${panelId}`);
                if (fetchBtn) {
                  // Trigger analysis after a small delay to avoid UI freezing
                  setTimeout(() => {
                    analyzeMarket(panelId);
                  }, 100);
                }
              }
            });
          }
        
          async function fetchMarketData(symbol, interval, limit) {
            try {
              // Use our Netlify function instead of a CORS proxy
              const apiUrl = `/.netlify/functions/okx-data?symbol=${symbol}&interval=${interval}&limit=${limit}`;
              
              console.log("Fetching from function:", apiUrl);
              
              const response = await fetch(apiUrl);
              if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
              
              const data = await response.json();
              
              if (data.code !== "0") {
                throw new Error(`OKX API: ${data.msg || 'Unknown error'}`);
              }
              
              if (!data.data || data.data.length === 0) {
                throw new Error('No candle data available for this pair');
              }
              
              // Convert OKX format to our expected format
              return data.data.map(item => [
                parseInt(item[0]),     // timestamp
                parseFloat(item[1]),   // open
                parseFloat(item[2]),   // high
                parseFloat(item[3]),   // low
                parseFloat(item[4]),   // close
                parseFloat(item[5]),   // volume
                item[6],              // volume currency
                parseFloat(item[7])   // quote volume
              ]).reverse();           // OKX returns newest first
            } catch (error) {
              console.error("Fetch error details:", error);
              throw new Error(`Failed to fetch OKX data: ${error.message}`);
            }
          }
          
          
          
          
        
          function calculateIndicators(data) {
            const closes = data.closes;
            const highs = data.highs;
            const lows = data.lows;
            const volumes = data.volumes;
            const quoteVolumes = data.quoteVolumes;
            const latest = data.getLatest();
            
            // Moving Averages
            function sma(values, period) {
              if (values.length < period) return null;
              return values.slice(-period).reduce((sum, val) => sum + val, 0) / period;
            }
            
            function ema(values, period) {
              if (values.length < period) return null;
              const k = 2 / (period + 1);
              let emaValue = sma(values.slice(0, period), period);
              for (let i = period; i < values.length; i++) {
                emaValue = values[i] * k + emaValue * (1 - k);
              }
              return emaValue;
            }
            
            // RSI
            function calculateRSI(closes, period) {
              if (closes.length <= period) return 50;
              let gains = 0, losses = 0;
              for (let i = 1; i <= period; i++) {
                const diff = closes[i] - closes[i - 1];
                if (diff > 0) gains += diff; else losses -= diff;
              }
              const avgGain = gains / period;
              const avgLoss = losses / period;
              const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
              return 100 - (100 / (1 + rs));
            }
            
            // Support/Resistance
            const recentHigh = Math.max(...highs.slice(-20));
            const recentLow = Math.min(...lows.slice(-20));
            const pivot = (recentHigh + recentLow + closes[closes.length - 1]) / 3;
            const support1 = (2 * pivot) - recentHigh;
            const resistance1 = (2 * pivot) - recentLow;
        
            // Fibonacci
            const fibLevels = {
              '0.236': recentHigh - (recentHigh - recentLow) * 0.236,
              '0.382': recentHigh - (recentHigh - recentLow) * 0.382,
              '0.5': recentHigh - (recentHigh - recentLow) * 0.5,
              '0.618': recentHigh - (recentHigh - recentLow) * 0.618,
              '0.786': recentHigh - (recentHigh - recentLow) * 0.786
            };
            
            // Calculate MACD
            const macd = calculateMACD(closes);
            
            // Calculate Bollinger Bands
            const bb = calculateBollingerBands(closes);
            
            // Calculate ATR
            const atr = calculateATR(highs, lows, closes);
            
            // Calculate VWAP
            const vwap = calculateVWAP(highs, lows, closes, volumes);
            
            return {
              currentPrice: latest.price,
              ema5: ema(closes, 5),
              ema10: ema(closes, 10),
              ema20: ema(closes, 20),
              ma5: sma(closes, 5),
              ma10: sma(closes, 10),
              ma20: sma(closes, 20),
              rsi6: calculateRSI(closes.slice(-7), 6),
              rsi12: calculateRSI(closes.slice(-13), 12),
              rsi24: calculateRSI(closes.slice(-25), 24),
              volume: latest.quoteVolume,
              avgVolume: sma(quoteVolumes.slice(-20), 20),
              supportLevel: support1,
              resistanceLevel: resistance1,
              fibLevels: fibLevels,
              recentHigh: recentHigh,
              recentLow: recentLow,
              macd: macd,
              bollingerBands: bb,
              atr: atr,
              vwap: vwap
            };
          }
        
          function updateIndicatorValues(indicatorValuesEl, indicators, data) {
            if (!indicatorValuesEl) return;
            
            const latest = data.getLatest();
            const formattedBTCVol = latest.volume >= 1000 ? 
              `${(latest.volume/1000).toFixed(3)}K` : latest.volume.toFixed(4);
            const formattedUSDTVol = latest.quoteVolume >= 1000000 ? 
              `${(latest.quoteVolume/1000000).toFixed(3)}M` : latest.quoteVolume.toFixed(2);
          
            indicatorValuesEl.innerHTML = `
              <div class="indicator-row">
                <span>Price: ${latest.price.toFixed(4)}</span>
              </div>
              <div class="indicator-row">
                <span class="ema5">EMA5: ${indicators.ema5?.toFixed(4) || 'N/A'}</span>
                <span class="ema10">EMA10: ${indicators.ema10?.toFixed(4) || 'N/A'}</span>
                <span class="ema20">EMA20: ${indicators.ema20?.toFixed(4) || 'N/A'}</span>
              </div>
              <div class="indicator-row">
                <span class="ma5">MA5: ${indicators.ma5?.toFixed(4) || 'N/A'}</span>
                <span class="ma10">MA10: ${indicators.ma10?.toFixed(4) || 'N/A'}</span>
                <span class="ma20">MA20: ${indicators.ma20?.toFixed(4) || 'N/A'}</span>
              </div>
              <div class="indicator-row">
                <span class="rsi6">RSI6: ${indicators.rsi6?.toFixed(2) || 'N/A'}</span>
                <span class="rsi12">RSI12: ${indicators.rsi12?.toFixed(2) || 'N/A'}</span>
                <span class="rsi24">RSI24: ${indicators.rsi24?.toFixed(2) || 'N/A'}</span>
              </div>
              <div class="indicator-row">
                <span class="support">Support: ${indicators.supportLevel?.toFixed(4) || 'N/A'}</span>
                <span class="resistance">Resistance: ${indicators.resistanceLevel?.toFixed(4) || 'N/A'}</span>
              </div>
              <div class="indicator-row">
                <span class="fib">Fib 0.236: ${indicators.fibLevels?.['0.236']?.toFixed(4) || 'N/A'}</span>
                <span class="fib">Fib 0.618: ${indicators.fibLevels?.['0.618']?.toFixed(4) || 'N/A'}</span>
              </div>
              <div class="indicator-row">
                <span class="fib">Fib 0.382: ${indicators.fibLevels?.['0.382']?.toFixed(4) || 'N/A'}</span>
                <span class="fib">Fib 0.786: ${indicators.fibLevels?.['0.786']?.toFixed(4) || 'N/A'}</span>
              </div>
              <div class="indicator-row">
                <span>MACD: ${indicators.macd?.value?.toFixed(6) || 'N/A'}</span>
                <span>Signal: ${indicators.macd?.signal?.toFixed(6) || 'N/A'}</span>
              </div>
              <div class="indicator-row">
                <span>BB Upper: ${indicators.bollingerBands?.upper?.toFixed(4) || 'N/A'}</span>
                <span>BB Lower: ${indicators.bollingerBands?.lower?.toFixed(4) || 'N/A'}</span>
              </div>
              <div class="indicator-row volume">
                <span>VOL(BTC): ${formattedBTCVol}</span>
                <span>VOL(USDT): ${formattedUSDTVol}</span>
              </div>
            `;
          }
        
          function calculateProbabilities(indicators) {
            // Try to use TensorFlow model if available
            if (predictionModel) {
              try {
                // Prepare input data for the model
                const inputData = [
                  indicators.ema5 / indicators.ema20, // EMA ratio
                  indicators.rsi6 / 100, // Normalized RSI
                  indicators.macd.histogram, // MACD histogram
                  (indicators.currentPrice - indicators.bollingerBands.lower) / 
                  (indicators.bollingerBands.upper - indicators.bollingerBands.lower), // BB position
                  indicators.volume / indicators.avgVolume // Volume ratio
                ];
                
                // Make prediction
                const tensorInput = tf.tensor2d([inputData]);
                const prediction = predictionModel.predict(tensorInput);
                const probabilities = prediction.dataSync();
                
                // Clean up tensors
                tensorInput.dispose();
                prediction.dispose();
                
                // Return probabilities
                return {
                  bullish: probabilities[0] * 100,
                  neutral: probabilities[1] * 100,
                  bearish: probabilities[2] * 100
                };
              } catch (error) {
                console.error('TensorFlow prediction failed:', error);
                // Fall back to traditional calculation
                return calculateTraditionalProbabilities(indicators);
              }
            }
            
            // If no model or prediction failed, use traditional calculation
            return calculateTraditionalProbabilities(indicators);
          }
          
          function calculateTraditionalProbabilities(indicators) {
            const weights = { trend: 0.4, momentum: 0.3, volume: 0.3 };
            const trendScore = indicators.ema5 > indicators.ema10 ? 1 : 0;
            const momentumScore = indicators.rsi6 > 50 ? 
              Math.min(1, (indicators.rsi6 - 50) / 30) : 
              Math.max(0, 1 - (50 - indicators.rsi6) / 30);
            const volumeScore = indicators.volume > indicators.avgVolume * 1.2 ? 
              Math.min(1, (indicators.volume / indicators.avgVolume - 1) / 2) : 0;
            
            const bullishScore = trendScore * weights.trend + momentumScore * weights.momentum + volumeScore * weights.volume;
            const bearishScore = (1 - trendScore) * weights.trend + (1 - momentumScore) * weights.momentum + 
              (indicators.volume < indicators.avgVolume * 0.8 ? weights.volume * 0.5 : 0);
            
            const total = bullishScore + bearishScore;
            const neutralScore = total < 0.8 ? (0.8 - total) : 0;
            const scale = 1 / (bullishScore + bearishScore + neutralScore);
            
            return {
              bullish: bullishScore * scale * 100,
              bearish: bearishScore * scale * 100,
              neutral: neutralScore * scale * 100
            };
          }
        
          function updateUI(suffix, cryptoData, indicators, probabilities) {
            const bullishProbEl = document.getElementById(`bullishProb${suffix}`);
            const bearishProbEl = document.getElementById(`bearishProb${suffix}`);
            const neutralProbEl = document.getElementById(`neutralProb${suffix}`);
            const finalPredictionEl = document.getElementById(`finalPrediction${suffix}`);
            const intervalSelect = document.getElementById(`interval${suffix}`);
            
            if (!bullishProbEl || !bearishProbEl || !neutralProbEl || !finalPredictionEl || !intervalSelect) {
              console.error(`Required elements not found for panel ${suffix}`);
              return;
            }
            
            bullishProbEl.textContent = `${probabilities.bullish.toFixed(1)}%`;
            bearishProbEl.textContent = `${probabilities.bearish.toFixed(1)}%`;
            neutralProbEl.textContent = `${probabilities.neutral.toFixed(1)}%`;
            
            // Update probability bars
            const probBars = finalPredictionEl.closest('.app-content').querySelectorAll('.probability-bar-fill');
            probBars.forEach(el => {
              const type = el.closest('.probability-card').classList[1];
              el.style.width = `${probabilities[type]}%`;
            });
            
            let prediction, predictionClass;
            if (probabilities.bullish >= 50) prediction = "Strong Bullish Trend", predictionClass = "bullish";
            else if (probabilities.bearish >= 50) prediction = "Strong Bearish Trend", predictionClass = "bearish";
            else if (probabilities.bullish > probabilities.bearish) prediction = "Mild Bullish Bias", predictionClass = "bullish";
            else if (probabilities.bearish > probabilities.bullish) prediction = "Mild Bearish Bias", predictionClass = "bearish";
            else prediction = "Neutral Market", predictionClass = "neutral";
            
            finalPredictionEl.className = `prediction-card ${predictionClass}`;
            finalPredictionEl.innerHTML = `
              <div class="prediction-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2"/>
                  ${predictionClass === "bullish" ? '<path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' : ''}
                  ${predictionClass === "bearish" ? '<path d="M8 8L16 16M8 16L16 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' : ''}
                  ${predictionClass === "neutral" ? '<path d="M12 16V12M12 8V12M12 12H16M12 12H8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' : ''}
                </svg>
              </div>
              <div class="prediction-text">
                <div class="prediction-title">${prediction}</div>
                <div class="prediction-subtitle">${cryptoData.getLatest().price.toFixed(4)} (${(indicators.ema5 > indicators.ema10 ? '+' : '')}${((indicators.ema5 - indicators.ema10) / indicators.ema10 * 100).toFixed(2)}%)</div>
              </div>
              <button class="details-btn">Details</button>
            `;
            
            // Add click handler for the Details button
            finalPredictionEl.querySelector('.details-btn').addEventListener('click', () => {
              const timeframe = intervalSelect.options[intervalSelect.selectedIndex].text;
              const analysis = generateDetailedAnalysis(indicators, timeframe);
              showAnalysisPopup(analysis);
            });
          }
        
          function updateChart(suffix, data, indicators) {
            const chartId = `priceChart${suffix}`;
            const ctx = document.getElementById(chartId)?.getContext('2d');
            if (!ctx) {
              console.error(`Chart canvas not found for panel ${suffix}`);
              return;
            }
            
            // Destroy existing chart if it exists
            if (chartInstances[chartId]) {
              chartInstances[chartId].destroy();
            }
            
            // Create datasets for additional indicators
            const macdDataset = {
              label: 'MACD',
              data: data.closes.map((_, i) => i < 26 ? null : indicators.macd.value),
              borderColor: '#FF6384',
              borderWidth: 1,
              pointRadius: 0,
              yAxisID: 'y1',
              hidden: true
            };
            
            const signalDataset = {
              label: 'Signal',
              data: data.closes.map((_, i) => i < 26 ? null : indicators.macd.signal),
              borderColor: '#36A2EB',
              borderWidth: 1,
              pointRadius: 0,
              yAxisID: 'y1',
              hidden: true
            };
            
            chartInstances[chartId] = new Chart(ctx, {
              type: 'line',
              data: {
                labels: data.timestamps.map(date => date.toLocaleTimeString()),
                datasets: [{
                  label: 'Price',
                  data: data.closes,
                  borderColor: '#6C5CE7',
                  borderWidth: 2,
                  tension: 0.1,
                  pointRadius: 0,
                  fill: { target: 'origin', above: 'rgba(108, 92, 231, 0.1)', below: 'rgba(108, 92, 231, 0.1)' }
                },
                macdDataset,
                signalDataset
                ]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#3A3A4E',
                    titleColor: '#BDC3C7',
                    bodyColor: '#F5F6FA',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: { 
                      label: ctx => {
                        if (ctx.dataset.label === 'Price') {
                          return `Price: ${ctx.parsed.y.toFixed(2)}`;
                        } else if (ctx.dataset.label === 'MACD') {
                          return `MACD: ${ctx.parsed.y.toFixed(6)}`;
                        } else if (ctx.dataset.label === 'Signal') {
                          return `Signal: ${ctx.parsed.y.toFixed(6)}`;
                        }
                        return `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}`;
                      }
                    }
                  },
                  annotation: {
                    annotations: {
                      supportLine: {
                        type: 'line',
                        yMin: indicators.supportLevel,
                        yMax: indicators.supportLevel,
                        borderColor: 'rgba(0, 184, 148, 0.7)',
                        borderWidth: 1,
                        borderDash: [6, 6],
                        label: { content: 'Support', enabled: true, position: 'left' }
                      },
                      resistanceLine: {
                        type: 'line',
                        yMin: indicators.resistanceLevel,
                        yMax: indicators.resistanceLevel,
                        borderColor: 'rgba(214, 48, 49, 0.7)',
                        borderWidth: 1,
                        borderDash: [6, 6],
                        label: { content: 'Resistance', enabled: true, position: 'right' }
                      },
                      fib236: {
                        type: 'line',
                        yMin: indicators.fibLevels['0.236'],
                        yMax: indicators.fibLevels['0.236'],
                        borderColor: 'rgba(162, 155, 254, 0.5)',
                        borderWidth: 1,
                        label: { content: '0.236', enabled: true }
                      },
                      fib618: {
                        type: 'line',
                        yMin: indicators.fibLevels['0.618'],
                        yMax: indicators.fibLevels['0.618'],
                        borderColor: 'rgba(162, 155, 254, 0.5)',
                        borderWidth: 1,
                        label: { content: '0.618', enabled: true }
                      },
                      bbUpper: {
                        type: 'line',
                        yMin: indicators.bollingerBands.upper,
                        yMax: indicators.bollingerBands.upper,
                        borderColor: 'rgba(255, 99, 132, 0.5)',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        label: { content: 'BB Upper', enabled: false }
                      },
                      bbLower: {
                        type: 'line',
                        yMin: indicators.bollingerBands.lower,
                        yMax: indicators.bollingerBands.lower,
                        borderColor: 'rgba(255, 99, 132, 0.5)',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        label: { content: 'BB Lower', enabled: false }
                      }
                    }
                  }
                },
                scales: {
                  x: { 
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }, 
                    ticks: { 
                      color: '#BDC3C7',
                      maxRotation: 0,
                      autoSkip: true,
                      maxTicksLimit: 10 // Limit number of ticks for better readability
                    } 
                  },
                  y: { 
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }, 
                    ticks: { color: '#BDC3C7' },
                    beginAtZero: false // Better auto-scaling
                  },
                  y1: {
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#FF6384' },
                    display: false
                  }
                },
                interaction: { mode: 'nearest', axis: 'x', intersect: false }
              }
            });
          }
        
          function updateLastUpdated() {
            const lastUpdatedEls = document.querySelectorAll('[id^="lastUpdated"]');
            lastUpdatedEls.forEach(el => {
              el.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
            });
          }
        
          function showLoadingState(button, isLoading) {
            if (!button) return;
            
            button.innerHTML = isLoading ? 
              `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="animate-spin">
                <path d="M12 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M12 18V22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M4.93 4.93L7.76 7.76" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M16.24 16.24L19.07 19.07" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M2 12H6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M18 12H22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M4.93 19.07L7.76 16.24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M16.24 7.76L19.07 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg> Analyzing...` : 
              `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2"/>
              <path d="M12 7V12L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg> Analyze Market`;
            button.disabled = isLoading;
          }
        
          function showErrorState(predictionEl, message) {
            if (!predictionEl) return;
            
            predictionEl.className = "prediction-card error";
            predictionEl.innerHTML = `
              <div class="prediction-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2"/>
                  <path d="M8 8L16 16M8 16L16 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="prediction-text">
                <div class="prediction-title">Error</div>
                <div class="prediction-subtitle">${message}</div>
                ${message.includes('Instrument ID') ? '<div class="prediction-hint">Try BTCUSDT, ETHUSDT, etc.</div>' : ''}
              </div>
            `;
          }
          
          initFullscreenMode();
          document.addEventListener('fullscreenchange', () => {
            isFullscreen = !!document.fullscreenElement;
            document.getElementById('toggleFullscreen').textContent = 
              isFullscreen ? 'Exit Full Screen' : 'Full Screen';
            document.body.classList.toggle('full-screen-active', isFullscreen);
          });
        
          // Auto-analyze all panels on load
          setTimeout(() => {
            document.querySelectorAll('[id^="fetchData"]').forEach(btn => {
              const panelId = btn.id.replace('fetchData', '');
              analyzeMarket(panelId || '');
            });
          }, 500);
        });
        
