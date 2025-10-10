// ===============================
// 🌍 Configuración Global
// ===============================
let CONFIG = {};
let SERVICES = {};

// Cargar config.json (tipo de cambio y WhatsApp)
async function loadConfig() {
  try {
    const res = await fetch("/config.json");
    CONFIG = await res.json();
    localStorage.setItem("exchangeRate", CONFIG.exchangeRate);
    localStorage.setItem("defaultCurrency", CONFIG.defaultCurrency);
    return CONFIG;
  } catch (err) {
    console.error("⚠️ No se pudo cargar config.json:", err);
    return { exchangeRate: 4, defaultCurrency: "PEN" };
  }
}

// Cargar lista de servicios desde el servidor
async function loadServices() {
  try {
    const res = await fetch("/api/services");
    SERVICES = await res.json();
    return SERVICES;
  } catch (err) {
    console.error("⚠️ No se pudo cargar services.json:", err);
    return {};
  }
}

// ===============================
// 💵 Actualización de precios
// ===============================
function updatePrices() {
  const rate = Number(CONFIG.exchangeRate || 4);
  const curr = localStorage.getItem("currency") || CONFIG.defaultCurrency || "PEN";

  // Recalcular precios por 1000
  document.querySelectorAll(".price-per-1000").forEach(el => {
    const basePen = parseFloat(el.dataset.pricePen);
    if (isNaN(basePen)) return;

    const converted = curr === "USD" ? basePen / rate : basePen;
    el.innerText = curr === "USD"
      ? `$${converted.toFixed(2)}`
      : `S/. ${basePen.toFixed(2)}`;
  });

  // Recalcular totales
  document.querySelectorAll(".qty-input").forEach(input => {
    const row = input.closest("tr");
    const totalEl = row?.querySelector(".price-total");
    const pricePen = parseFloat(row.querySelector(".price-per-1000").dataset.pricePen);
    const qty = parseFloat(input.value || 0);

    const total = (qty / 1000) * (curr === "USD" ? pricePen / rate : pricePen);
    if (totalEl) {
      totalEl.innerText = curr === "USD"
        ? `Total: $${total.toFixed(2)}`
        : `Total: S/. ${total.toFixed(2)}`;
    }
  });
}

// ===============================
// 🗣️ Cambio de moneda
// ===============================
function setupSelectors() {
  const currencyEl = document.getElementById("currencySelect");

  const savedCurrency = localStorage.getItem("currency") || CONFIG.defaultCurrency || "PEN";
  if (currencyEl) currencyEl.value = savedCurrency;

  if (currencyEl) currencyEl.addEventListener("change", e => {
    localStorage.setItem("currency", e.target.value);
    updatePrices();
  });
}

// ===============================
// 🔍 Buscar servicio por ID
// ===============================
function findServiceById(id) {
  if (!SERVICES) return null;
  for (const cat in SERVICES) {
    const found = SERVICES[cat].find(x => x.id == id);
    if (found) return found;
  }
  return null;
}

// ===============================
// 💬 Modal para descripción
// ===============================
function showDescription(service) {
  const modal = document.getElementById("descModal");
  const modalBody = document.getElementById("modalBody");

  if (!modal || !modalBody) {
    alert("Sin descripción disponible.");
    return;
  }

  const desc = service.description || service.desc_es || "Sin descripción disponible.";
  const notes = service.notes_es || service.notes || [];

  modalBody.innerHTML = `
    <div style="
      padding: 20px;
      font-family: 'Poppins', sans-serif;
      color: #333;
      text-align: left;
      margin-top: -40px; /* 🔼 sube un poco el cuadro */
    ">
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px; text-align: left;">
        ${service.service}
      </h2>
      <p style="font-size: 14px; color: #555; text-align: left; margin-bottom: 10px;">
        ${desc}
      </p>
      <hr style="margin: 12px 0; border: 0; border-top: 1px solid #ddd;">

      <div style="font-size: 14px; line-height: 1.8; text-align: left;">
        <p>💎 <strong>Calidad:</strong> ${service.quality || "No especificado"}</p>
        <p>⏱️ <strong>Inicio:</strong> ${service.start_time || "-"}</p>
        <p>⚡ <strong>Velocidad:</strong> ${service.speed || "-"}</p>
        <p>🔁 <strong>Recarga:</strong> ${service.refill || "No aplica"}</p>
        <p>📉 <strong>Drop:</strong> ${service.drop || "No"}</p>
        ${service.link ? `<p>🔗 <strong>Enlace:</strong> ${service.link}</p>` : ""}
      </div>

      ${notes.length > 0 ? `
        <hr style="margin: 12px 0; border: 0; border-top: 1px solid #ddd;">
        <div style="margin-top: 10px; text-align: left;">
          <h4 style="color: #b91c1c; margin-bottom: 6px;">⚠️ Notas:</h4>
          <ul style="padding-left: 18px; font-size: 13px; color: #333;">
            ${notes.map(n => `<li style="margin-bottom: 4px;">${n}</li>`).join("")}
          </ul>
        </div>
      ` : ""}
    </div>
  `;

  modal.style.display = "block";
}

