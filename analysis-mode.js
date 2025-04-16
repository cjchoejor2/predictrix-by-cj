// Global variables
let chart = null;
let candleSeries = null;
let chartData = [];
let currentSymbol = 'BTCUSDT';
let currentInterval = '15m';
let drawingMode = null;
let activeTool = null;
let fibLevels = {};

// Initialize the chart when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize the chart
  initializeChart();
  
  // Set up event listeners
  setupEventListeners();
  
  // Load initial data
  await loadChartData();
});

// Initialize the TradingView chart
// Initialize the TradingView chart
function initializeChart() {
  const chartContainer = document.getElementById('advancedChart');
  
  // Create the chart
  chart = LightweightCharts.createChart(chartContainer, {
    width: chartContainer.clientWidth,
    height: chartContainer.clientHeight,
    layout: {
      backgroundColor: '#1E1E2D',
      textColor: '#F5F6FA',
    },
    grid: {
      vertLines: {
        color: 'rgba(255, 255, 255, 0.05)',
      },
      horzLines: {
        color: 'rgba(255, 255, 255, 0.05)',
      },
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: {
        width: 1,
        color: 'rgba(108, 92, 231, 0.5)',
        style: LightweightCharts.LineStyle.Dashed,
      },
      horzLine: {
        width: 1,
        color: 'rgba(108, 92, 231, 0.5)',
        style: LightweightCharts.LineStyle.Dashed,
      },
    },
    timeScale: {
      borderColor: 'rgba(255, 255, 255, 0.1)',
      timeVisible: true,
      secondsVisible: false,
    },
    rightPriceScale: {
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
  });
  
  // Create candlestick series - fixed method name
  candleSeries = chart.addCandlestickSeries({
    upColor: '#00B894',
    downColor: '#D63031',
    borderUpColor: '#00B894',
    borderDownColor: '#D63031',
    wickUpColor: 'rgba(0, 184, 148, 0.8)',
    wickDownColor: 'rgba(214, 48, 49, 0.8)',
  });
  
  // Add volume series
  const volumeSeries = chart.addHistogramSeries({
    color: '#6C5CE7',
    priceFormat: {
      type: 'volume',
    },
    priceScaleId: '',
    scaleMargins: {
      top: 0.8,
      bottom: 0,
    },
  });
  
  // Make chart responsive
  window.addEventListener('resize', () => {
    if (chart) {
      chart.resize(
        chartContainer.clientWidth,
        chartContainer.clientHeight
      );
    }
  });
}

  
  // Set up event listeners
  function setupEventListeners() {
    // Symbol and interval selectors
    document.getElementById('chartSymbol').addEventListener('change', async (e) => {
      currentSymbol = e.target.value;
      await loadChartData();
    });
    
    document.getElementById('chartInterval').addEventListener('change', async (e) => {
      currentInterval = e.target.value;
      await loadChartData();
    });
    
    // Drawing tools
    document.getElementById('tool-fib-retracement').addEventListener('click', () => {
      toggleDrawingTool('fib-retracement');
    });
    
    document.getElementById('tool-fib-timezone').addEventListener('click', () => {
      toggleDrawingTool('fib-timezone');
    });
    
    document.getElementById('tool-fib-fan').addEventListener('click', () => {
      toggleDrawingTool('fib-fan');
    });
    
    document.getElementById('tool-trend').addEventListener('click', () => {
      toggleDrawingTool('trend');
    });
    
    document.getElementById('tool-clear').addEventListener('click', () => {
      clearAllDrawings();
    });
    
    // Analyze chart button
    document.getElementById('analyzeChartBtn').addEventListener('click', () => {
      analyzeChart();
    });
    
    // Chart click events for drawing
    document.getElementById('advancedChart').addEventListener('mousedown', startDrawing);
    document.getElementById('advancedChart').addEventListener('mousemove', continueDrawing);
    document.getElementById('advancedChart').addEventListener('mouseup', finishDrawing);
  }
  
  // Toggle drawing tool
  function toggleDrawingTool(tool) {
    // Deactivate current tool if any
    if (activeTool) {
      document.getElementById(`tool-${activeTool}`).classList.remove('active');
    }
    
    // If clicking the same tool, deactivate it
    if (activeTool === tool) {
      activeTool = null;
      drawingMode = null;
      return;
    }
    
    // Activate new tool
    activeTool = tool;
    drawingMode = tool;
    document.getElementById(`tool-${tool}`).classList.add('active');
  }
  
  // Clear all drawings
  function clearAllDrawings() {
    // Remove all drawing objects from the chart
    if (chart) {
      // In a real implementation, we would track all drawings and remove them
      // For now, we'll just reload the chart data
      loadChartData();
    }
    
    // Reset drawing state
    drawingMode = null;
    if (activeTool) {
      document.getElementById(`tool-${activeTool}`).classList.remove('active');
      activeTool = null;
    }
  }
  
  // Drawing handlers
  let drawingStartPoint = null;
  let currentDrawing = null;
  
  function startDrawing(e) {
    if (!drawingMode) return;
    
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert screen coordinates to chart coordinates
    const price = chart.priceScale().coordinateToPrice(y);
    const time = chart.timeScale().coordinateToTime(x);
    
    if (price && time) {
      drawingStartPoint = { price, time };
    }
  }
  
  function continueDrawing(e) {
    if (!drawingMode || !drawingStartPoint) return;
    
    // In a real implementation, we would update the drawing preview
    // This requires more complex integration with the chart library
  }
  
  function finishDrawing(e) {
    if (!drawingMode || !drawingStartPoint) return;
    
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert screen coordinates to chart coordinates
    const price = chart.priceScale().coordinateToPrice(y);
    const time = chart.timeScale().coordinateToTime(x);
    
    if (price && time) {
      const endPoint = { price, time };
      
      // Create the drawing based on the mode
      createDrawing(drawingStartPoint, endPoint);
    }
    
    // Reset drawing state
    drawingStartPoint = null;
  }
  
  function createDrawing(startPoint, endPoint) {
    switch (drawingMode) {
      case 'fib-retracement':
        drawFibRetracement(startPoint, endPoint);
        break;
      case 'fib-timezone':
        drawFibTimeZone(startPoint, endPoint);
        break;
      case 'fib-fan':
        drawFibFan(startPoint, endPoint);
        break;
      case 'trend':
        drawTrendLine(startPoint, endPoint);
        break;
    }
  }
  
  // Drawing implementations
  function drawFibRetracement(startPoint, endPoint) {
    // Calculate Fibonacci levels
    const isUptrend = startPoint.price < endPoint.price;
    const highPrice = isUptrend ? endPoint.price : startPoint.price;
    const lowPrice = isUptrend ? startPoint.price : endPoint.price;
    const priceDiff = highPrice - lowPrice;
    
    // Standard Fibonacci levels
    const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    
    // Store the calculated levels
    fibLevels = {};
    levels.forEach(level => {
      const price = isUptrend 
        ? lowPrice + priceDiff * level
        : highPrice - priceDiff * level;
      fibLevels[level] = price;
    });
    
    // Draw the levels on the chart
    levels.forEach(level => {
      const price = fibLevels[level];
      const color = level === 0 || level === 1 
        ? 'rgba(255, 255, 255, 0.5)' 
        : 'rgba(162, 155, 254, 0.5)';
      
      // Add a horizontal line for each level
      const line = {
        price: price,
        color: color,
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: `Fib ${level}`,
      };
      
      candleSeries.createPriceLine(line);
    });
    
    // Update the Fibonacci levels table
    updateFibLevelsTable();
  }
  
  function drawFibTimeZone(startPoint, endPoint) {
    // In a real implementation, this would draw Fibonacci time zones
    // This is a simplified version
    alert('Fibonacci Time Zone tool is not fully implemented in this demo');
  }
  
  function drawFibFan(startPoint, endPoint) {
    // In a real implementation, this would draw Fibonacci fans
    // This is a simplified version
    alert('Fibonacci Fan tool is not fully implemented in this demo');
  }
  
  function drawTrendLine(startPoint, endPoint) {
    // Add a trend line to the chart
    const line = chart.addLineSeries({
      color: '#6C5CE7',
      lineWidth: 2,
    });
    
    line.setData([
      { time: startPoint.time, value: startPoint.price },
      { time: endPoint.time, value: endPoint.price }
    ]);
  }
  
  // Load chart data from OKX API
  // Load chart data from OKX API
async function loadChartData() {
    try {
      showLoading(true);
      
      // Use the existing OKX API endpoint
      const apiUrl = `/.netlify/functions/okx-data?symbol=${currentSymbol}&interval=${currentInterval}&limit=500`;
      console.log('Fetching chart data from:', apiUrl);
      
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const data = await response.json();
      
      if (data.code !== "0") {
        throw new Error(`OKX API: ${data.msg || 'Unknown error'}`);
      }
      
      if (!data.data || data.data.length === 0) {
        throw new Error('No candle data available for this pair');
      }
      
      // Convert OKX format to TradingView format
      chartData = data.data.map(item => ({
        time: parseInt(item[0]) / 1000, // Convert milliseconds to seconds for TradingView
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5])
      })).reverse(); // OKX returns newest first
      
      console.log('Chart data loaded:', chartData.length, 'candles');
      
      // Set the data to the chart
      if (candleSeries) {
        candleSeries.setData(chartData);
        
        // Add volume data
        try {
          // Remove existing volume series if any
          const existingVolumeSeries = chart.getSeries().find(s => s.priceScaleId === '');
          if (existingVolumeSeries) {
            chart.removeSeries(existingVolumeSeries);
          }
          
          const volumeSeries = chart.addHistogramSeries({
            color: '#6C5CE7',
            priceFormat: {
              type: 'volume',
            },
            priceScaleId: '',
            scaleMargins: {
              top: 0.8,
              bottom: 0,
            },
          });
          
          volumeSeries.setData(
            chartData.map(item => ({
              time: item.time,
              value: item.volume,
              color: item.close > item.open ? 'rgba(0, 184, 148, 0.5)' : 'rgba(214, 48, 49, 0.5)'
            }))
          );
        } catch (volumeError) {
          console.error("Error adding volume data:", volumeError);
          // Continue even if volume data fails
        }
        
        // Fit the chart to the data
        if (chart) {
          chart.timeScale().fitContent();
        }
      } else {
        console.error('Candle series not initialized');
      }
      
      // Update last updated time
      updateLastUpdated();
      
      showLoading(false);
    } catch (error) {
      console.error("Error loading chart data:", error);
      showError(error.message);
      showLoading(false);
    }
  }
  
  
  // Update the Fibonacci levels table
  function updateFibLevelsTable() {
    const tableEl = document.getElementById('fibLevelsTable');
    if (!tableEl || !fibLevels || Object.keys(fibLevels).length === 0) return;
    
    // Clear existing rows except header
    const headerRow = tableEl.querySelector('.header');
    tableEl.innerHTML = '';
    tableEl.appendChild(headerRow);
    
    // Get the current price
    const currentPrice = chartData[chartData.length - 1].close;
    
    // Standard Fibonacci levels
    const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    
    // Add rows for each level
    levels.forEach(level => {
      const price = fibLevels[level];
      const row = document.createElement('div');
      row.className = 'fib-row';
      
      // Determine action based on price relation to the level
      let action = '';
      if (Math.abs(currentPrice - price) / price < 0.005) {
        action = 'Current zone → price is testing this level';
      } else if (currentPrice > price) {
        action = 'Support level - price is above';
      } else {
        action = 'Resistance level - price is below';
      }
      
      // Add cells
      row.innerHTML = `
        <div class="fib-cell">${level}</div>
        <div class="fib-cell">~$${price.toFixed(2)}</div>
        <div class="fib-cell">${action}</div>
      `;
      
      tableEl.appendChild(row);
    });
  }
  
  // Analyze the chart and update the strategy and detailed analysis
  function analyzeChart() {
    if (!chartData || chartData.length === 0) {
      alert('No chart data available. Please load data first.');
      return;
    }
    
    showLoading(true);
    
    // Get the latest data
    const latestData = chartData.slice(-100); // Use last 100 candles for analysis
    
    // Calculate indicators
    const indicators = calculateIndicatorsForAnalysis(latestData);
    
    // Update strategy table
    updateStrategyTable(indicators);
    
    // Update detailed analysis
    updateDetailedAnalysis(indicators);
    
    showLoading(false);
  }
  
  // Calculate indicators for analysis
  function calculateIndicatorsForAnalysis(data) {
    // Get the latest price
    const currentPrice = data[data.length - 1].close;
    
    // Calculate moving averages
    const ema20 = calculateEMA(data.map(d => d.close), 20);
    const ema50 = calculateEMA(data.map(d => d.close), 50);
    const ema200 = calculateEMA(data.map(d => d.close), 200);
    
    // Calculate RSI
    const rsi14 = calculateRSI(data.map(d => d.close), 14);
    
    // Calculate MACD
    const macd = calculateMACD(data.map(d => d.close));
    
    // Calculate Bollinger Bands
    const bb = calculateBollingerBands(data.map(d => d.close));
    
    // Calculate support and resistance levels
    const supportResistance = calculateSupportResistance(data);
    
    // Calculate volume profile
    const volumeProfile = calculateVolumeProfile(data);
    
      // Determine trend
  const trend = determineTrend(data, ema20, ema50, ema200);
  
  // Calculate key price levels
  const keyLevels = calculateKeyLevels(data, supportResistance);
  
  // Return all indicators
  return {
    currentPrice,
    ema20,
    ema50,
    ema200,
    rsi14,
    macd,
    bb,
    supportResistance,
    volumeProfile,
    trend,
    keyLevels
  };
}

