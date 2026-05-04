/* ============================================================
   COOKIE FUNDRAISER — app.js
   ============================================================ */

/* ----------------------------------------------------------
   CONFIGURE ME: Google Sheets webhook URL
   ---------------------------------------------------------- */
const SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyDgpairdfEc0x4T4RWFHvkAE_mPiimbooz2RFkMEHsu9_VDOjChHR-YWXMw-fJBOZt/exec';

/* ----------------------------------------------------------
   INVENTORY — shared counter across all cookie types
   Max 125 "slots". Cookie Flower = 2 slots, everything else = 1.
   ---------------------------------------------------------- */
const MAX_INVENTORY = 125;
let slotsUsed = 0;

function slotsRemaining() { return MAX_INVENTORY - slotsUsed; }
function isSoldOut()       { return slotsRemaining() <= 0; }

/* ----------------------------------------------------------
   HERO IMAGE STRIPS — all cookie photos for cycling
   ---------------------------------------------------------- */
const HERO_IMAGES = [
  'images/heart_yellow_teacher.jpg',
  'images/heart_choc_teacher.jpg',
  'images/heart_yellow_moms.jpg',
  'images/heart_choc_moms.jpg',
  'images/rounds_plain_teacher.jpg',
  'images/rounds_plain_moms.jpg',
  'images/rounds_mm_teacher.jpg',
  'images/rounds_choc_teacher.jpg',
  'images/rounds_choc_moms.jpg',
  'images/rounds_yellow_moms.jpg',
  'images/flower_plain.jpg',
  'images/flower_teacher.jpg',
  'images/flower_moms.jpg',
  'images/heart_choc_plain.jpg',
];

/* ----------------------------------------------------------
   COOKIE PRODUCTS
   slots: how many inventory slots each unit costs
   ---------------------------------------------------------- */
const PRODUCTS = [
  /* ---- TEACHER APPRECIATION ---- */
  {
    id: 'ta-heart',
    name: '6" Heart Cookie',
    section: 'Teacher Appreciation',
    desc: 'A gorgeous 6-inch heart-shaped chocolate chip cookie — perfect for gifting.',
    imageSrc: 'images/heart_yellow_teacher.jpg',
    price: 15,
    slots: 1,
  },
  {
    id: 'ta-rounds',
    name: '3 Round Cookies (3.5")',
    section: 'Teacher Appreciation',
    desc: 'A set of three 3.5-inch round chocolate chip cookies, individually baked.',
    imageSrc: 'images/rounds_plain_teacher.jpg',
    price: 15,
    slots: 1,
  },
  {
    id: 'ta-flower',
    name: 'Cookie Flower',
    section: 'Teacher Appreciation',
    desc: 'Six 3.5-inch rounds arranged as a stunning cookie bouquet — a showstopper gift.',
    imageSrc: 'images/flower_teacher.jpg',
    price: 30,
    slots: 2,
  },
  /* ---- MOTHER'S DAY ---- */
  {
    id: 'md-heart',
    name: '6" Heart Cookie',
    section: "Mother's Day",
    desc: 'A gorgeous 6-inch heart-shaped chocolate chip cookie — perfect for Mom.',
    imageSrc: 'images/heart_yellow_moms.jpg',
    price: 15,
    slots: 1,
  },
  {
    id: 'md-rounds',
    name: '3 Round Cookies (3.5")',
    section: "Mother's Day",
    desc: 'A set of three 3.5-inch round chocolate chip cookies, individually baked.',
    imageSrc: 'images/rounds_plain_moms.jpg',
    price: 15,
    slots: 1,
  },
  {
    id: 'md-flower',
    name: 'Cookie Flower',
    section: "Mother's Day",
    desc: 'Six 3.5-inch rounds arranged as a stunning cookie bouquet — the ultimate Mom gift.',
    imageSrc: 'images/flower_moms.jpg',
    price: 30,
    slots: 2,
  },
];

/* ----------------------------------------------------------
   APPLICATION STATE
   ---------------------------------------------------------- */
let state = {
  filter: 'All',
  cart: [],
  cartOpen: false,
  activeModal: null,
  modalForm: {
    name: '', email: '',
    qty: 1,
    topper: 'yes',
    border: 'none',
    mms: 'none',
    note: ''
  },
  orderSuccess: null,
};

/* ----------------------------------------------------------
   HELPERS
   ---------------------------------------------------------- */
function fmt(n) { return '$' + n.toFixed(2); }

