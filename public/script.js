// ===============================
// 🌍 Configuración Global
// ===============================
let CONFIG = {};
let SERVICES = {};

// Cargar config.json (tipo de cambio y WhatsApp)
async function loadConfig() {
  try {
    const res = await fetch("/config.json");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    CONFIG = await res.json();
    
    // Valores por defecto seguros
    const exchangeRate = parseFloat(CONFIG.exchangeRate) || 4;
    const defaultCurrency = CONFIG.defaultCurrency || "PEN";
    
    localStorage.setItem("exchangeRate", String(exchangeRate));
    localStorage.setItem("defaultCurrency", defaultCurrency);
    
    window.APP_CONFIG = { ...CONFIG, exchangeRate, defaultCurrency };
    return window.APP_CONFIG;
  } catch (err) {
    console.error("⚠️ No se pudo cargar config.json:", err);
    const fallback = { exchangeRate: 4, defaultCurrency: "PEN", whatsapp: "" };
    window.APP_CONFIG = fallback;
    return fallback;
  }
}

// Cargar lista de servicios desde el servidor
async function loadServices() {
  try {
    const res = await fetch("/api/services");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    SERVICES = await res.json();
    
    // Validar estructura
    if (typeof SERVICES !== 'object' || SERVICES === null) {
      throw new Error("Formato inválido en services.json");
    }
    
    window.SERVICES = SERVICES;
    return SERVICES;
  } catch (err) {
    console.error("⚠️ No se pudo cargar services.json:", err);
    window.SERVICES = {};
    return {};
  }
}

// ===============================
// 💵 Actualización de precios en la tabla
// ===============================
function updatePrices() {
  const rate = Number(window.APP_CONFIG?.exchangeRate) || 4;
  const curr = localStorage.getItem("currency") || window.APP_CONFIG?.defaultCurrency || "PEN";

  document.querySelectorAll(".price-per-1000").forEach(el => {
    const basePen = parseFloat(el.dataset.pricePen);
    if (isNaN(basePen)) return;

    const totalInCurr = curr === "USD" ? basePen / rate : basePen;
    const symbol = curr === "USD" ? "$" : "S/.";

    el.innerText = `${symbol} ${totalInCurr.toFixed(2)}`;
  });
}

// ===============================
// 🗣️ Selector de moneda
// ===============================
function setupSelectors() {
  const currencyEl = document.getElementById("currencySelect");
  if (!currencyEl) return;

  const savedCurrency = localStorage.getItem("currency") || (window.APP_CONFIG?.defaultCurrency || "PEN");
  currencyEl.value = savedCurrency;

  currencyEl.addEventListener("change", e => {
    localStorage.setItem("currency", e.target.value);
    updatePrices();
  });
}

// ===============================
// 🚀 Inicialización robusta
// ===============================
function initApp() {
  loadConfig()
    .then(() => loadServices())
    .then(() => {
      setupSelectors();
      updatePrices();
    })
    .catch(err => {
      console.error("Error crítico al inicializar la app:", err);
    });
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  // DOM ya cargado
  initApp();
}