// Calculate EMA (Exponential Moving Average)
function calculateEMA(prices, period) {
  if (prices.length < period) return null;
  
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  
  return ema;
}

// Calculate RSI (Relative Strength Index)
function calculateRSI(prices, period = 14) {
  if (prices.length <= period) return 50; // Default to neutral if not enough data
  
  let gains = 0;
  let losses = 0;
  
  // Calculate initial average gain and loss
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // Calculate RSI using the smoothed method
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    
    if (change >= 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }
  }
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Calculate MACD (Moving Average Convergence Divergence)
function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  if (!fastEMA || !slowEMA) return { value: 0, signal: 0, histogram: 0 };
  
  const macdLine = fastEMA - slowEMA;
  
  // Calculate MACD values for the entire dataset
  const macdValues = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < slowPeriod - 1) {
      macdValues.push(0);
    } else {
      const fast = calculateEMA(prices.slice(0, i + 1), fastPeriod);
      const slow = calculateEMA(prices.slice(0, i + 1), slowPeriod);
      macdValues.push(fast - slow);
    }
  }
  
  const signalLine = calculateEMA(macdValues, signalPeriod);
  const histogram = macdLine - signalLine;
  
  return {
    value: macdLine,
    signal: signalLine,
    histogram: histogram
  };
}