function cartTotal()  { return state.cart.reduce((s, i) => s + i.lineTotal, 0); }
function cartCount()  { return state.cart.reduce((s, i) => s + i.qty, 0); }
function cartSlots()  { return state.cart.reduce((s, i) => s + (i.slots * i.qty), 0); }

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2800);
}

function topperLabel(section) {
  return section === "Mother's Day" ? 'Happy Mother\'s Day Topper' : 'Best Teacher Ever Topper';
}

/* ----------------------------------------------------------
   HERO IMAGE STRIPS
   ---------------------------------------------------------- */
function initHeroStrips() {
  const track = document.getElementById('hero-bg-track');
  if (!track) return;

  /* Shuffle images for variety */
  const imgs = [...HERO_IMAGES].sort(() => Math.random() - 0.5);

  /* Build a long row of images — duplicate for seamless loop */
  const all = [...imgs, ...imgs, ...imgs];
  track.innerHTML = all.map(src =>
    `<img src="${src}" alt="" loading="lazy" onerror="this.style.display='none'">`
  ).join('');

  /* Wait for images to load so we know the track width */
  let startTime = null;
  let trackWidth = 0;

  function getTrackWidth() {
    return track.scrollWidth / 3; /* one full set width */
  }

  /* Smooth pan: moves left at a steady pace, resets seamlessly */
  const SPEED = 40; /* px per second */

  function animate(ts) {
    if (!startTime) {
      startTime = ts;
      trackWidth = getTrackWidth();
    }
    const elapsed = ts - startTime;
    const offset  = (elapsed / 1000 * SPEED) % trackWidth;
    track.style.transform = `translateX(-${offset}px)`;
    requestAnimationFrame(animate);
  }

  /* Start once first image loads */
  const firstImg = track.querySelector('img');
  if (firstImg && firstImg.complete) {
    requestAnimationFrame(animate);
  } else if (firstImg) {
    firstImg.addEventListener('load', () => requestAnimationFrame(animate));
  }
}

/* ----------------------------------------------------------
   INVENTORY BANNER
   ---------------------------------------------------------- */
function updateInventoryBanner() {
  const rem = slotsRemaining();
  const el  = document.getElementById('inventory-text');
  const banner = document.getElementById('inventory-banner');
  if (!el) return;

  if (rem <= 0) {
    el.textContent = '⚠️ We\'ve reached our order limit for this fundraiser. Thank you for your support!';
    banner.classList.remove('hidden');
    banner.classList.add('sold-out-banner');
  } else if (rem <= 20) {
    el.textContent = `🔥 Only ${rem} order${rem === 1 ? '' : 's'} left!`;
    banner.classList.remove('hidden', 'sold-out-banner');
    banner.classList.add('low-banner');
  } else {
    banner.classList.add('hidden');
    banner.classList.remove('sold-out-banner', 'low-banner');
  }
}

/* ----------------------------------------------------------
   COOKIE GRID
   ---------------------------------------------------------- */
