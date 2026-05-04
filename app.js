/* ============================================================
   COOKIE FUNDRAISER — app.js
   ============================================================
   SETUP: Search for "CONFIGURE ME" to find all values you
   need to update before going live.
   ============================================================ */

/* ----------------------------------------------------------
   CONFIGURE ME: Google Sheets integration
   After following the steps in google-apps-script.js, paste
   your deployed Apps Script web app URL here.
   Leave blank to skip order logging (site still works fine).
   ---------------------------------------------------------- */
const SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzNvSJL0iBwkavRQHCHF66NLPI8n3S1jzSltlqmPpkN134viELVavxIaplVGBkgWj2K/exec';
// Example: 'https://script.google.com/macros/s/AKfycbxXXXXXX/exec'

/* ----------------------------------------------------------
   CONFIGURE ME: Update your payment handles here
   ---------------------------------------------------------- */
const PAYMENT_CONFIG = {
  cashapp: {
    handle: '$YourCashtag',               // e.g. '$SharonsSweets'
    link:   'https://cash.app/$YourCashtag'
  },
  venmo: {
    handle: '@YourVenmo',                 // e.g. '@SharonsSweets'
    link:   'https://venmo.com/YourVenmo'
  },
  email: 'sharonscookiessupreme@gmail.com'
};

/* ----------------------------------------------------------
   CONFIGURE ME: Edit your cookies here
   Add, remove, or update any entry.

   Fields:
     id        – unique number, don't repeat
     name      – cookie name shown on card
     occasions – array, any combo of:
                 'Teacher Appreciation', "Mother's Day", 'Graduation'
     desc      – short description
     emoji     – placeholder until you add real photos
     imageSrc  – path to photo, e.g. 'images/spring-swirl.jpg'
                 set to '' to use the emoji placeholder
     price     – number, dollars
     stock     – starting max orders
     size      – size label shown in modal
     topper    – default recommended topper label
   ---------------------------------------------------------- */
const COOKIES = [
  {
    id: 1,
    name: 'Spring Swirl',
    occasions: ['Teacher Appreciation', "Mother's Day"],
    desc: 'Vanilla bean cookie with rose-pink buttercream swirl. A timeless classic.',
    emoji: '🌸',
    imageSrc: '',
    price: 15,
    stock: 20,
    size: '6"×6"',
    topper: 'Spring Flower'
  },
  {
    id: 2,
    name: 'Golden Grad Cap',
    occasions: ['Graduation'],
    desc: 'Rich chocolate cookie with gold fondant grad cap topper.',
    emoji: '🎓',
    imageSrc: '',
    price: 18,
    stock: 15,
    size: '6"×6"',
    topper: 'Diploma scroll'
  },
  {
    id: 3,
    name: 'Apple for Teacher',
    occasions: ['Teacher Appreciation'],
    desc: 'Red velvet cookie topped with cream cheese frosting and an apple fondant.',
    emoji: '🍎',
    imageSrc: '',
    price: 16,
    stock: 12,
    size: '6"×6"',
    topper: 'Chalkboard flag'
  },
  {
    id: 4,
    name: "Mom's Bouquet",
    occasions: ["Mother's Day"],
    desc: 'Lemon lavender cookie with lavender frosting and pressed flower decoration.',
    emoji: '💐',
    imageSrc: '',
    price: 18,
    stock: 10,
    size: '6"×6"',
    topper: 'Floral spray'
  },
  {
    id: 5,
    name: "Class of '25",
    occasions: ['Graduation'],
    desc: 'Funfetti cookie with white chocolate drizzle. Party in every bite.',
    emoji: '🎉',
    imageSrc: '',
    price: 15,
    stock: 25,
    size: '6"×6"',
    topper: 'Year banner'
  },
  {
    id: 6,
    name: "World's Best",
    occasions: ['Teacher Appreciation'],
    desc: "Brown butter chocolate chip — Sharon's secret recipe since 1989.",
    emoji: '⭐',
    imageSrc: '',
    price: 15,
    stock: 30,
    size: '6"×6"',
    topper: 'Star topper'
  },
  {
    id: 7,
    name: 'Sunday Rose',
    occasions: ["Mother's Day"],
    desc: 'Strawberry shortcake cookie with vanilla cream and a handmade sugar rose.',
    emoji: '🌹',
    imageSrc: '',
    price: 18,
    stock: 8,
    size: '6"×6"',
    topper: 'Rose topper'
  },
  {
    id: 8,
    name: 'Honor Roll',
    occasions: ['Graduation'],
    desc: 'M&M cookie with royal blue and gold accents. School colors edition.',
    emoji: '🏆',
    imageSrc: '',
    price: 16,
    stock: 20,
    size: '6"×6"',
    topper: 'Ribbon topper'
  },
];