// Calculate Bollinger Bands
function calculateBollingerBands(prices, period = 20, multiplier = 2) {
  if (prices.length < period) return { middle: null, upper: null, lower: null };
  
  // Calculate SMA
  const sma = prices.slice(-period).reduce((sum, price) => sum + price, 0) / period;
  
  // Calculate standard deviation
  let sumSquaredDiff = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    sumSquaredDiff += Math.pow(prices[i] - sma, 2);
  }
  
  const stdDev = Math.sqrt(sumSquaredDiff / period);
  
  return {
    middle: sma,
    upper: sma + (multiplier * stdDev),
    lower: sma - (multiplier * stdDev)
  };
}

// Calculate Support and Resistance levels
function calculateSupportResistance(data) {
  // Find local highs and lows
  const highs = [];
  const lows = [];
  
  for (let i = 5; i < data.length - 5; i++) {
    // Check for local high
    if (data[i].high > data[i-1].high && 
        data[i].high > data[i-2].high && 
        data[i].high > data[i+1].high && 
        data[i].high > data[i+2].high) {
      highs.push(data[i].high);
    }
    
    // Check for local low
    if (data[i].low < data[i-1].low && 
        data[i].low < data[i-2].low && 
        data[i].low < data[i+1].low && 
        data[i].low < data[i+2].low) {
      lows.push(data[i].low);
    }
  }
  
  // Group similar levels (within 0.5% of each other)
  const groupedHighs = groupSimilarLevels(highs);
  const groupedLows = groupSimilarLevels(lows);
  
  // Sort by strength (frequency)
  const sortedHighs = groupedHighs.sort((a, b) => b.count - a.count).slice(0, 3);
  const sortedLows = groupedLows.sort((a, b) => b.count - a.count).slice(0, 3);
  
  return {
    resistance: sortedHighs.map(h => h.level),
    support: sortedLows.map(l => l.level)
  };
}