function renderCookieGrid() {
  const grid    = document.getElementById('cookie-grid');
  const heading = document.getElementById('grid-heading');
  const sub     = document.getElementById('grid-sub');

  /* Graduation coming soon */
  if (state.filter === 'Graduation') {
    heading.textContent = 'Graduation';
    sub.textContent = '';
    grid.innerHTML = `
      <div class="coming-soon-card">
        <div class="coming-soon-icon">🎓</div>
        <h3>Coming Soon!</h3>
        <p>Graduation cookies are on their way. Check back shortly — we'll have special options available for your grad!</p>
      </div>`;
    return;
  }

  const filtered = state.filter === 'All'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.section === state.filter);

  heading.textContent = state.filter === 'All'
    ? 'All Cookies'
    : state.filter === "Mother's Day"
      ? "Mother's Day 2026"
      : 'Teacher Appreciation Week';

  sub.textContent = 'Made from scratch · Packaged in bakery boxes · Local pickup';

  const totalSoldOut = isSoldOut();

  grid.innerHTML = filtered.map(p => {
    const slotsNeeded = p.slots;
    const canOrder    = !totalSoldOut && slotsRemaining() >= slotsNeeded;
    const slotLabel   = p.slots === 2 ? '(counts as 2 slots)' : '';

    return `
      <article class="cookie-card">
        <div class="cookie-img-wrap">
          <img class="cookie-img" src="${p.imageSrc}" alt="${p.name}"
               loading="lazy" onerror="this.src=''; this.parentElement.classList.add('img-fallback')">
          <div class="cookie-img-fallback-emoji">🍪</div>
        </div>
        <div class="cookie-info">
          <div class="cookie-occasion">${p.section}</div>
          <div class="cookie-name">${p.name}</div>
          <div class="cookie-desc">${p.desc}</div>
          <div class="cookie-footer">
            <div>
              <div class="cookie-price">${fmt(p.price)}</div>
              <div class="cookie-stock"></div>
            </div>
            ${canOrder
              ? `<button class="add-btn" data-id="${p.id}">+ Add</button>`
              : `<button class="sold-out-btn" disabled>Sold out</button>`
            }
          </div>
        </div>
      </article>`;
  }).join('');

  grid.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.id));
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
  const itemsEl  = document.getElementById('cart-items');
  const footerEl = document.getElementById('cart-footer');
  const countEl  = document.getElementById('cart-count');
  const totalEl  = document.getElementById('cart-total');
  const count    = cartCount();

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

  itemsEl.innerHTML = state.cart.map((item, i) => {
    const opts = [
      item.topper === 'yes' ? topperLabel(item.section) : null,
      item.border !== 'none' ? item.border.charAt(0).toUpperCase() + item.border.slice(1) + ' border' : null,
      item.mms === 'add' ? 'M&Ms' : null,
    ].filter(Boolean).join(', ');

    return `
      <div class="cart-item">
        <div class="cart-item-emoji">🍪</div>
        <div class="cart-item-body">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-meta">${item.section} · Qty: ${item.qty}${opts ? ' · ' + opts : ''}</div>
          <div class="cart-item-price">${fmt(item.lineTotal)}</div>
        </div>
        <button class="cart-remove" data-index="${i}" aria-label="Remove ${item.name}">✕</button>
      </div>`;
  }).join('');

  itemsEl.querySelectorAll('.cart-remove').forEach(btn => {
    btn.addEventListener('click', () => removeCartItem(parseInt(btn.dataset.index)));
  });
}

function removeCartItem(index) {
  const item = state.cart[index];
  slotsUsed -= item.slots * item.qty;
  state.cart.splice(index, 1);
  renderCart();
  renderCookieGrid();
  updateInventoryBanner();
  showToast('Item removed from cart');
}

function openCart() {
  state.cartOpen = true;
  document.getElementById('cart-panel').classList.add('open');
  document.getElementById('cart-overlay').classList.remove('hidden');
}