/* ----------------------------------------------------------
   COOKIE TOPPER OPTIONS
   ---------------------------------------------------------- */
const TOPPER_OPTIONS = [
  { value: '',              label: 'No topper',    price: 0 },
  { value: 'He is Risen',   label: 'He is Risen',  price: 0 },
  { value: 'Easter Bunny',  label: 'Easter Bunny', price: 0 },
  { value: 'Spring Flower', label: 'Spring Flower (+$1)', price: 1 },
  { value: 'Happy Easter',  label: 'Happy Easter', price: 0 },
];

/* ----------------------------------------------------------
   APPLICATION STATE
   ---------------------------------------------------------- */
let state = {
  filter: 'All',
  cart: [],
  cartOpen: false,
  inventory: {},       // { [cookieId]: maxOrders }
  ordered: {},         // { [cookieId]: totalOrdered }
  adminOpen: false,
  activeModal: null,   // cookie object currently in modal
  modalForm: {
    name: '',
    email: '',
    qty: 1,
    topper: '',
    note: ''
  },
  orderSuccess: null,
};

/* Initialise inventory from COOKIES data */
COOKIES.forEach(c => {
  state.inventory[c.id] = c.stock;
  state.ordered[c.id] = 0;
});

/* ----------------------------------------------------------
   HELPERS
   ---------------------------------------------------------- */
function remaining(cookieId) {
  return state.inventory[cookieId] - state.ordered[cookieId];
}

function fmt(n) {
  return '$' + n.toFixed(2);
}

function cartTotal() {
  return state.cart.reduce((sum, item) => sum + item.lineTotal, 0);
}

function cartCount() {
  return state.cart.reduce((sum, item) => sum + item.qty, 0);
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ----------------------------------------------------------
   PAYMENT HANDLES — inject configured values
   ---------------------------------------------------------- */
function initPaymentHandles() {
  const ch = document.getElementById('cashapp-handle');
  const cl = document.getElementById('cashapp-link');
  const vh = document.getElementById('venmo-handle');
  const vl = document.getElementById('venmo-link');
  if (ch) ch.textContent = PAYMENT_CONFIG.cashapp.handle;
  if (cl) cl.href = PAYMENT_CONFIG.cashapp.link;
  if (vh) vh.textContent = PAYMENT_CONFIG.venmo.handle;
  if (vl) vl.href = PAYMENT_CONFIG.venmo.link;
}

/* ----------------------------------------------------------
   COOKIE GRID
   ---------------------------------------------------------- */
function renderCookieGrid() {
  const grid = document.getElementById('cookie-grid');
  const heading = document.getElementById('grid-heading');
  const filtered = state.filter === 'All'
    ? COOKIES
    : COOKIES.filter(c => c.occasions.includes(state.filter));

  heading.textContent = state.filter === 'All' ? 'All Cookies' : state.filter + ' Cookies';

  grid.innerHTML = filtered.map(c => {
    const rem = remaining(c.id);
    const soldOut = rem <= 0;
    const low = rem > 0 && rem <= 5;

    const imgMarkup = c.imageSrc
      ? `<div class="cookie-img"><img src="${c.imageSrc}" alt="${c.name} cookie" loading="lazy"></div>`
      : `<div class="cookie-img" aria-hidden="true">${c.emoji}</div>`;

    const stockLabel = soldOut
      ? `<span class="cookie-stock">Sold out</span>`
      : low
        ? `<span class="low-stock">Only ${rem} left!</span>`
        : `<span class="cookie-stock">${rem} available</span>`;

    const actionBtn = soldOut
      ? `<button class="sold-out-btn" disabled>Sold out</button>`
      : `<button class="add-btn" data-id="${c.id}">+ Add</button>`;

    return `
      <article class="cookie-card">
        ${imgMarkup}
        <div class="cookie-info">
          <div class="cookie-occasion">${c.occasions.join(' · ')}</div>
          <div class="cookie-name">${c.name}</div>
          <div class="cookie-desc">${c.desc}</div>
          <div class="cookie-footer">
            <div>
              <div class="cookie-price">${fmt(c.price)}</div>
              ${stockLabel}
            </div>
            ${actionBtn}
          </div>
        </div>
      </article>`;
  }).join('');

  /* Bind add-to-cart buttons */
  grid.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal(parseInt(btn.dataset.id)));
  });
}