// Group similar price levels
function groupSimilarLevels(levels) {
  const grouped = [];
  
  for (const level of levels) {
    let found = false;
    
    for (const group of grouped) {
      // If within 0.5% of an existing group
      if (Math.abs(level - group.level) / group.level < 0.005) {
        group.count++;
        group.level = (group.level * (group.count - 1) + level) / group.count; // Update average
        found = true;
        break;
      }
    }
    
    if (!found) {
      grouped.push({ level, count: 1 });
    }
  }
  
  return grouped;
}

// Calculate Volume Profile
function calculateVolumeProfile(data) {
  // Determine price range
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  
  for (const candle of data) {
    minPrice = Math.min(minPrice, candle.low);
    maxPrice = Math.max(maxPrice, candle.high);
  }
  
  // Create price zones (10 zones)
  const zoneSize = (maxPrice - minPrice) / 10;
  const zones = Array(10).fill(0);
  
  // Assign volume to zones
  for (const candle of data) {
    const avgPrice = (candle.high + candle.low) / 2;
    const zoneIndex = Math.min(9, Math.floor((avgPrice - minPrice) / zoneSize));
    zones[zoneIndex] += candle.volume;
  }
  
  // Find the zone with highest volume (Point of Control)
  let maxVolumeIndex = 0;
  for (let i = 1; i < zones.length; i++) {
    if (zones[i] > zones[maxVolumeIndex]) {
      maxVolumeIndex = i;
    }
  }
  
  const poc = minPrice + (maxVolumeIndex * zoneSize) + (zoneSize / 2);
  
  return {
    poc,
    valueArea: [
      minPrice + (Math.max(0, maxVolumeIndex - 1) * zoneSize),
      minPrice + (Math.min(9, maxVolumeIndex + 1) * zoneSize) + zoneSize
    ]
  };
}