function closeCart() {
  state.cartOpen = false;
  document.getElementById('cart-panel').classList.remove('open');
  document.getElementById('cart-overlay').classList.add('hidden');
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
function openModal(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  state.activeModal = product;
  state.modalForm   = { name: '', email: '', qty: 1, topper: 'yes', border: 'none', mms: 'none', note: '' };
  renderModal();
  document.getElementById('modal-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('modal-name') && document.getElementById('modal-name').focus(), 50);
}

function closeModal() {
  state.activeModal = null;
  document.getElementById('modal-overlay').classList.add('hidden');
}

function renderModal() {
  const p   = state.activeModal;
  if (!p) return;
  const rem     = slotsRemaining();
  const maxQty  = Math.max(1, Math.min(10, Math.floor(rem / p.slots)));
  const total   = p.price * state.modalForm.qty;
  const tLabel  = topperLabel(p.section);

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-header">
      <h2 id="modal-title">🍪 ${p.name}</h2>
      <div class="modal-sub">${p.section} · ${fmt(p.price)} each</div>
    </div>

    <div class="modal-img-wrap">
      <img src="${p.imageSrc}" alt="${p.name}" onerror="this.style.display='none'">
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
        <button class="qty-btn" id="qty-minus" aria-label="Decrease">−</button>
        <div class="qty-val" id="qty-display">${state.modalForm.qty}</div>
        <button class="qty-btn" id="qty-plus" aria-label="Increase">+</button>
      </div>
    </div>

    <div class="form-group">
      <label>${tLabel}</label>
      <div class="option-row">
        <label class="opt-label"><input type="radio" name="topper" value="yes" ${state.modalForm.topper === 'yes' ? 'checked' : ''}> Yes</label>
        <label class="opt-label"><input type="radio" name="topper" value="no"  ${state.modalForm.topper === 'no'  ? 'checked' : ''}> No</label>
      </div>
    </div>

    <div class="form-group">
      <label>Frosting Border</label>
      <div class="option-row">
        <label class="opt-label"><input type="radio" name="border" value="none"      ${state.modalForm.border === 'none'      ? 'checked' : ''}> None</label>
        <label class="opt-label"><input type="radio" name="border" value="yellow"    ${state.modalForm.border === 'yellow'    ? 'checked' : ''}> Yellow</label>
        <label class="opt-label"><input type="radio" name="border" value="chocolate" ${state.modalForm.border === 'chocolate' ? 'checked' : ''}> Chocolate</label>
      </div>
    </div>

    <div class="form-group">
      <label>M&amp;Ms</label>
      <div class="option-row">
        <label class="opt-label"><input type="radio" name="mms" value="none" ${state.modalForm.mms === 'none' ? 'checked' : ''}> None</label>
        <label class="opt-label"><input type="radio" name="mms" value="add"  ${state.modalForm.mms === 'add'  ? 'checked' : ''}> Add M&amp;Ms</label>
      </div>
    </div>

    <div class="form-group">
      <label for="modal-note">Special note <span class="label-hint">(optional)</span></label>
      <textarea id="modal-note" placeholder="Any special requests...">${state.modalForm.note}</textarea>
    </div>

    <div class="modal-total">
      <span>Subtotal</span>
      <span id="modal-total-display">${fmt(total)}</span>
    </div>
    <div class="modal-actions">
      <button class="btn-cancel" id="modal-cancel">Cancel</button>
      <button class="btn-confirm" id="modal-confirm">Add to cart 🛒</button>
    </div>`;

  /* Bind events */
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-name').addEventListener('input',  e => { state.modalForm.name  = e.target.value; });
  document.getElementById('modal-email').addEventListener('input', e => { state.modalForm.email = e.target.value; });
  document.getElementById('modal-note').addEventListener('input',  e => { state.modalForm.note  = e.target.value; });
  document.getElementById('qty-minus').addEventListener('click', () => changeQty(-1));
  document.getElementById('qty-plus').addEventListener('click',  () => changeQty(1));

  document.querySelectorAll('input[name="topper"]').forEach(r =>
    r.addEventListener('change', e => { state.modalForm.topper = e.target.value; updateModalTotal(); }));
  document.querySelectorAll('input[name="border"]').forEach(r =>
    r.addEventListener('change', e => { state.modalForm.border = e.target.value; updateModalTotal(); }));
  document.querySelectorAll('input[name="mms"]').forEach(r =>
    r.addEventListener('change', e => { state.modalForm.mms = e.target.value; updateModalTotal(); }));

  document.getElementById('modal-confirm').addEventListener('click', addToCart);
}

function updateModalTotal() {
  const p = state.activeModal;
  if (!p) return;
  const el = document.getElementById('modal-total-display');
  if (el) el.textContent = fmt(p.price * state.modalForm.qty);
}

function changeQty(delta) {
  const p = state.activeModal;
  if (!p) return;
  const rem    = slotsRemaining();
  const maxQty = Math.max(1, Math.min(10, Math.floor(rem / p.slots)));
  state.modalForm.qty = Math.max(1, Math.min(maxQty, state.modalForm.qty + delta));
  const d = document.getElementById('qty-display');
  if (d) d.textContent = state.modalForm.qty;
  updateModalTotal();
}

function addToCart() {
  const p = state.activeModal;
  const { name, email, qty, topper, border, mms, note } = state.modalForm;

  if (!name.trim())  { showToast('Please enter your name');  document.getElementById('modal-name').focus();  return; }
  if (!email.trim() || !email.includes('@')) { showToast('Please enter a valid email'); document.getElementById('modal-email').focus(); return; }

  const slotsNeeded = p.slots * qty;
  if (slotsNeeded > slotsRemaining()) {
    showToast('Not enough slots remaining — reduce quantity'); return;
  }

  slotsUsed += slotsNeeded;

  state.cart.push({
    productId: p.id,
    name:      p.name,
    section:   p.section,
    price:     p.price,
    slots:     p.slots,
    qty,
    topper,
    border,
    mms,
    note,
    customerName:  name,
    customerEmail: email,
    lineTotal: p.price * qty,
  });

  closeModal();
  renderCart();
  renderCookieGrid();
  updateInventoryBanner();
  showToast(`${p.name} added to cart! 🍪`);
  openCart();
}

function initModal() {
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (state.activeModal) closeModal();
      else if (state.cartOpen) closeCart();
    }
  });
}

/* ----------------------------------------------------------
   ORDER PLACEMENT & SUCCESS
   ---------------------------------------------------------- */
function placeOrder() {
  if (state.cart.length === 0) return;

  const customerName  = state.cart[0].customerName  || 'Friend';
  const customerEmail = state.cart[0].customerEmail || '';
  const total = cartTotal();
  const items = [...state.cart];

  state.orderSuccess = { customerName, customerEmail, total, items };
  state.cart = [];
  closeCart();
  renderCart();
  renderCookieGrid();
  updateInventoryBanner();
  renderSuccessScreen();
  document.getElementById('success-screen').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  submitOrderToSheets({ customerName, customerEmail, total, items });
}

function renderSuccessScreen() {
  const { customerName, total, items } = state.orderSuccess;

  document.getElementById('success-message').innerHTML =
    `Thank you, <strong>${customerName}</strong>! Your order has been placed. Please complete your payment below to confirm — include your name in the payment note.`;

  document.getElementById('success-payment-note').innerHTML =
    `Send <strong>${fmt(total)}</strong> and include your name <strong>"${customerName}"</strong> in the note.`;

  const rows = items.map(item => {
    const opts = [
      item.topper === 'yes' ? topperLabel(item.section) : null,
      item.border !== 'none' ? item.border + ' border' : null,
      item.mms === 'add' ? 'M&Ms' : null,
    ].filter(Boolean).join(', ');
    return `<div class="success-row">
      <span>🍪 ${item.name} ×${item.qty}${opts ? '<br><small style="color:#7A4522">' + opts + '</small>' : ''}</span>
      <span>${fmt(item.lineTotal)}</span>
    </div>`;
  }).join('');

  document.getElementById('success-summary').innerHTML = `
    <div class="success-detail-title">Order Summary</div>
    ${rows}
    <div class="success-row"><span>Total</span><span>${fmt(total)}</span></div>`;

  document.getElementById('success-payment-grid').innerHTML = `
    <div class="pay-card">
      <div class="pay-icon">💚</div>
      <div class="pay-name">Cashapp</div>
      <div class="pay-handle">$stephreyn89</div>
      <a href="https://cash.app/$stephreyn89" target="_blank" rel="noopener" class="pay-link">Pay ${fmt(total)}</a>
    </div>
    <div class="pay-card">
      <div class="pay-icon">💙</div>
      <div class="pay-name">Venmo</div>
      <div class="pay-handle">@smreynolds11</div>
      <a href="https://venmo.com/smreynolds11" target="_blank" rel="noopener" class="pay-link">Pay ${fmt(total)}</a>
    </div>
    <div class="pay-card">
      <div class="pay-icon">💰</div>
      <div class="pay-name">Check / Cash</div>
      <div class="pay-handle">Email to arrange</div>
      <a href="mailto:sharonscookiessupreme@gmail.com?subject=Cookie Order - ${encodeURIComponent(customerName)}&body=Hi! I placed an order for ${fmt(total)}. My name is ${encodeURIComponent(customerName)}." class="pay-link">Email us</a>
    </div>`;

  document.getElementById('back-to-cookies').addEventListener('click', () => {
    state.orderSuccess = null;
    document.getElementById('success-screen').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ----------------------------------------------------------
   GOOGLE SHEETS SUBMISSION
   ---------------------------------------------------------- */
function submitOrderToSheets({ customerName, customerEmail, total, items }) {
  if (!SHEETS_WEBHOOK_URL) return;

  const orderDate = new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  });

  const itemsSummary = items.map(i => {
    const opts = [
      i.topper === 'yes' ? topperLabel(i.section) : null,
      i.border !== 'none' ? i.border + ' border' : null,
      i.mms === 'add' ? 'M&Ms' : null,
    ].filter(Boolean).join('+');
    return `${i.name} x${i.qty}${opts ? ' (' + opts + ')' : ''}`;
  }).join(', ');

  const params = new URLSearchParams({
    date:  orderDate,
    name:  customerName,
    email: customerEmail,
    items: itemsSummary,
    total: total.toFixed(2),
    paid:  'No',
    notes: items.map(i => i.note).filter(Boolean).join('; ')
  });

  fetch(`${SHEETS_WEBHOOK_URL}?${params.toString()}`, {
    method: 'GET',
    mode:   'no-cors'
  }).catch(() => { /* fail silently */ });
}

/* ----------------------------------------------------------
   BOOT
   ---------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initHeroStrips();
  initOccasionFilter();
  renderCookieGrid();
  updateInventoryBanner();
  initCart();
  renderCart();
  initModal();
});
