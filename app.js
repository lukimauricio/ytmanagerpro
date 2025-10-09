const express = require("express");
const path = require("path");
const fs = require("fs");
const expressLayouts = require("express-ejs-layouts");
const requestIp = require("request-ip");
const geoip = require("geoip-lite");

const app = express();
const PORT = process.env.PORT || 3000;

// ----------------------------------------
// ⚙️ Configuración EJS + Layouts
// ----------------------------------------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layout");

// ----------------------------------------
// 🧾 Archivos estáticos (CSS, JS, imágenes, config.js)
// ----------------------------------------
app.use(express.static(path.join(__dirname, "public")));

// ----------------------------------------
// ⚙️ Cargar configuración global (tipo de cambio, etc.)
// ----------------------------------------
const config = require(path.join(__dirname, "public", "config.json"));

// ----------------------------------------
// 📂 Cargar servicios desde data/services.json
// ----------------------------------------
const SERVICES_PATH = path.join(__dirname, "data", "services.json");
let services = {};

function loadServices() {
  try {
    const raw = fs.readFileSync(SERVICES_PATH, "utf8");
    const parsed = JSON.parse(raw);

    // Aseguramos formato por plataforma
    if (Array.isArray(parsed)) {
      services = parsed.reduce((acc, s) => {
        const platform = s.platform?.toLowerCase() || "otros";
        if (!acc[platform]) acc[platform] = [];
        acc[platform].push(s);
        return acc;
      }, {});
    } else {
      services = parsed;
    }

    console.log(`[SERVICES] ✅ Cargadas ${Object.keys(services).length} categorías desde services.json`);
  } catch (err) {
    console.error("[SERVICES] ⚠️ Error al cargar services.json:", err.message);
    services = {};
  }
}

// 🔁 Cargar servicios al iniciar
loadServices();

// 👀 Vigilar cambios en el JSON
fs.watchFile(SERVICES_PATH, { interval: 2000 }, () => {
  console.log("[SERVICES] ♻️ Cambio detectado en services.json — recargando...");
  loadServices();
});

// ----------------------------------------
// 🌍 Detección automática de país → moneda
// ----------------------------------------
app.use(requestIp.mw());

app.use((req, res, next) => {
  const clientIp = req.clientIp || "0.0.0.0";
  const geo = geoip.lookup(clientIp);
  const country = geo ? geo.country : "PE";

  // Moneda por defecto
  let currency = "PEN";
  if (["US", "CA"].includes(country)) currency = "USD";

  // Permitir override manual con ?currency=
  if (req.query.currency) currency = req.query.currency;

  res.locals.currency = currency;
  res.locals.page = "";
  res.locals.showCurrencySelector = false;
  next();
});

// ----------------------------------------
// 🚏 Rutas
// ----------------------------------------
app.get("/", (req, res) => {
  res.render("index", {
    title: "Inicio",
    page: "home",
    showCurrencySelector: true,
    config
  });
});

app.get("/services", (req, res) => {
  res.render("services", {
    title: "Servicios",
    page: "services",
    services,
    currency: res.locals.currency,
    config,
    showCurrencySelector: true
  });
});

app.get("/faq", (req, res) => {
  res.render("faq", {
    title: "Preguntas Frecuentes",
    page: "faq",
    showCurrencySelector: true,
    config
  });
});

app.get("/terms", (req, res) => {
  res.render("terms", {
    title: "Términos y Condiciones",
    page: "terms",
    showCurrencySelector: true,
    config
  });
});

app.get("/contact", (req, res) => {
  res.render("contact", {
    title: "Contacto",
    page: "contact",
    showCurrencySelector: true,
    config
  });
});

// ----------------------------------------
// 📡 API Pública
// ----------------------------------------
app.get("/api/services", (req, res) => {
  res.json(services);
});

// 🚀 Iniciar servidor
// ---------------------------------------------
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