// Determine overall trend
function determineTrend(data, ema20, ema50, ema200) {
  const currentPrice = data[data.length - 1].close;
  
  // Check EMA alignment
  const emaAlignment = (ema20 > ema50 && ema50 > ema200) ? 'bullish' :
                       (ema20 < ema50 && ema50 < ema200) ? 'bearish' : 'mixed';
  
  // Check price in relation to EMAs
  const priceVsEma = (currentPrice > ema20 && currentPrice > ema50) ? 'bullish' :
                     (currentPrice < ema20 && currentPrice < ema50) ? 'bearish' : 'mixed';
  
  // Check recent momentum (last 10 candles)
  let upCandles = 0;
  let downCandles = 0;
  
  for (let i = data.length - 10; i < data.length; i++) {
    if (data[i].close > data[i].open) {
      upCandles++;
    } else if (data[i].close < data[i].open) {
      downCandles++;
    }
  }
  
  const momentum = upCandles > downCandles ? 'bullish' :
                  downCandles > upCandles ? 'bearish' : 'neutral';
  
  // Combine signals for overall trend
  let overallTrend;
  
  if (emaAlignment === 'bullish' && priceVsEma === 'bullish') {
    overallTrend = momentum === 'bearish' ? 'bullish with correction' : 'strong bullish';
  } else if (emaAlignment === 'bearish' && priceVsEma === 'bearish') {
    overallTrend = momentum === 'bullish' ? 'bearish with correction' : 'strong bearish';
  } else if (emaAlignment === 'bullish' || priceVsEma === 'bullish') {
    overallTrend = 'moderately bullish';
  } else if (emaAlignment === 'bearish' || priceVsEma === 'bearish') {
    overallTrend = 'moderately bearish';
  } else {
    overallTrend = 'neutral/ranging';
  }
  
  return {
    overall: overallTrend,
    emaAlignment,
    priceVsEma,
    momentum
  };
}