/* ----------------------------------------------------------
   OCCASION FILTER
   ---------------------------------------------------------- */
function initOccasionFilter() {
  document.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.filter = pill.dataset.filter;
      renderCookieGrid();
    });
  });
}

/* ----------------------------------------------------------
   CART
   ---------------------------------------------------------- */
function renderCart() {
  const itemsEl = document.getElementById('cart-items');
  const footerEl = document.getElementById('cart-footer');
  const countEl = document.getElementById('cart-count');
  const totalEl = document.getElementById('cart-total');
  const count = cartCount();

  /* Nav badge */
  if (count > 0) {
    countEl.textContent = count;
    countEl.classList.remove('hidden');
  } else {
    countEl.classList.add('hidden');
  }

  if (state.cart.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <p>Your cart is empty.<br>Add some cookies!</p>
      </div>`;
    footerEl.classList.add('hidden');
    return;
  }

  footerEl.classList.remove('hidden');
  totalEl.textContent = fmt(cartTotal());

  itemsEl.innerHTML = state.cart.map((item, i) => `
    <div class="cart-item">
      <div class="cart-item-emoji">${item.emoji}</div>
      <div class="cart-item-body">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-meta">Qty: ${item.qty}${item.topper ? ' · Topper: ' + item.topper : ''}${item.note ? ' · ' + item.note : ''}</div>
        <div class="cart-item-price">${fmt(item.lineTotal)}</div>
      </div>
      <button class="cart-remove" data-index="${i}" aria-label="Remove ${item.name}">✕</button>
    </div>`).join('');

  itemsEl.querySelectorAll('.cart-remove').forEach(btn => {
    btn.addEventListener('click', () => removeCartItem(parseInt(btn.dataset.index)));
  });
}

function removeCartItem(index) {
  const item = state.cart[index];
  state.ordered[item.cookieId] -= item.qty;
  state.cart.splice(index, 1);
  renderCart();
  renderCookieGrid();
  showToast('Item removed from cart');
}

function openCart() {
  state.cartOpen = true;
  document.getElementById('cart-panel').classList.add('open');
  document.getElementById('cart-overlay').classList.remove('hidden');
  document.getElementById('cart-overlay').setAttribute('aria-hidden', 'false');
}

function closeCart() {
  state.cartOpen = false;
  document.getElementById('cart-panel').classList.remove('open');
  document.getElementById('cart-overlay').classList.add('hidden');
  document.getElementById('cart-overlay').setAttribute('aria-hidden', 'true');
}

function initCart() {
  document.getElementById('cart-toggle').addEventListener('click', () => {
    state.cartOpen ? closeCart() : openCart();
  });
  document.getElementById('cart-close').addEventListener('click', closeCart);
  document.getElementById('cart-overlay').addEventListener('click', closeCart);
  document.getElementById('place-order-btn').addEventListener('click', placeOrder);
}

/* ----------------------------------------------------------
   MODAL
   ---------------------------------------------------------- */
function openModal(cookieId) {
  const cookie = COOKIES.find(c => c.id === cookieId);
  if (!cookie) return;
  state.activeModal = cookie;
  state.modalForm = { name: '', email: '', qty: 1, topper: '', note: '' };
  renderModal();
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('modal-overlay').setAttribute('aria-hidden', 'false');
  document.getElementById('modal-name').focus();
}

function closeModal() {
  state.activeModal = null;
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-overlay').setAttribute('aria-hidden', 'true');
}

function renderModal() {
  const c = state.activeModal;
  if (!c) return;

  const rem = remaining(c.id);
  const maxQty = Math.min(rem, 10);
  const topperPrice = TOPPER_OPTIONS.find(t => t.value === state.modalForm.topper)?.price || 0;
  const lineTotal = (c.price + topperPrice) * state.modalForm.qty;

  const topperOpts = TOPPER_OPTIONS.map(t =>
    `<option value="${t.value}"${state.modalForm.topper === t.value ? ' selected' : ''}>${t.label}</option>`
  ).join('');

  /* Also add the cookie's own recommended topper if not already in the list */
  const recAlreadyThere = TOPPER_OPTIONS.some(t => t.value === c.topper);
  const recOpt = !recAlreadyThere && c.topper
    ? `<option value="${c.topper}"${state.modalForm.topper === c.topper ? ' selected' : ''}>${c.topper} (recommended)</option>`
    : '';

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-header">
      <h2 id="modal-title">${c.emoji} ${c.name}</h2>
      <div class="modal-sub">${c.desc} · ${c.size} · ${fmt(c.price)} each</div>
    </div>

    <div class="form-group">
      <label for="modal-name">Your name</label>
      <input type="text" id="modal-name" placeholder="Full name" value="${state.modalForm.name}" autocomplete="name">
    </div>

    <div class="form-group">
      <label for="modal-email">Email address</label>
      <input type="email" id="modal-email" placeholder="you@email.com" value="${state.modalForm.email}" autocomplete="email">
    </div>

    <div class="form-group">
      <label>Quantity <span class="label-hint">(max ${maxQty})</span></label>
      <div class="qty-control">
        <button class="qty-btn" id="qty-minus" aria-label="Decrease quantity">−</button>
        <div class="qty-val" id="qty-display">${state.modalForm.qty}</div>
        <button class="qty-btn" id="qty-plus" aria-label="Increase quantity">+</button>
      </div>
    </div>

    <div class="form-group">
      <label for="modal-topper">Cookie topper</label>
      <select id="modal-topper">
        ${topperOpts}${recOpt}
      </select>
    </div>

    <div class="form-group">
      <label for="modal-note">Special note <span class="label-hint">(optional)</span></label>
      <textarea id="modal-note" placeholder="Any special requests, name to write, etc.">${state.modalForm.note}</textarea>
    </div>

    <div class="modal-total">
      <span>Subtotal</span>
      <span id="modal-total-display">${fmt(lineTotal)}</span>
    </div>

    <div class="modal-actions">
      <button class="btn-cancel" id="modal-cancel">Cancel</button>
      <button class="btn-confirm" id="modal-confirm">Add to cart 🛒</button>
    </div>`;

  /* Bind modal events */
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-close').addEventListener('click', closeModal);

  document.getElementById('modal-name').addEventListener('input', e => {
    state.modalForm.name = e.target.value;
  });
  document.getElementById('modal-email').addEventListener('input', e => {
    state.modalForm.email = e.target.value;
  });
  document.getElementById('modal-note').addEventListener('input', e => {
    state.modalForm.note = e.target.value;
  });

  document.getElementById('modal-topper').addEventListener('change', e => {
    state.modalForm.topper = e.target.value;
    updateModalTotal();
  });

  document.getElementById('qty-minus').addEventListener('click', () => changeQty(-1));
  document.getElementById('qty-plus').addEventListener('click', () => changeQty(1));
  document.getElementById('modal-confirm').addEventListener('click', addToCart);
}

function updateModalTotal() {
  const c = state.activeModal;
  if (!c) return;
  const topperPrice = TOPPER_OPTIONS.find(t => t.value === state.modalForm.topper)?.price || 0;
  const lineTotal = (c.price + topperPrice) * state.modalForm.qty;
  const el = document.getElementById('modal-total-display');
  if (el) el.textContent = fmt(lineTotal);
}

function changeQty(delta) {
  const c = state.activeModal;
  if (!c) return;
  const rem = remaining(c.id);
  const maxQty = Math.min(rem, 10);
  state.modalForm.qty = Math.max(1, Math.min(maxQty, state.modalForm.qty + delta));
  const display = document.getElementById('qty-display');
  if (display) display.textContent = state.modalForm.qty;
  updateModalTotal();
}

function addToCart() {
  const c = state.activeModal;
  const { name, email, qty, topper, note } = state.modalForm;

  if (!name.trim()) { showToast('Please enter your name'); document.getElementById('modal-name').focus(); return; }
  if (!email.trim() || !email.includes('@')) { showToast('Please enter a valid email'); document.getElementById('modal-email').focus(); return; }

  const topperPrice = TOPPER_OPTIONS.find(t => t.value === topper)?.price || 0;
  const lineTotal = (c.price + topperPrice) * qty;

  state.cart.push({
    cookieId: c.id,
    name: c.name,
    emoji: c.emoji,
    price: c.price + topperPrice,
    qty,
    topper,
    note,
    customerName: name,
    customerEmail: email,
    lineTotal
  });

  state.ordered[c.id] += qty;
  closeModal();
  renderCart();
  renderCookieGrid();
  showToast(`${c.name} added to cart! 🍪`);
  openCart();
}

function initModal() {
  /* Close on overlay click */
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  /* Close on Escape */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (state.activeModal) closeModal();
      else if (state.cartOpen) closeCart();
    }
  });
}

