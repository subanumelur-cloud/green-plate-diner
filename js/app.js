/* ===== CONFIG: change these to your real details ===== */
const RESTAURANT_NAME = "Green Plate Diner";
const WHATSAPP_NUMBER = "910000000000"; // Country code + number, no + or spaces
const CURRENCY = "";                    // e.g. "Rs. " or "$"

// Pure veg menu. Prices are placeholders (0), fill in your real prices.
const MENU = [
  { id: "v1", name: "Masala Dosa", desc: "Crispy dosa with potato masala, chutney, sambar", price: 0 },
  { id: "v2", name: "Paneer Tikka Roll", desc: "Grilled paneer, onion, mint chutney in a soft roll", price: 0 },
  { id: "v3", name: "Veg Burger", desc: "Crispy veg patty, cheese, lettuce, house sauce", price: 0 },
  { id: "v4", name: "Cheese Corn Sandwich", desc: "Sweet corn, cheese and herbs, toasted", price: 0 },
  { id: "v5", name: "Crinkle Fries", desc: "Salted and served hot", price: 0 },
  { id: "v6", name: "Masala Chai", desc: "Hot, spiced, freshly brewed", price: 0 },
  { id: "v7", name: "Mango Lassi", desc: "Chilled, thick and sweet", price: 0 }
];
/* ===================================================== */

// Read table number from URL, e.g. ?table=5
const params = new URLSearchParams(window.location.search);
const rawTable = params.get("table") || "";
const TABLE = /^[A-Za-z0-9-]{1,10}$/.test(rawTable) ? rawTable : "";
const STORAGE_KEY = "green-plate-cart-" + (TABLE || "unknown");

const cart = loadCart();

const tableBadge = document.getElementById("tableBadge");
const menuList = document.getElementById("menuList");
const summaryLines = document.getElementById("summaryLines");
const totalAmount = document.getElementById("totalAmount");
const orderBtn = document.getElementById("orderBtn");
const notice = document.getElementById("notice");
const nameInput = document.getElementById("customerName");
const noteInput = document.getElementById("note");
const previewBtn = document.getElementById("previewBtn");
const previewBox = document.getElementById("previewBox");

tableBadge.textContent = TABLE ? "TABLE " + TABLE.toUpperCase() : "TABLE NOT SET";
document.title = RESTAURANT_NAME + (TABLE ? " - Table " + TABLE : "");

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && typeof saved === "object" ? saved : {};
  } catch (e) {
    return {};
  }
}

function saveCart() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch (e) {
    // Storage may be blocked; the cart still works for this page visit
  }
}

function formatPrice(value) {
  return CURRENCY + value.toFixed(2);
}

function getItemCount() {
  return Object.values(cart).reduce((a, b) => a + b, 0);
}

function buildMenu() {
  menuList.innerHTML = "";

  MENU.forEach((item) => {
    const row = document.createElement("div");
    row.className = "item";

    const info = document.createElement("div");
    info.className = "item-info";

    const name = document.createElement("div");
    name.className = "item-name";
    name.textContent = item.name;

    const desc = document.createElement("div");
    desc.className = "item-desc";
    desc.textContent = item.desc;

    info.append(name, desc);

    const price = document.createElement("div");
    price.className = "item-price";
    price.textContent = formatPrice(item.price);

    const qty = document.createElement("div");
    qty.className = "qty";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "-";
    minus.setAttribute("aria-label", "Remove one " + item.name);

    const count = document.createElement("span");
    count.id = "qty-" + item.id;
    count.textContent = cart[item.id] || 0;

    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.setAttribute("aria-label", "Add one " + item.name);

    minus.addEventListener("click", () => changeQty(item.id, -1));
    plus.addEventListener("click", () => changeQty(item.id, 1));

    qty.append(minus, count, plus);
    row.append(info, price, qty);
    menuList.appendChild(row);
  });

  revealOnScroll();
}

function changeQty(id, delta) {
  const next = (cart[id] || 0) + delta;
  if (next <= 0) {
    delete cart[id];
  } else {
    cart[id] = Math.min(next, 20);
  }
  saveCart();
  hidePreview();
  updateView();
}

function hidePreview() {
  previewBox.hidden = true;
  previewBox.textContent = "";
}

function updateView() {
  MENU.forEach((item) => {
    const el = document.getElementById("qty-" + item.id);
    if (el) el.textContent = cart[item.id] || 0;
  });

  summaryLines.innerHTML = "";
  let total = 0;
  let itemCount = 0;

  MENU.forEach((item) => {
    const qty = cart[item.id];
    if (!qty) return;

    total += qty * item.price;
    itemCount += qty;

    const line = document.createElement("div");
    line.className = "summary-row";

    const left = document.createElement("span");
    left.textContent = qty + " x " + item.name;

    const right = document.createElement("span");
    right.textContent = formatPrice(qty * item.price);

    line.append(left, right);
    summaryLines.appendChild(line);
  });

  if (itemCount === 0) {
    const empty = document.createElement("div");
    empty.className = "summary-row";
    empty.textContent = "No items yet";
    summaryLines.appendChild(empty);
  }

  totalAmount.textContent = formatPrice(total);
  updateOrderButton(itemCount);
}

function buildOrderMessage() {
  const lines = [];
  lines.push("*New order - " + RESTAURANT_NAME + "*");
  lines.push("Table: " + (TABLE || "not specified"));

  const name = nameInput.value.trim();
  if (name) lines.push("Name: " + name);

  lines.push("");

  let total = 0;
  MENU.forEach((item) => {
    const qty = cart[item.id];
    if (!qty) return;
    total += qty * item.price;
    lines.push(qty + " x " + item.name + " (" + formatPrice(qty * item.price) + ")");
  });

  lines.push("");
  lines.push("Total: " + formatPrice(total));

  const note = noteInput.value.trim();
  if (note) {
    lines.push("");
    lines.push("Note: " + note);
  }

  return lines.join("\n");
}

function updateOrderButton(itemCount) {
  if (itemCount === 0 || !TABLE) {
    orderBtn.setAttribute("aria-disabled", "true");
    orderBtn.removeAttribute("href");
    notice.textContent = !TABLE
      ? "Please scan the QR code on your table to order."
      : "Add at least one item to place your order.";
    return;
  }

  const url = "https://wa.me/" + WHATSAPP_NUMBER +
    "?text=" + encodeURIComponent(buildOrderMessage());

  orderBtn.href = url;
  orderBtn.setAttribute("aria-disabled", "false");
  notice.textContent = "Tap to send your order on WhatsApp.";
}

// Demo: shows the exact WhatsApp message on screen without sending it
previewBtn.addEventListener("click", () => {
  if (getItemCount() === 0) {
    hidePreview();
    notice.textContent = "Add at least one item to preview your order.";
    return;
  }

  previewBox.textContent = buildOrderMessage();
  previewBox.hidden = false;
  notice.textContent = "This is how your order will look on WhatsApp.";
});

// Subtle scroll reveal. CSS turns off the animation for reduced motion.
function revealOnScroll() {
  const items = document.querySelectorAll(".item");

  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("show"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  items.forEach((el) => observer.observe(el));
}

// Name and note changes refresh the order link and summary
nameInput.addEventListener("input", () => {
  hidePreview();
  updateView();
});
noteInput.addEventListener("input", () => {
  hidePreview();
  updateView();
});

buildMenu();
updateView();