// Calculate key price levels for trading
function calculateKeyLevels(data, supportResistance) {
  const currentPrice = data[data.length - 1].close;
  
  // Find nearest support and resistance
  let nearestSupport = -Infinity;
  let nearestResistance = Infinity;
  
  for (const support of supportResistance.support) {
    if (support < currentPrice && support > nearestSupport) {
      nearestSupport = support;
    }
  }
  
  for (const resistance of supportResistance.resistance) {
    if (resistance > currentPrice && resistance < nearestResistance) {
      nearestResistance = resistance;
    }
  }
  
  // If no support/resistance found, use recent lows/highs
  if (nearestSupport === -Infinity) {
    const recentLows = data.slice(-20).map(d => d.low);
    nearestSupport = Math.min(...recentLows);
  }
  
  if (nearestResistance === Infinity) {
    const recentHighs = data.slice(-20).map(d => d.high);
    nearestResistance = Math.max(...recentHighs);
  }
  
  // Calculate potential entry, stop loss, and take profit levels
  const riskRewardRatio = 2; // Target 1:2 risk-reward
  
  // For bullish scenario
  const bullishEntry = currentPrice;
  const bullishStopLoss = Math.max(nearestSupport * 0.995, currentPrice * 0.99); // Just below support or 1% below current price
  const bullishTakeProfit = currentPrice + (currentPrice - bullishStopLoss) * riskRewardRatio;
  
  // For bearish scenario
  const bearishEntry = currentPrice;
  const bearishStopLoss = Math.min(nearestResistance * 1.005, currentPrice * 1.01); // Just above resistance or 1% above current price
  const bearishTakeProfit = currentPrice - (bearishStopLoss - currentPrice) * riskRewardRatio;
  
  return {
    bullish: {
      entry: bullishEntry,
      stopLoss: bullishStopLoss,
      takeProfit: bullishTakeProfit
    },
    bearish: {
      entry: bearishEntry,
      stopLoss: bearishStopLoss,
      takeProfit: bearishTakeProfit
    },
    keySupport: nearestSupport,
    keyResistance: nearestResistance
  };
}

// Update the strategy table
function updateStrategyTable(indicators) {
  // Update entry points
  document.getElementById('entryPoints').innerHTML = `
    <div>Bullish: ${indicators.currentPrice.toFixed(2)} (current price)</div>
    <div>Bearish: ${indicators.currentPrice.toFixed(2)} (current price)</div>
  `;
  
  // Update take profit levels
  document.getElementById('takeProfitLevels').innerHTML = `
    <div>Bullish: ${indicators.keyLevels.bullish.takeProfit.toFixed(2)} (${((indicators.keyLevels.bullish.takeProfit / indicators.currentPrice - 1) * 100).toFixed(2)}%)</div>
    <div>Bearish: ${indicators.keyLevels.bearish.takeProfit.toFixed(2)} (${((1 - indicators.keyLevels.bearish.takeProfit / indicators.currentPrice) * 100).toFixed(2)}%)</div>
  `;
  
  // Update stop loss levels
  document.getElementById('stopLossLevels').innerHTML = `
    <div>Bullish: ${indicators.keyLevels.bullish.stopLoss.toFixed(2)} (${((1 - indicators.keyLevels.bullish.stopLoss / indicators.currentPrice) * 100).toFixed(2)}%)</div>
        <div>Bearish: ${indicators.keyLevels.bearish.stopLoss.toFixed(2)} (${((indicators.keyLevels.bearish.stopLoss / indicators.currentPrice - 1) * 100).toFixed(2)}%)</div>
  `;
  
  // Update key areas
  document.getElementById('keyAreas').innerHTML = `
    <div>Support: ${indicators.keyLevels.keySupport.toFixed(2)}</div>
    <div>Resistance: ${indicators.keyLevels.keyResistance.toFixed(2)}</div>
    <div>Volume POC: ${indicators.volumeProfile.poc.toFixed(2)}</div>
  `;
}