/* ----------------------------------------------------------
   ORDER PLACEMENT & SUCCESS SCREEN
   ---------------------------------------------------------- */
function placeOrder() {
  if (state.cart.length === 0) return;

  const customerName = state.cart[0].customerName || 'Friend';
  const customerEmail = state.cart[0].customerEmail || '';
  const total = cartTotal();
  const items = [...state.cart];

  state.orderSuccess = { customerName, customerEmail, total, items };
  state.cart = [];
  closeCart();

  renderCart();
  renderCookieGrid();
  renderSuccessScreen();

  document.getElementById('success-screen').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  /* Log order to Google Sheets (silent — never blocks the UI) */
  submitOrderToSheets({ customerName, customerEmail, total, items });
}

function submitOrderToSheets({ customerName, customerEmail, total, items }) {
  if (!SHEETS_WEBHOOK_URL) return; /* not configured yet — skip silently */

  const orderDate = new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  });

  const itemsSummary = items
    .map(i => `${i.name} x${i.qty}${i.topper ? ' (+' + i.topper + ')' : ''}`)
    .join(', ');

  const payload = {
    date:     orderDate,
    name:     customerName,
    email:    customerEmail,
    items:    itemsSummary,
    total:    total.toFixed(2),
    paid:     'No',      /* you'll mark this Yes in the sheet once payment arrives */
    notes:    items.map(i => i.note).filter(Boolean).join('; ')
  };

  /* Use no-cors — we don't need a response, just fire and forget */
  fetch(SHEETS_WEBHOOK_URL, {
    method:  'POST',
    mode:    'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  }).catch(() => {
    /* Fail silently — a logging hiccup should never affect the buyer's experience */
  });
}

