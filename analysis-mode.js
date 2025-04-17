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