// Update the detailed analysis
function updateDetailedAnalysis(indicators) {
  const detailedAnalysisEl = document.getElementById('detailedAnalysis');
  
  // Determine market sentiment
  const sentiment = indicators.trend.overall.includes('bullish') ? 'bullish' : 
                   indicators.trend.overall.includes('bearish') ? 'bearish' : 'neutral';
  
  // Create analysis content
  let analysisContent = `<h3>🧠 Market Analysis</h3>`;
  
  // Add trend analysis
  analysisContent += `
    <h4>✅ ${sentiment === 'bullish' ? 'Bullish' : sentiment === 'bearish' ? 'Bearish' : 'Neutral'} Confirmation:</h4>
    <p>The market is showing a <strong class="${sentiment}-text">${indicators.trend.overall}</strong> trend based on EMA alignment and price action.</p>
  `;
  
  // Add specific observations
  if (sentiment === 'bullish') {
    analysisContent += `
      <p>EMA alignment is ${indicators.trend.emaAlignment} with price ${indicators.currentPrice.toFixed(2)} trading ${indicators.trend.priceVsEma === 'bullish' ? 'above' : 'below'} key EMAs.</p>
      <p>Recent momentum is ${indicators.trend.momentum}, suggesting ${indicators.trend.momentum === 'bullish' ? 'continued upward movement' : 'potential consolidation'}.</p>
      <p>Volume profile shows accumulation at ${indicators.volumeProfile.poc.toFixed(2)}, which ${indicators.volumeProfile.poc < indicators.currentPrice ? 'supports the uptrend' : 'may act as support'}.</p>
    `;
  } else if (sentiment === 'bearish') {
    analysisContent += `
      <p>EMA alignment is ${indicators.trend.emaAlignment} with price ${indicators.currentPrice.toFixed(2)} trading ${indicators.trend.priceVsEma === 'bearish' ? 'below' : 'above'} key EMAs.</p>
      <p>Recent momentum is ${indicators.trend.momentum}, suggesting ${indicators.trend.momentum === 'bearish' ? 'continued downward pressure' : 'potential relief bounce'}.</p>
      <p>Volume profile shows distribution at ${indicators.volumeProfile.poc.toFixed(2)}, which ${indicators.volumeProfile.poc > indicators.currentPrice ? 'adds to the bearish pressure' : 'may act as resistance'}.</p>
    `;
  } else {
    analysisContent += `
      <p>EMA alignment is mixed with price ${indicators.currentPrice.toFixed(2)} fluctuating around key EMAs.</p>
      <p>Recent momentum is ${indicators.trend.momentum}, suggesting a range-bound market.</p>
      <p>Volume profile shows consolidation at ${indicators.volumeProfile.poc.toFixed(2)}, which may act as a pivot point.</p>
    `;
  }
  
  // Add RSI and MACD analysis
  analysisContent += `
    <p>RSI(14) is at ${indicators.rsi14.toFixed(2)}, indicating ${
      indicators.rsi14 > 70 ? 'overbought conditions' : 
      indicators.rsi14 < 30 ? 'oversold conditions' : 
      'neutral momentum'
    }.</p>
    
    <p>MACD is ${
      indicators.macd.value > indicators.macd.signal ? 'above' : 'below'
    } the signal line with a ${
      indicators.macd.histogram > 0 ? 'positive' : 'negative'
    } histogram, suggesting ${
      indicators.macd.histogram > 0 ? 'bullish' : 'bearish'
    } momentum.</p>
  `;
  
  // Add Bollinger Bands analysis
  const bbPosition = (indicators.currentPrice - indicators.bb.lower) / 
                    (indicators.bb.upper - indicators.bb.lower);
  
  analysisContent += `
    <p>Price is at ${(bbPosition * 100).toFixed(1)}% of the Bollinger Band range, ${
      bbPosition > 0.8 ? 'near the upper band (potential resistance or strong trend)' : 
      bbPosition < 0.2 ? 'near the lower band (potential support or strong downtrend)' : 
      'in the middle of the range (neutral)'
    }.</p>
  `;
  
  // Add what's next section
  analysisContent += `
    <h4>📈 What's Next?</h4>
    <p>If this ${sentiment} momentum continues, next potential areas to watch for:</p>
    <ul>
      ${sentiment === 'bullish' ? `
        <li>Next resistance: ${indicators.keyLevels.keyResistance.toFixed(2)}</li>
        <li>Target: ${indicators.keyLevels.bullish.takeProfit.toFixed(2)} (${((indicators.keyLevels.bullish.takeProfit / indicators.currentPrice - 1) * 100).toFixed(2)}% upside)</li>
      ` : sentiment === 'bearish' ? `
        <li>Next support: ${indicators.keyLevels.keySupport.toFixed(2)}</li>
        <li>Target: ${indicators.keyLevels.bearish.takeProfit.toFixed(2)} (${((1 - indicators.keyLevels.bearish.takeProfit / indicators.currentPrice) * 100).toFixed(2)}% downside)</li>
      ` : `
        <li>Upper range: ${indicators.keyLevels.keyResistance.toFixed(2)}</li>
        <li>Lower range: ${indicators.keyLevels.keySupport.toFixed(2)}</li>
      `}
    </ul>
    
    <p>But be cautious of:</p>
    <ul>
      ${sentiment === 'bullish' ? `
        <li>A pullback to ${indicators.keyLevels.keySupport.toFixed(2)} is possible as price often retests support levels.</li>
        <li>Watch for volume confirmation on breakouts above ${indicators.keyLevels.keyResistance.toFixed(2)}.</li>
      ` : sentiment === 'bearish' ? `
        <li>A relief bounce to ${indicators.keyLevels.keyResistance.toFixed(2)} is possible as price often retests resistance levels.</li>
        <li>Watch for volume confirmation on breakdowns below ${indicators.keyLevels.keySupport.toFixed(2)}.</li>
      ` : `
        <li>Breakout above ${indicators.keyLevels.keyResistance.toFixed(2)} would signal bullish continuation.</li>
        <li>Breakdown below ${indicators.keyLevels.keySupport.toFixed(2)} would signal bearish continuation.</li>
      `}
    </ul>
  `;
  
  // Add strategy hint
  analysisContent += `
    <h4>🧠 Strategy Hint (if you're trading this):</h4>
    <p><strong>Aggressive entry:</strong> ${
      sentiment === 'bullish' 
        ? `Buy on minor dips above ${indicators.keyLevels.keySupport.toFixed(2)} with tight SL at ${indicators.keyLevels.bullish.stopLoss.toFixed(2)}.`
        : sentiment === 'bearish'
        ? `Sell on minor rallies below ${indicators.keyLevels.keyResistance.toFixed(2)} with tight SL at ${indicators.keyLevels.bearish.stopLoss.toFixed(2)}.`
        : `Wait for breakout confirmation above ${indicators.keyLevels.keyResistance.toFixed(2)} or below ${indicators.keyLevels.keySupport.toFixed(2)}.`
    }</p>
    
    <p><strong>Safer entry:</strong> ${
      sentiment === 'bullish'
        ? `Wait for a retest of ${indicators.keyLevels.keySupport.toFixed(2)} → look for bullish candle confirmation + low wick + bounce volume.`
        : sentiment === 'bearish'
        ? `Wait for a retest of ${indicators.keyLevels.keyResistance.toFixed(2)} → look for bearish candle confirmation + upper wick + rejection volume.`
        : `Trade the range: buy near ${indicators.keyLevels.keySupport.toFixed(2)} and sell near ${indicators.keyLevels.keyResistance.toFixed(2)}.`
    }</p>
    
    <p><strong>Target levels:</strong> ${
      sentiment === 'bullish'
        ? `${indicators.keyLevels.bullish.takeProfit.toFixed(2)}, with trailing stop to protect gains.`
        : sentiment === 'bearish'
        ? `${indicators.keyLevels.bearish.takeProfit.toFixed(2)}, with trailing stop to protect gains.`
        : `Use the range boundaries as targets with appropriate stop losses outside the range.`
    }</p>
  `;
  
  // Update the element
  detailedAnalysisEl.innerHTML = analysisContent;
}