function renderSuccessScreen() {
  const { customerName, total, items } = state.orderSuccess;

  document.getElementById('success-message').innerHTML =
    `Thank you, <strong>${customerName}</strong>! Your order has been placed. Please complete your payment below to confirm — include your name in the payment note.`;

  document.getElementById('success-payment-note').innerHTML =
    `Send <strong>${fmt(total)}</strong> and include your name <strong>"${customerName}"</strong> in the note.`;

  /* Order summary rows */
  const rows = items.map(item =>
    `<div class="success-row"><span>${item.emoji} ${item.name} ×${item.qty}</span><span>${fmt(item.lineTotal)}</span></div>`
  ).join('');
  document.getElementById('success-summary').innerHTML = `
    <div class="success-detail-title">Order Summary</div>
    ${rows}
    <div class="success-row"><span>Total</span><span>${fmt(total)}</span></div>`;

  /* Payment grid */
  document.getElementById('success-payment-grid').innerHTML = `
    <div class="pay-card">
      <div class="pay-icon">💚</div>
      <div class="pay-name">Cashapp</div>
      <div class="pay-handle">${PAYMENT_CONFIG.cashapp.handle}</div>
      <a href="${PAYMENT_CONFIG.cashapp.link}" target="_blank" rel="noopener" class="pay-link">Pay ${fmt(total)}</a>
    </div>
    <div class="pay-card">
      <div class="pay-icon">💙</div>
      <div class="pay-name">Venmo</div>
      <div class="pay-handle">${PAYMENT_CONFIG.venmo.handle}</div>
      <a href="${PAYMENT_CONFIG.venmo.link}" target="_blank" rel="noopener" class="pay-link">Pay ${fmt(total)}</a>
    </div>
    <div class="pay-card">
      <div class="pay-icon">💜</div>
      <div class="pay-name">Zelle</div>
      <div class="pay-handle">Ask for number</div>
      <span class="pay-note">Message us to arrange</span>
    </div>
    <div class="pay-card">
      <div class="pay-icon">💰</div>
      <div class="pay-name">Check / Cash</div>
      <div class="pay-handle">Email to confirm</div>
      <a href="mailto:${PAYMENT_CONFIG.email}?subject=Cookie Order Payment - ${customerName}&body=Hi! I placed an order for ${fmt(total)}. My name is ${customerName}." class="pay-link">Email us</a>
    </div>`;

  document.getElementById('back-to-cookies').addEventListener('click', () => {
    state.orderSuccess = null;
    document.getElementById('success-screen').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ----------------------------------------------------------
   ADMIN PANEL
   ---------------------------------------------------------- */
function renderAdminGrid() {
  const grid = document.getElementById('admin-grid');
  grid.innerHTML = COOKIES.map(c => `
    <div class="admin-item">
      <div class="admin-item-name">${c.emoji} ${c.name}</div>
      <div class="admin-item-orders">Ordered: ${state.ordered[c.id]} / ${state.inventory[c.id]}</div>
      <div class="admin-stock-row">
        <input type="number" id="inv-${c.id}" min="0" value="${state.inventory[c.id]}" aria-label="Max orders for ${c.name}">
        <span>max orders</span>
      </div>
      <button class="admin-save" data-id="${c.id}">Save</button>
    </div>`).join('');

  grid.querySelectorAll('.admin-save').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      const val = parseInt(document.getElementById(`inv-${id}`).value);
      if (!isNaN(val) && val >= 0) {
        state.inventory[id] = val;
        renderCookieGrid();
        renderAdminGrid();
        showToast('Inventory updated ✓');
      }
    });
  });
}

function initAdmin() {
  const toggle = document.getElementById('admin-toggle');
  const panel  = document.getElementById('admin-panel');
  const close  = document.getElementById('admin-close');

  toggle.addEventListener('click', () => {
    state.adminOpen = !state.adminOpen;
    panel.classList.toggle('hidden', !state.adminOpen);
    toggle.textContent = state.adminOpen ? '✕ Close' : '⚙ Inventory';
    if (state.adminOpen) {
      renderAdminGrid();
      panel.scrollIntoView({ behavior: 'smooth' });
    }
  });

  close.addEventListener('click', () => {
    state.adminOpen = false;
    panel.classList.add('hidden');
    toggle.textContent = '⚙ Inventory';
  });
}

/* ----------------------------------------------------------
   BOOT
   ---------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initPaymentHandles();
  initOccasionFilter();
  renderCookieGrid();
  initCart();
  renderCart();
  initModal();
  initAdmin();
});