function closeModal() {
  const modal = document.getElementById("descModal");
  if (modal) modal.style.display = "none";
}

window.addEventListener("click", e => {
  const modal = document.getElementById("descModal");
  if (e.target === modal) closeModal();
});

document.addEventListener("DOMContentLoaded", () => {
  const orderModal = document.getElementById("orderModal");
  const closeOrderModal = document.getElementById("closeOrderModal");
  const confirmOrder = document.getElementById("confirmOrder");
  const cancelOrder = document.getElementById("cancelOrder");

  let currentOrder = {};

  // ✅ Escuchar el evento personalizado desde services.ejs
  document.addEventListener('openOrderModal', e => {
    const { id, quantity, service, price } = e.detail;

    const curr = localStorage.getItem("currency") || CONFIG.defaultCurrency || "PEN";
    const rate = Number(CONFIG.exchangeRate || 4);
    const total = (quantity / 1000) * (curr === "USD" ? price / rate : price);

    currentOrder = { id, service: service, quantity: quantity, price: price };

    document.getElementById("order-id").textContent = id;
    document.getElementById("order-service").textContent = service;
    document.getElementById("order-quantity").textContent = quantity;
    document.getElementById("order-total").textContent =
      curr === "USD" ? `$${total.toFixed(2)}` : `S/. ${total.toFixed(2)}`;

    orderModal.classList.add("active"); // ✅ mostrar modal
  });

  // 💬 Confirmar pedido → abrir WhatsApp
  confirmOrder.addEventListener("click", () => {
    const link = document.getElementById("order-link").value.trim();
    if (!link) return alert("Por favor ingresa el enlace del contenido.");

    const curr = localStorage.getItem("currency") || CONFIG.defaultCurrency || "PEN";
    const total = (currentOrder.quantity / 1000) *
                  (curr === "USD" ? currentOrder.price / CONFIG.exchangeRate : currentOrder.price);

    const mensaje = `🧾 *Nueva orden YT Manager*%0A` +
                `🔹 *ID:* ${currentOrder.id}%0A` +
                `🔹 *Servicio:* ${currentOrder.service}%0A` +
                `🔹 *Cantidad:* ${currentOrder.quantity}%0A` +
                `🔹 *Enlace:* ${encodeURIComponent(link)}%0A%0A` +
                `💰 *Total a pagar:* S/. ${(currentOrder.price * (currentOrder.quantity / 1000)).toFixed(2)}`;

    const telefono = (CONFIG.whatsapp || window.APP_CONFIG?.whatsapp || "").replace(/\D/g, "");
    if (!telefono) {
      alert("⚠️ No se ha configurado el número de WhatsApp en config.json.");
      return;
    }

    const url = `https://wa.me/${telefono}?text=${mensaje}`;
    window.open(url, "_blank");

    orderModal.classList.remove("active"); // ✅ cerrar modal
  });

  // ❌ Cerrar modal
  cancelOrder.addEventListener("click", () => orderModal.classList.remove("active"));
  closeOrderModal.addEventListener("click", () => orderModal.classList.remove("active"));
});

// ===============================
// 🛒 Botones de acción
// ===============================
function setupButtons() {
  document.addEventListener("click", e => {
    const btn = e.target;
    if (btn.classList.contains("desc-btn")) {
      const id = btn.dataset.id;
      const service = findServiceById(id);
      if (service) showDescription(service);
    }
  });

  document.addEventListener("input", e => {
    if (!e.target.classList.contains("qty-input")) return;
    updatePrices();
  });
}

// ===============================
// 🚀 Inicialización
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
  await loadConfig();
  await loadServices();
  setupSelectors();
  setupButtons();
  updatePrices();
});