// Helper functions
function showLoading(isLoading) {
  // You could add a loading spinner here
  const analyzeBtn = document.getElementById('analyzeChartBtn');
  
  if (analyzeBtn) {
    analyzeBtn.disabled = isLoading;
    analyzeBtn.innerHTML = isLoading ? 
      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="animate-spin">
        <path d="M12 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 18V22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4.93 4.93L7.76 7.76" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M16.24 16.24L19.07 19.07" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M2 12H6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M18 12H22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4.93 19.07L7.76 16.24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M16.24 7.76L19.07 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg> ANALYZING...` : 
      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2"/>
        <path d="M12 7V12L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg> ANALYZE CHART`;
  }
}

function showError(message) {
  alert(`Error: ${message}`);
}

function updateLastUpdated() {
  const lastUpdatedEl = document.getElementById('lastUpdated');
  if (lastUpdatedEl) {
    lastUpdatedEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  }
}

// Add event listener for the mode toggle
document.addEventListener('DOMContentLoaded', () => {
  const modeToggle = document.getElementById('modeToggle');
  
  if (modeToggle) {
    modeToggle.addEventListener('change', function() {
      if (!this.checked) {
        // If unchecked, redirect to index.html (dashboard view)
        window.location.href = 'index.html';
      }
    });
  }
});
