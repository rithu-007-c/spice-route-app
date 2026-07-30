/* SpiceRoute – Restaurant Management App */
const API = '';
let state = {
  token: localStorage.getItem('sr_token') || null,
  user: JSON.parse(localStorage.getItem('sr_user') || 'null'),
  selectedRole: null,
  cart: [],
  foods: [],
  tables: [],
  orders: [],
  stats: {},
  staff: [],
  feedbacks: [],
  increments: [],
  attendance: [],
  currentPanel: 'dashboard',
  feedbackRatings: { food: 0, service: 0 },
  qrScanned: false,
};

// ---------- Helpers ----------
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  setTimeout(() => el.classList.add('hidden'), 3500);
}

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  const res = await fetch(API + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function money(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

function stars(n) {
  return '⭐'.repeat(n) + '☆'.repeat(5 - n);
}

function roleChipClass(role) {
  return { server: 'chip-server', chef: 'chip-chef', manager: 'chip-manager', management: 'chip-management' }[role] || '';
}

// ---------- QR Scan Logic ----------
const ROLE_ICONS = { server: '🛎️', chef: '👨‍🍳', manager: '📋', management: '🏢', customer: '👤' };
const ROLE_LABELS = { server: 'Server', chef: 'Chef', manager: 'Manager', management: 'Management', customer: 'Customer' };

const DEMO_HINTS = {
  customer: 'Sign up with any mobile number, or use an existing account.',
  server: 'Any mobile number + password: server123',
  chef: 'Any mobile number + password: chef123',
  manager: 'Any mobile number + password: manager123',
  management: 'Any mobile number + password: mgmt123',
};

function showQRScan(role) {
  const roleGrid = document.getElementById('role-grid');
  const qrWrap = document.getElementById('qr-scan-wrap');
  const authWrap = document.getElementById('auth-form-wrap');
  const badge = document.getElementById('qr-role-badge');
  const scanLine = document.getElementById('qr-scanner-line');
  const dot = qrWrap.querySelector('.qr-dot');
  const statusText = document.getElementById('qr-status-text');

  // Reset QR state
  scanLine.classList.remove('scanning');
  dot.className = 'qr-dot';
  statusText.textContent = 'Ready to scan…';
  document.getElementById('qr-scan-btn').disabled = false;
  document.getElementById('qr-scan-btn').textContent = '📷 Scan QR Code';
  state.qrScanned = false;

  badge.textContent = `${ROLE_ICONS[role]} ${ROLE_LABELS[role]}`;
  roleGrid.classList.add('hidden');
  qrWrap.classList.remove('hidden');
  authWrap.classList.add('hidden');
}

function showAuthForm(role) {
  const qrWrap = document.getElementById('qr-scan-wrap');
  const authWrap = document.getElementById('auth-form-wrap');
  const authTitle = document.getElementById('auth-title');
  const demoHint = document.getElementById('demo-hint');
  const signupTab = document.getElementById('signup-tab');

  qrWrap.classList.add('hidden');
  authWrap.classList.remove('hidden');
  authTitle.textContent = `Sign in as ${ROLE_LABELS[role]}`;
  demoHint.textContent = DEMO_HINTS[role] || '';

  if (role === 'customer') {
    signupTab.classList.remove('hidden');
  } else {
    signupTab.classList.add('hidden');
    switchTab('login');
  }
}

// Role card click
document.getElementById('role-grid').addEventListener('click', (e) => {
  const card = e.target.closest('.role-card');
  if (!card) return;
  const role = card.dataset.role;
  state.selectedRole = role;
  document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');

  if (role === 'customer') {
    // Customers skip QR and go straight to auth
    document.getElementById('role-grid').classList.add('hidden');
    showAuthForm(role);
  } else {
    // Staff: QR scan first
    showQRScan(role);
  }
});

// QR scan button
document.getElementById('qr-scan-btn').addEventListener('click', () => {
  if (state.qrScanned) return;
  const scanLine = document.getElementById('qr-scanner-line');
  const dot = document.querySelector('#qr-scan-wrap .qr-dot');
  const statusText = document.getElementById('qr-status-text');
  const btn = document.getElementById('qr-scan-btn');

  // Start scanning animation
  btn.disabled = true;
  btn.textContent = '⏳ Scanning…';
  scanLine.classList.add('scanning');
  dot.className = 'qr-dot scanning';
  statusText.textContent = 'Scanning QR code…';

  setTimeout(() => {
    scanLine.classList.remove('scanning');
    dot.className = 'qr-dot success';
    statusText.textContent = '✅ QR verified – Proceed to login';
    btn.textContent = '✅ Scan Successful – Continue';
    btn.disabled = false;
    state.qrScanned = true;
    toast('QR Code verified successfully!');

    setTimeout(() => {
      showAuthForm(state.selectedRole);
    }, 800);
  }, 2200);
});

// Back from QR to role grid
document.getElementById('back-from-qr').addEventListener('click', () => {
  document.getElementById('qr-scan-wrap').classList.add('hidden');
  document.getElementById('role-grid').classList.remove('hidden');
  state.selectedRole = null;
  state.qrScanned = false;
});

// Back from auth form to role grid (or QR for staff)
document.getElementById('back-to-roles').addEventListener('click', () => {
  document.getElementById('auth-form-wrap').classList.add('hidden');
  if (state.selectedRole && state.selectedRole !== 'customer') {
    showQRScan(state.selectedRole);
  } else {
    document.getElementById('role-grid').classList.remove('hidden');
    state.selectedRole = null;
  }
});

// Tab switching
document.querySelectorAll('.tab').forEach(t => {
  t.onclick = () => switchTab(t.dataset.tab);
});

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.signup-only').forEach(el => {
    el.classList.toggle('hidden', tab !== 'signup');
  });
  document.getElementById('auth-submit').textContent = tab === 'signup' ? 'Create Account' : 'Sign In';
  document.getElementById('auth-form').dataset.mode = tab;
}

// Auth form submit
document.getElementById('auth-form').onsubmit = async (e) => {
  e.preventDefault();
  const mode = e.target.dataset.mode || 'login';
  const phone = document.getElementById('auth-phone').value.trim();
  const password = document.getElementById('auth-password').value;
  const name = document.getElementById('auth-name').value.trim();
  try {
    let data;
    if (mode === 'signup') {
      data = await api('/api/signup', {
        method: 'POST',
        body: JSON.stringify({ name, phone, password, role: state.selectedRole }),
      });
    } else {
      data = await api('/api/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password, role: state.selectedRole }),
      });
    }
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('sr_token', state.token);
    localStorage.setItem('sr_user', JSON.stringify(state.user));
    toast(`Welcome, ${data.user.name}!`);
    enterApp();
  } catch (err) {
    toast(err.message, 'error');
  }
};

// Logout
document.getElementById('logout-btn').onclick = () => {
  state.token = null;
  state.user = null;
  state.cart = [];
  state.qrScanned = false;
  localStorage.removeItem('sr_token');
  localStorage.removeItem('sr_user');
  document.getElementById('app-view').classList.remove('active');
  document.getElementById('auth-view').classList.add('active');
  document.getElementById('role-grid').classList.remove('hidden');
  document.getElementById('auth-form-wrap').classList.add('hidden');
  document.getElementById('qr-scan-wrap').classList.add('hidden');
  state.selectedRole = null;
};

// ---------- App Shell ----------
function enterApp() {
  document.getElementById('auth-view').classList.remove('active');
  document.getElementById('app-view').classList.add('active');
  document.getElementById('role-badge').textContent = state.user.role;
  document.getElementById('user-name').textContent = state.user.name;
  buildSidebar();
  loadPanel('dashboard');
}

function buildSidebar() {
  const role = state.user.role;
  const items = {
    customer: [
      { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
      { id: 'menu', icon: '🍲', label: 'Order Food' },
      { id: 'myorders', icon: '📦', label: 'My Orders' },
      { id: 'tables', icon: '🪑', label: 'Tables & Book' },
    ],
    server: [
      { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
      { id: 'orders', icon: '📋', label: 'All Orders' },
      { id: 'tables', icon: '🪑', label: 'Tables' },
      { id: 'assign', icon: '🔗', label: 'Assign & Serve' },
    ],
    chef: [
      { id: 'dashboard', icon: '🔥', label: 'Kitchen Board' },
      { id: 'orders', icon: '📋', label: 'Order Queue' },
      { id: 'menu', icon: '📖', label: 'Menu Status' },
    ],
    manager: [
      { id: 'dashboard', icon: '🏠', label: 'Overview' },
      { id: 'billing', icon: '💳', label: 'Billing' },
      { id: 'feedback', icon: '💬', label: 'Feedback' },
      { id: 'increment', icon: '🏆', label: 'Increments' },
      { id: 'tables', icon: '🪑', label: 'Tables' },
      { id: 'staff', icon: '👥', label: 'Staff' },
      { id: 'menu', icon: '📖', label: 'Menu Control' },
    ],
    management: [
      { id: 'dashboard', icon: '🏠', label: 'Command Center' },
      { id: 'attendance', icon: '🕐', label: 'Attendance' },
      { id: 'billing', icon: '💳', label: 'Billing' },
      { id: 'feedback', icon: '💬', label: 'Feedback' },
      { id: 'increment', icon: '🏆', label: 'Increments' },
      { id: 'orders', icon: '📋', label: 'All Orders' },
      { id: 'tables', icon: '🪑', label: 'Tables' },
      { id: 'staff', icon: '👥', label: 'Staff' },
      { id: 'menu', icon: '📖', label: 'Menu' },
      { id: 'reports', icon: '📊', label: 'Reports' },
    ],
  };
  const nav = items[role] || items.customer;
  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = nav.map(n =>
    `<button class="nav-item" data-panel="${n.id}">${n.icon} ${n.label}</button>`
  ).join('');
  sidebar.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => loadPanel(btn.dataset.panel);
  });
}

async function loadPanel(id) {
  state.currentPanel = id;
  document.querySelectorAll('.nav-item').forEach(b =>
    b.classList.toggle('active', b.dataset.panel === id)
  );
  const main = document.getElementById('main-content');
  main.innerHTML = '<div class="empty-state"><div class="icon">⏳</div>Loading…</div>';
  try {
    if (id === 'dashboard') await renderDashboard(main);
    else if (id === 'menu') await renderMenu(main);
    else if (id === 'myorders' || id === 'orders') await renderOrders(main);
    else if (id === 'tables') await renderTables(main);
    else if (id === 'assign') await renderAssign(main);
    else if (id === 'staff') await renderStaff(main);
    else if (id === 'reports') await renderReports(main);
    else if (id === 'billing') await renderBilling(main);
    else if (id === 'feedback') await renderFeedbackPanel(main);
    else if (id === 'increment') await renderIncrementPanel(main);
    else if (id === 'attendance') await renderAttendance(main);
    else main.innerHTML = '<div class="empty-state">Panel not found</div>';
  } catch (err) {
    main.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>${err.message}</div>`;
  }
}

// ---------- Dashboard ----------
async function renderDashboard(el) {
  state.stats = await api('/api/stats');
  state.orders = await api('/api/orders');
  const s = state.stats;
  const role = state.user.role;

  if (role === 'chef') {
    return renderChefDashboard(el, s);
  }
  if (role === 'server') {
    return renderServerDashboard(el, s);
  }
  if (role === 'manager') {
    return renderManagerDashboard(el, s);
  }
  if (role === 'management') {
    return renderManagementDashboard(el, s);
  }

  // Customer dashboard
  const mine = state.orders.filter(o => o.customerId === state.user.id);
  const active = mine.filter(o => !['cancelled', 'served'].includes(o.status));
  el.innerHTML = `
    <h1 class="page-title">Welcome back, ${state.user.name}!</h1>
    <p class="page-sub">Order delicious food, track your orders and book tables.</p>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${s.tablesAvailable}</div><div class="stat-label">Tables Free</div></div>
      <div class="stat-card"><div class="stat-value">${s.activeOrders}</div><div class="stat-label">Active Orders</div></div>
      <div class="stat-card"><div class="stat-value">${mine.length}</div><div class="stat-label">Your Orders</div></div>
    </div>
    <div class="card">
      <div class="card-title">📦 Your Active Orders</div>
      <div style="margin-top:0.75rem">
        ${active.length === 0
          ? '<p class="empty-state" style="padding:1rem 0">No active orders. Go order something delicious!</p>'
          : active.map(o => orderCardHTML(o, true)).join('')}
      </div>
    </div>`;
  bindOrderActions(el);
}

// ----- Chef Dashboard -----
async function renderChefDashboard(el, s) {
  const kitchen = state.orders.filter(o => ['pending', 'preparing'].includes(o.status));
  const ready = state.orders.filter(o => o.status === 'ready');

  el.innerHTML = `
    <h1 class="page-title">🔥 Kitchen Board</h1>
    <p class="page-sub">Live order queue – prepare and mark ready</p>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${s.pendingOrders}</div><div class="stat-label">Pending</div></div>
      <div class="stat-card"><div class="stat-value">${s.preparingOrders}</div><div class="stat-label">Preparing</div></div>
      <div class="stat-card"><div class="stat-value">${s.readyOrders}</div><div class="stat-label">Ready to Serve</div></div>
      <div class="stat-card"><div class="stat-value">${s.totalOrders}</div><div class="stat-label">Total Today</div></div>
    </div>
    ${kitchen.length === 0
      ? '<div class="empty-state"><div class="icon">✅</div>All clear – no pending orders!</div>'
      : `<div class="kitchen-board">${kitchen.map(o => kitchenTicketHTML(o)).join('')}</div>`}
    ${ready.length > 0 ? `
      <div class="section-divider" style="margin-top:1.5rem">Ready to Serve (${ready.length})</div>
      <div class="kitchen-board">${ready.map(o => kitchenTicketHTML(o)).join('')}</div>
    ` : ''}
  `;
  bindOrderActions(el);
}

function kitchenTicketHTML(o) {
  let actions = '';
  if (o.status === 'pending') {
    actions = `<button class="btn primary sm act-status" data-id="${o.id}" data-status="preparing">🍳 Start Preparing</button>`;
  } else if (o.status === 'preparing') {
    actions = `<button class="btn success sm act-status" data-id="${o.id}" data-status="ready">✅ Mark Ready</button>`;
  } else if (o.status === 'ready') {
    actions = `<span class="info-chip green">✅ Ready for Server</span>`;
  }
  return `
    <div class="kitchen-ticket ${o.status}">
      <div class="ticket-header">
        <span class="ticket-id">#${o.id}</span>
        <div style="display:flex;gap:0.5rem;align-items:center">
          ${o.type === 'dinein' && o.tableId ? `<span class="badge">Table ${o.tableId}</span>` : `<span class="badge">Parcel</span>`}
          <span class="ticket-time">${fmtTime(o.createdAt)}</span>
        </div>
      </div>
      <div class="ticket-meta">👤 ${o.customerName}${o.notes ? ` · 📝 ${o.notes}` : ''}</div>
      <ul class="ticket-items">
        ${o.items.map(i => `<li><span>🍽️ ${i.name}</span><strong>×${i.qty}</strong></li>`).join('')}
      </ul>
      <div class="ticket-actions">${actions}</div>
    </div>`;
}

// ----- Server Dashboard -----
async function renderServerDashboard(el, s) {
  state.foods = await api('/api/foods/all');
  state.tables = await api('/api/tables');

  const availableFoods = state.foods.filter(f => f.available);
  const pendingOrders = state.orders.filter(o => o.status === 'pending');
  const readyOrders = state.orders.filter(o => o.status === 'ready');
  const activeOrders = state.orders.filter(o => !['cancelled', 'served'].includes(o.status));

  el.innerHTML = `
    <h1 class="page-title">🛎️ Server Dashboard</h1>
    <p class="page-sub">Tables, food availability and order flow at a glance.</p>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${s.tablesAvailable}</div><div class="stat-label">Tables Free</div></div>
      <div class="stat-card"><div class="stat-value">${s.tablesOccupied}</div><div class="stat-label">Occupied</div></div>
      <div class="stat-card"><div class="stat-value">${s.tablesPrebooked}</div><div class="stat-label">Pre-booked</div></div>
      <div class="stat-card"><div class="stat-value">${s.pendingOrders}</div><div class="stat-label">Pending Orders</div></div>
      <div class="stat-card"><div class="stat-value">${s.readyOrders}</div><div class="stat-label">Ready to Serve</div></div>
      <div class="stat-card"><div class="stat-value">${s.activeOrders}</div><div class="stat-label">Active Orders</div></div>
    </div>

    <!-- Tables visual -->
    <div class="server-section">
      <div class="server-section-title"><span>🪑</span> Table Status</div>
      <div class="table-grid">
        ${state.tables.map(t => `
          <div class="table-card ${t.status}">
            <div class="table-num">${t.number}</div>
            <div class="table-status">${t.status}</div>
            ${t.customerName ? `<div class="table-info">${t.customerName}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Available foods -->
    <div class="server-section">
      <div class="server-section-title"><span>🍽️</span> Available Menu Items (${availableFoods.length})</div>
      <div class="food-available-grid">
        ${state.foods.map(f => `
          <div class="food-pill ${f.available ? '' : 'unavailable'}">
            <span class="food-pill-name">${f.available ? '✅' : '❌'} ${f.name}</span>
            <span class="food-pill-price">${money(f.price)}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Ready to serve -->
    ${readyOrders.length > 0 ? `
    <div class="server-section">
      <div class="server-section-title"><span>🔔</span> Ready to Serve (${readyOrders.length})</div>
      <div class="order-list">
        ${readyOrders.map(o => orderCardHTML(o, true)).join('')}
      </div>
    </div>` : ''}

    <!-- Pending orders -->
    ${pendingOrders.length > 0 ? `
    <div class="server-section">
      <div class="server-section-title"><span>⏳</span> Pending Orders (${pendingOrders.length})</div>
      <div class="order-list">
        ${pendingOrders.map(o => orderCardHTML(o, true)).join('')}
      </div>
    </div>` : ''}

    <!-- All active -->
    <div class="server-section">
      <div class="server-section-title"><span>📋</span> All Active Orders (${activeOrders.length})</div>
      ${activeOrders.length === 0
        ? '<div class="empty-state" style="padding:1.5rem 0"><div class="icon">📭</div>No active orders</div>'
        : `<div class="order-list">${activeOrders.map(o => orderCardHTML(o, true)).join('')}</div>`}
    </div>
  `;
  bindOrderActions(el);
}

// ----- Manager Dashboard -----
async function renderManagerDashboard(el, s) {
  el.innerHTML = `
    <h1 class="page-title">📋 Manager Overview</h1>
    <p class="page-sub">Staff, billing, customer feedback and performance at a glance.</p>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${s.activeOrders}</div><div class="stat-label">Active Orders</div></div>
      <div class="stat-card"><div class="stat-value">${money(s.todayRevenue)}</div><div class="stat-label">Revenue (Paid)</div></div>
      <div class="stat-card"><div class="stat-value">${s.paidOrders}</div><div class="stat-label">Paid Bills</div></div>
      <div class="stat-card"><div class="stat-value">${s.unpaidOrders}</div><div class="stat-label">Unpaid Bills</div></div>
      <div class="stat-card"><div class="stat-value">${s.tablesAvailable}</div><div class="stat-label">Tables Free</div></div>
      <div class="stat-card"><div class="stat-value">${s.totalFeedbacks}</div><div class="stat-label">Feedbacks</div></div>
    </div>
    <div class="card">
      <div class="card-title">🚀 Quick Actions</div>
      <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:0.75rem">
        <button class="btn primary sm" onclick="loadPanel('billing')">💳 View Billing</button>
        <button class="btn secondary sm" onclick="loadPanel('feedback')">💬 Customer Feedback</button>
        <button class="btn purple sm" onclick="loadPanel('increment')">🏆 Give Increments</button>
        <button class="btn secondary sm" onclick="loadPanel('staff')">👥 Staff</button>
      </div>
    </div>
  `;
}

// ----- Management Dashboard -----
async function renderManagementDashboard(el, s) {
  el.innerHTML = `
    <h1 class="page-title">🏢 Management Command Center</h1>
    <p class="page-sub">Full visibility – orders, staff, attendance, billing, feedback and reports.</p>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${s.totalOrders}</div><div class="stat-label">Total Orders</div></div>
      <div class="stat-card"><div class="stat-value">${money(s.todayRevenue)}</div><div class="stat-label">Revenue</div></div>
      <div class="stat-card"><div class="stat-value">${s.paidOrders}</div><div class="stat-label">Paid</div></div>
      <div class="stat-card"><div class="stat-value">${s.unpaidOrders}</div><div class="stat-label">Unpaid</div></div>
      <div class="stat-card"><div class="stat-value">${s.totalFeedbacks}</div><div class="stat-label">Feedbacks</div></div>
      <div class="stat-card"><div class="stat-value">${s.totalAttendance}</div><div class="stat-label">Logins Today</div></div>
      <div class="stat-card"><div class="stat-value">${s.tablesAvailable}</div><div class="stat-label">Tables Free</div></div>
      <div class="stat-card"><div class="stat-value">${s.totalIncrements}</div><div class="stat-label">Increments</div></div>
    </div>
    <div class="card">
      <div class="card-title">🚀 Quick Access</div>
      <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:0.75rem">
        <button class="btn primary sm" onclick="loadPanel('attendance')">🕐 Attendance Log</button>
        <button class="btn secondary sm" onclick="loadPanel('billing')">💳 Billing</button>
        <button class="btn secondary sm" onclick="loadPanel('feedback')">💬 Feedback</button>
        <button class="btn purple sm" onclick="loadPanel('increment')">🏆 Increments</button>
        <button class="btn secondary sm" onclick="loadPanel('reports')">📊 Reports</button>
        <button class="btn secondary sm" onclick="loadPanel('staff')">👥 Staff</button>
      </div>
    </div>
  `;
}

// ---------- Menu / Order Food ----------
async function renderMenu(el) {
  const role = state.user.role;
  const isStaff = ['chef', 'manager', 'management'].includes(role);

  if (isStaff) {
    const all = await api('/api/foods/all');
    state.foods = all;
    const zones = {};
    all.forEach(f => {
      if (!zones[f.zone]) zones[f.zone] = [];
      zones[f.zone].push(f);
    });
    el.innerHTML = `
      <h1 class="page-title">Menu Control</h1>
      <p class="page-sub">Toggle availability & view stock</p>
      ${Object.entries(zones).map(([zone, items]) => `
        <div class="zone-section">
          <div class="zone-title">${zone}</div>
          <div class="food-grid">
            ${items.map(f => `
              <div class="food-card">
                <div class="food-name">${f.name}</div>
                <div class="food-price">${money(f.price)} · Stock: ${f.stock}</div>
                <div style="margin-top:auto;padding-top:0.5rem">
                  <button class="btn ${f.available ? 'success' : 'secondary'} sm toggle-food" data-id="${f.id}">
                    ${f.available ? '✅ Available' : '❌ Unavailable'}
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}`;
    el.querySelectorAll('.toggle-food').forEach(btn => {
      btn.onclick = async () => {
        try {
          await api('/api/foods/toggle', { method: 'POST', body: JSON.stringify({ id: +btn.dataset.id }) });
          toast('Availability updated');
          renderMenu(el);
        } catch (e) { toast(e.message, 'error'); }
      };
    });
    return;
  }

  // Customer menu + cart
  state.foods = await api('/api/foods');
  const zones = {};
  state.foods.forEach(f => {
    if (!zones[f.zone]) zones[f.zone] = [];
    zones[f.zone].push(f);
  });

  el.innerHTML = `
    <h1 class="page-title">Order Food</h1>
    <p class="page-sub">Select items · Auto-calculates total · Supports dine-in & parcel</p>
    ${Object.entries(zones).map(([zone, items]) => `
      <div class="zone-section">
        <div class="zone-title">${zone}</div>
        <div class="food-grid">
          ${items.map(f => {
            const inCart = state.cart.find(c => c.foodId === f.id);
            const qty = inCart ? inCart.qty : 0;
            return `
              <div class="food-card" data-id="${f.id}">
                <div class="food-name">${f.name}</div>
                <div class="food-price">${money(f.price)}</div>
                <div class="food-actions">
                  <div class="qty-ctrl">
                    <button class="qty-minus" data-id="${f.id}">−</button>
                    <span class="qty-val">${qty}</span>
                    <button class="qty-plus" data-id="${f.id}">+</button>
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>
    `).join('')}
    <div id="cart-bar" class="cart-panel ${state.cart.length ? '' : 'hidden'}">
      <div class="cart-summary">
        <span id="cart-count">${state.cart.reduce((s, c) => s + c.qty, 0)} items</span>
        · <span class="cart-total" id="cart-total">${money(cartTotal())}</span>
      </div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
        <select id="order-type" class="select-sm">
          <option value="dinein">Dine-in</option>
          <option value="parcel">Parcel / Takeaway</option>
        </select>
        <select id="order-table" class="select-sm">
          <option value="">Select table (dine-in)</option>
        </select>
        <button class="btn primary" id="place-order-btn">🛒 Place Order</button>
      </div>
    </div>
  `;

  state.tables = await api('/api/tables');
  const tableSel = document.getElementById('order-table');
  state.tables.filter(t => t.status === 'available' || t.status === 'prebooked').forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = `Table ${t.number} (${t.status})`;
    tableSel.appendChild(opt);
  });

  el.querySelectorAll('.qty-plus').forEach(btn => { btn.onclick = () => changeQty(+btn.dataset.id, 1); });
  el.querySelectorAll('.qty-minus').forEach(btn => { btn.onclick = () => changeQty(+btn.dataset.id, -1); });
  document.getElementById('place-order-btn').onclick = placeOrder;
}

function cartTotal() {
  return state.cart.reduce((s, c) => s + c.price * c.qty, 0);
}

function changeQty(foodId, delta) {
  const food = state.foods.find(f => f.id === foodId);
  if (!food) return;
  let item = state.cart.find(c => c.foodId === foodId);
  if (!item && delta > 0) {
    state.cart.push({ foodId, name: food.name, price: food.price, qty: 1 });
  } else if (item) {
    item.qty += delta;
    if (item.qty <= 0) state.cart = state.cart.filter(c => c.foodId !== foodId);
  }
  const card = document.querySelector(`.food-card[data-id="${foodId}"]`);
  if (card) {
    const val = card.querySelector('.qty-val');
    const found = state.cart.find(c => c.foodId === foodId);
    val.textContent = found ? found.qty : 0;
  }
  const bar = document.getElementById('cart-bar');
  if (bar) {
    bar.classList.toggle('hidden', state.cart.length === 0);
    document.getElementById('cart-count').textContent = state.cart.reduce((s, c) => s + c.qty, 0) + ' items';
    document.getElementById('cart-total').textContent = money(cartTotal());
  }
}

async function placeOrder() {
  if (!state.cart.length) return toast('Cart is empty', 'error');
  const type = document.getElementById('order-type').value;
  const tableId = document.getElementById('order-table').value;
  if (type === 'dinein' && !tableId) return toast('Please select a table for dine-in', 'error');
  try {
    const order = await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: state.cart.map(c => ({ foodId: c.foodId, qty: c.qty })),
        tableId: type === 'dinein' ? +tableId : null,
        type,
      }),
    });
    state.cart = [];
    toast(`Order #${order.id} placed! Total: ${money(order.total)}`);
    loadPanel('myorders');
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ---------- Orders ----------
function orderCardHTML(o, showActions) {
  const statusClass = `status-${o.status}`;
  const items = o.items.map(i => `<li>${i.qty}× ${i.name} (${money(i.price)})</li>`).join('');
  let actions = '';
  if (showActions) {
    const role = state.user.role;
    if (role === 'chef' && o.status === 'pending') {
      actions = `<button class="btn primary sm act-status" data-id="${o.id}" data-status="preparing">🍳 Start Preparing</button>`;
    } else if (role === 'chef' && o.status === 'preparing') {
      actions = `<button class="btn success sm act-status" data-id="${o.id}" data-status="ready">✅ Mark Ready</button>`;
    } else if (role === 'server' && o.status === 'ready') {
      actions = `
        <button class="btn success sm act-status" data-id="${o.id}" data-status="served">🛎️ Mark Served</button>
        <button class="btn secondary sm act-assign-self" data-id="${o.id}">Assign Me</button>`;
    } else if (['manager', 'management', 'server'].includes(role) && !['cancelled', 'served'].includes(o.status)) {
      actions = `
        <button class="btn danger sm act-status" data-id="${o.id}" data-status="cancelled">Cancel</button>
        ${o.status === 'ready' ? `<button class="btn success sm act-status" data-id="${o.id}" data-status="served">Mark Served</button>` : ''}
        ${!o.paid && o.status !== 'cancelled' ? `<button class="btn secondary sm act-paid" data-id="${o.id}">💳 Mark Paid</button>` : ''}`;
    }
  }
  // Customer actions
  if (state.user.role === 'customer' && ['pending', 'preparing'].includes(o.status)) {
    actions += `<button class="btn danger sm act-status" data-id="${o.id}" data-status="cancelled">Cancel Order</button>`;
  }
  // Customer feedback button on served orders
  const alreadyRated = false; // checked client-side per render
  if (state.user.role === 'customer' && o.status === 'served') {
    actions += `<button class="btn secondary sm open-feedback" data-id="${o.id}">💬 Leave Feedback</button>`;
  }

  return `
    <div class="order-card" data-order="${o.id}">
      <div class="order-top">
        <div>
          <span class="order-id">#${o.id}</span>
          <span class="badge">${o.type}</span>
          ${o.tableId ? `<span class="badge">Table ${o.tableId}</span>` : ''}
          <div class="order-meta">${o.customerName} · ${fmtTime(o.createdAt)}</div>
        </div>
        <span class="status-pill ${statusClass}">${o.status}</span>
      </div>
      <ul class="order-items">${items}</ul>
      <div class="order-total">${money(o.total)} ${o.paid ? '<span class="info-chip green">✓ Paid</span>' : ''}</div>
      ${o.chefName ? `<div class="order-meta">👨‍🍳 Chef: ${o.chefName}</div>` : ''}
      ${o.waiterName ? `<div class="order-meta">🛎️ Server: ${o.waiterName}</div>` : ''}
      ${actions ? `<div class="order-actions">${actions}</div>` : ''}
      ${state.user.role === 'customer' && o.status === 'served' ? `
        <div id="feedback-area-${o.id}" class="hidden">${feedbackFormHTML(o.id)}</div>
      ` : ''}
    </div>`;
}

// ----- Feedback Form HTML -----
function feedbackFormHTML(orderId) {
  return `
    <div class="feedback-form">
      <h3>💬 Share Your Experience</h3>
      <div class="star-row">
        <label>🍽️ Food Quality</label>
        <div class="star-group" id="food-stars-${orderId}">
          ${[1,2,3,4,5].map(n => `<button class="star" data-val="${n}" data-type="food" data-order="${orderId}">⭐</button>`).join('')}
        </div>
      </div>
      <div class="star-row">
        <label>🛎️ Service</label>
        <div class="star-group" id="service-stars-${orderId}">
          ${[1,2,3,4,5].map(n => `<button class="star" data-val="${n}" data-type="service" data-order="${orderId}">⭐</button>`).join('')}
        </div>
      </div>
      <textarea class="feedback-comment" id="feedback-comment-${orderId}" rows="3" placeholder="Tell us more… (optional)"></textarea>
      <button class="btn primary full submit-feedback" data-order="${orderId}">Submit Feedback</button>
    </div>`;
}

async function renderOrders(el) {
  state.orders = await api('/api/orders');
  const title = state.user.role === 'customer' ? 'My Orders' : 'Orders';
  el.innerHTML = `
    <h1 class="page-title">${title}</h1>
    <p class="page-sub">Track status, cancellations & payments.</p>
    <div class="order-list">
      ${state.orders.length === 0
        ? '<div class="empty-state"><div class="icon">📭</div>No orders yet</div>'
        : state.orders.map(o => orderCardHTML(o, true)).join('')}
    </div>`;
  bindOrderActions(el);
  bindFeedbackActions(el);
}

function bindOrderActions(container) {
  container.querySelectorAll('.act-status').forEach(btn => {
    btn.onclick = async () => {
      try {
        const body = { status: btn.dataset.status };
        if (btn.dataset.status === 'preparing' && state.user.role === 'chef') {
          body.chefId = state.user.id;
        }
        if (btn.dataset.status === 'served' && state.user.role === 'server') {
          body.waiterId = state.user.id;
        }
        await api(`/api/orders/${btn.dataset.id}`, { method: 'PUT', body: JSON.stringify(body) });
        toast(`Order #${btn.dataset.id} → ${btn.dataset.status}`);
        loadPanel(state.currentPanel);
      } catch (e) { toast(e.message, 'error'); }
    };
  });
  container.querySelectorAll('.act-paid').forEach(btn => {
    btn.onclick = async () => {
      try {
        await api(`/api/orders/${btn.dataset.id}`, { method: 'PUT', body: JSON.stringify({ paid: true }) });
        toast('Marked as paid ✓');
        loadPanel(state.currentPanel);
      } catch (e) { toast(e.message, 'error'); }
    };
  });
  container.querySelectorAll('.act-assign-self').forEach(btn => {
    btn.onclick = async () => {
      try {
        await api(`/api/orders/${btn.dataset.id}`, {
          method: 'PUT',
          body: JSON.stringify({ waiterId: state.user.id }),
        });
        toast('You are now the assigned server');
        loadPanel(state.currentPanel);
      } catch (e) { toast(e.message, 'error'); }
    };
  });
}

function bindFeedbackActions(container) {
  // Open/close feedback form
  container.querySelectorAll('.open-feedback').forEach(btn => {
    btn.onclick = () => {
      const area = document.getElementById(`feedback-area-${btn.dataset.id}`);
      if (area) {
        area.classList.toggle('hidden');
        btn.textContent = area.classList.contains('hidden') ? '💬 Leave Feedback' : '✕ Close';
        bindStarActions(container, btn.dataset.id);
        bindSubmitFeedback(container, btn.dataset.id);
      }
    };
  });
}

function bindStarActions(container, orderId) {
  ['food', 'service'].forEach(type => {
    const group = document.getElementById(`${type}-stars-${orderId}`);
    if (!group) return;
    group.querySelectorAll('.star').forEach(star => {
      star.onclick = () => {
        const val = +star.dataset.val;
        if (type === 'food') state.feedbackRatings.food = val;
        else state.feedbackRatings.service = val;
        group.querySelectorAll('.star').forEach((s, i) => {
          s.classList.toggle('active', i < val);
        });
      };
    });
  });
}

function bindSubmitFeedback(container, orderId) {
  const submitBtn = container.querySelector(`.submit-feedback[data-order="${orderId}"]`);
  if (!submitBtn) return;
  submitBtn.onclick = async () => {
    const food = state.feedbackRatings.food;
    const service = state.feedbackRatings.service;
    if (!food || !service) return toast('Please rate both food and service', 'error');
    const comment = document.getElementById(`feedback-comment-${orderId}`)?.value || '';
    try {
      await api('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({ orderId: +orderId, foodRating: food, serviceRating: service, comment }),
      });
      toast('Thank you for your feedback! 🙏');
      state.feedbackRatings = { food: 0, service: 0 };
      loadPanel(state.currentPanel);
    } catch (e) { toast(e.message, 'error'); }
  };
}

// ---------- Tables ----------
async function renderTables(el) {
  state.tables = await api('/api/tables');
  const canEdit = ['server', 'manager', 'management'].includes(state.user.role);

  el.innerHTML = `
    <h1 class="page-title">Tables</h1>
    <p class="page-sub">
      ${state.user.role === 'customer' ? 'Click an available table to pre-book.' : 'Manage table status.'}
    </p>
    <div class="stats-grid" style="margin-bottom:1.25rem">
      <div class="stat-card"><div class="stat-value">${state.tables.filter(t=>t.status==='available').length}</div><div class="stat-label">Available</div></div>
      <div class="stat-card"><div class="stat-value">${state.tables.filter(t=>t.status==='occupied').length}</div><div class="stat-label">Occupied</div></div>
      <div class="stat-card"><div class="stat-value">${state.tables.filter(t=>t.status==='prebooked').length}</div><div class="stat-label">Pre-booked</div></div>
    </div>
    <div class="table-grid">
      ${state.tables.map(t => `
        <div class="table-card ${t.status}" data-id="${t.id}" title="${t.customerName || ''}">
          <div class="table-num">${t.number}</div>
          <div class="table-status">${t.status}</div>
          ${t.customerName ? `<div class="table-info">${t.customerName}</div>` : ''}
          ${t.arrivedAt ? `<div class="table-info">${fmtTime(t.arrivedAt)}</div>` : ''}
          ${t.bookedUntil ? `<div class="table-info">until ${fmtTime(t.bookedUntil)}</div>` : ''}
        </div>
      `).join('')}
    </div>
    ${canEdit ? `
      <div class="card" style="margin-top:1.5rem">
        <div class="card-title">Update Table Status</div>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center;margin-top:0.75rem">
          <select id="tbl-select" class="select-sm">
            ${state.tables.map(t => `<option value="${t.id}">Table ${t.number} (${t.status})</option>`).join('')}
          </select>
          <select id="tbl-status" class="select-sm">
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="prebooked">Pre-booked</option>
          </select>
          <button class="btn primary sm" id="tbl-update">Update</button>
        </div>
      </div>` : ''}
  `;

  if (state.user.role === 'customer') {
    el.querySelectorAll('.table-card.available').forEach(card => {
      card.onclick = async () => {
        if (!confirm(`Pre-book Table ${card.dataset.id}?`)) return;
        try {
          await api('/api/tables/prebook', {
            method: 'POST',
            body: JSON.stringify({ tableId: +card.dataset.id, customerName: state.user.name }),
          });
          toast('Table pre-booked!');
          renderTables(el);
        } catch (e) { toast(e.message, 'error'); }
      };
    });
  }

  const updBtn = document.getElementById('tbl-update');
  if (updBtn) {
    updBtn.onclick = async () => {
      try {
        await api('/api/tables/update', {
          method: 'POST',
          body: JSON.stringify({
            id: +document.getElementById('tbl-select').value,
            status: document.getElementById('tbl-status').value,
          }),
        });
        toast('Table updated');
        renderTables(el);
      } catch (e) { toast(e.message, 'error'); }
    };
  }
}

// ---------- Assign (Server) ----------
async function renderAssign(el) {
  state.orders = await api('/api/orders');
  state.staff = await api('/api/staff');
  const chefs = state.staff.filter(s => s.role === 'chef');
  const active = state.orders.filter(o => !['cancelled', 'served'].includes(o.status));

  el.innerHTML = `
    <h1 class="page-title">Assign & Serve</h1>
    <p class="page-sub">Assign chef, mark served, collect payment.</p>
    <div class="order-list">
      ${active.map(o => `
        <div class="order-card">
          <div class="order-top">
            <div>
              <span class="order-id">#${o.id}</span>
              <span class="badge">${o.type}</span>
              ${o.tableId ? `<span class="badge">T${o.tableId}</span>` : ''}
              <div class="order-meta">${o.customerName} · ${fmtTime(o.createdAt)}</div>
            </div>
            <span class="status-pill status-${o.status}">${o.status}</span>
          </div>
          <ul class="order-items">${o.items.map(i => `<li>${i.qty}× ${i.name}</li>`).join('')}</ul>
          <div class="order-total">${money(o.total)}</div>
          <div class="order-actions" style="align-items:center">
            <select class="select-sm assign-chef" data-id="${o.id}">
              <option value="">Assign Chef…</option>
              ${chefs.map(c => `<option value="${c.id}" ${o.chefId===c.id?'selected':''}>${c.name}</option>`).join('')}
            </select>
            <button class="btn secondary sm act-assign-chef" data-id="${o.id}">Set Chef</button>
            ${o.status === 'ready' ? `<button class="btn success sm act-status" data-id="${o.id}" data-status="served">🛎️ Served</button>` : ''}
            ${!o.paid ? `<button class="btn primary sm act-paid" data-id="${o.id}">💳 Collect Payment</button>` : '<span class="info-chip green">✓ Paid</span>'}
          </div>
        </div>
      `).join('') || '<div class="empty-state"><div class="icon">📭</div>No active orders</div>'}
    </div>`;
  bindOrderActions(el);
  el.querySelectorAll('.act-assign-chef').forEach(btn => {
    btn.onclick = async () => {
      const sel = el.querySelector(`.assign-chef[data-id="${btn.dataset.id}"]`);
      if (!sel.value) return toast('Select a chef', 'error');
      try {
        await api(`/api/orders/${btn.dataset.id}`, {
          method: 'PUT',
          body: JSON.stringify({ chefId: +sel.value }),
        });
        toast('Chef assigned');
        renderAssign(el);
      } catch (e) { toast(e.message, 'error'); }
    };
  });
}

// ---------- Billing (Manager / Management) ----------
async function renderBilling(el) {
  state.orders = await api('/api/orders');
  const allOrders = state.orders.filter(o => o.status !== 'cancelled');
  const paid = allOrders.filter(o => o.paid);
  const unpaid = allOrders.filter(o => !o.paid);
  const totalRevenue = paid.reduce((s, o) => s + o.total, 0);
  const pendingAmount = unpaid.reduce((s, o) => s + o.total, 0);

  el.innerHTML = `
    <h1 class="page-title">💳 Billing</h1>
    <p class="page-sub">Track payments – who has paid and who hasn't.</p>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${paid.length}</div><div class="stat-label">Bills Paid</div></div>
      <div class="stat-card"><div class="stat-value">${unpaid.length}</div><div class="stat-label">Bills Unpaid</div></div>
      <div class="stat-card"><div class="stat-value">${money(totalRevenue)}</div><div class="stat-label">Collected</div></div>
      <div class="stat-card"><div class="stat-value">${money(pendingAmount)}</div><div class="stat-label">Pending Collection</div></div>
    </div>

    <div class="card">
      <div class="card-title" style="color:var(--danger)">❌ Unpaid Bills (${unpaid.length})</div>
      ${unpaid.length === 0
        ? '<p style="color:var(--muted);padding:0.5rem 0">All bills are paid!</p>'
        : `<table class="billing-table" style="margin-top:0.75rem">
          <thead><tr>
            <th>Order</th><th>Customer</th><th>Table</th><th>Items</th><th>Total</th><th>Status</th><th>Action</th>
          </tr></thead>
          <tbody>
            ${unpaid.map(o => `
              <tr>
                <td><strong>#${o.id}</strong></td>
                <td>${o.customerName}<br><span style="font-size:0.75rem;color:var(--muted)">${o.customerPhone}</span></td>
                <td>${o.tableId ? `Table ${o.tableId}` : 'Parcel'}</td>
                <td style="font-size:0.8rem">${o.items.map(i => `${i.qty}×${i.name}`).join(', ')}</td>
                <td><strong>${money(o.total)}</strong></td>
                <td><span class="status-pill status-${o.status}">${o.status}</span></td>
                <td><button class="btn primary sm act-paid" data-id="${o.id}">💳 Mark Paid</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>`}
    </div>

    <div class="card">
      <div class="card-title" style="color:var(--success)">✅ Paid Bills (${paid.length})</div>
      ${paid.length === 0
        ? '<p style="color:var(--muted);padding:0.5rem 0">No paid bills yet.</p>'
        : `<table class="billing-table" style="margin-top:0.75rem">
          <thead><tr>
            <th>Order</th><th>Customer</th><th>Table</th><th>Total</th><th>Server</th><th>Chef</th>
          </tr></thead>
          <tbody>
            ${paid.map(o => `
              <tr>
                <td><strong>#${o.id}</strong></td>
                <td>${o.customerName}</td>
                <td>${o.tableId ? `Table ${o.tableId}` : 'Parcel'}</td>
                <td><span class="paid-tag">${money(o.total)}</span></td>
                <td>${o.waiterName || '—'}</td>
                <td>${o.chefName || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`}
    </div>
  `;
  bindOrderActions(el);
}

// ---------- Feedback Panel (Manager / Management) ----------
async function renderFeedbackPanel(el) {
  state.feedbacks = await api('/api/feedback');

  const avgFood = state.feedbacks.length
    ? (state.feedbacks.reduce((s, f) => s + f.foodRating, 0) / state.feedbacks.length).toFixed(1)
    : '—';
  const avgService = state.feedbacks.length
    ? (state.feedbacks.reduce((s, f) => s + f.serviceRating, 0) / state.feedbacks.length).toFixed(1)
    : '—';

  el.innerHTML = `
    <h1 class="page-title">💬 Customer Feedback</h1>
    <p class="page-sub">Reviews submitted by customers after their orders.</p>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${state.feedbacks.length}</div><div class="stat-label">Total Reviews</div></div>
      <div class="stat-card"><div class="stat-value">${avgFood} ⭐</div><div class="stat-label">Avg Food Rating</div></div>
      <div class="stat-card"><div class="stat-value">${avgService} ⭐</div><div class="stat-label">Avg Service Rating</div></div>
    </div>
    ${state.feedbacks.length === 0
      ? '<div class="empty-state"><div class="icon">💬</div>No feedbacks yet. They will appear here once customers submit reviews.</div>'
      : state.feedbacks.slice().reverse().map(f => `
        <div class="feedback-card">
          <div class="feedback-card-top">
            <div class="feedback-customer">👤 ${f.customerName}</div>
            <div class="feedback-time">${fmtTime(f.createdAt)} · Order #${f.orderId}</div>
          </div>
          <div class="feedback-ratings">
            <div class="rating-item">🍽️ Food: <strong>${stars(f.foodRating)}</strong> (${f.foodRating}/5)</div>
            <div class="rating-item">🛎️ Service: <strong>${stars(f.serviceRating)}</strong> (${f.serviceRating}/5)</div>
          </div>
          ${f.comment ? `<div class="feedback-comment-txt">"${f.comment}"</div>` : ''}
          <div class="feedback-staff">
            ${f.chefName ? `👨‍🍳 Chef: ${f.chefName}` : ''}
            ${f.waiterName ? `  ·  🛎️ Server: ${f.waiterName}` : ''}
            ${f.tableId ? `  ·  🪑 Table ${f.tableId}` : ''}
          </div>
        </div>
      `).join('')}
  `;
}

// ---------- Increment Panel (Manager / Management) ----------
async function renderIncrementPanel(el) {
  state.staff = await api('/api/staff');
  state.increments = await api('/api/increments');
  const eligibleStaff = state.staff.filter(s => ['server', 'chef'].includes(s.role));

  el.innerHTML = `
    <h1 class="page-title">🏆 Performance Increments</h1>
    <p class="page-sub">Reward staff based on customer feedback and performance.</p>

    <div class="increment-panel">
      <h3>Give Increment / Bonus</h3>
      <div class="increment-form">
        <div class="form-group">
          <label>Staff Member</label>
          <select id="inc-staff" class="select-sm" style="width:100%">
            <option value="">Select staff…</option>
            ${eligibleStaff.map(s => `<option value="${s.id}">${s.name} (${s.role})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Increment Amount (₹)</label>
          <input type="number" id="inc-amount" placeholder="e.g. 500" min="1" style="background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:0.5rem;width:100%"/>
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label>Reason / Note</label>
          <input type="text" id="inc-reason" placeholder="e.g. Excellent customer feedback this week" style="background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:0.5rem;width:100%"/>
        </div>
        <div style="grid-column:1/-1">
          <button class="btn purple full" id="give-inc-btn">🏆 Give Increment</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">📜 Increment History (${state.increments.length})</div>
      ${state.increments.length === 0
        ? '<p style="color:var(--muted);padding:0.5rem 0">No increments given yet.</p>'
        : state.increments.slice().reverse().map(inc => `
          <div class="increment-history-item">
            <div>
              <strong>${inc.staffName}</strong>
              <span class="attendance-role-chip ${roleChipClass(inc.staffRole)}">${inc.staffRole}</span>
              <div class="increment-who">By ${inc.givenBy} · ${fmtTime(inc.createdAt)}</div>
              ${inc.reason ? `<div class="increment-who">"${inc.reason}"</div>` : ''}
            </div>
            <span class="increment-amount">+${money(inc.amount)}</span>
          </div>
        `).join('')}
    </div>
  `;

  document.getElementById('give-inc-btn').onclick = async () => {
    const staffId = +document.getElementById('inc-staff').value;
    const amount = +document.getElementById('inc-amount').value;
    const reason = document.getElementById('inc-reason').value;
    if (!staffId) return toast('Select a staff member', 'error');
    if (!amount || amount < 1) return toast('Enter a valid amount', 'error');
    try {
      await api('/api/increment', {
        method: 'POST',
        body: JSON.stringify({ staffId, amount, reason }),
      });
      toast('Increment given successfully! 🏆');
      renderIncrementPanel(el);
    } catch (e) { toast(e.message, 'error'); }
  };
}

// ---------- Attendance (Management) ----------
async function renderAttendance(el) {
  state.attendance = await api('/api/attendance');
  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = state.attendance.filter(a => a.date === today);

  // Unique staff today
  const uniqueToday = [...new Map(todayLogs.map(a => [a.userId, a])).values()];
  const serverCount = uniqueToday.filter(a => a.role === 'server').length;
  const chefCount = uniqueToday.filter(a => a.role === 'chef').length;
  const managerCount = uniqueToday.filter(a => a.role === 'manager').length;

  el.innerHTML = `
    <h1 class="page-title">🕐 Staff Attendance</h1>
    <p class="page-sub">Login time records for all staff. Recorded automatically on login.</p>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${uniqueToday.length}</div><div class="stat-label">Staff Present Today</div></div>
      <div class="stat-card"><div class="stat-value">${serverCount}</div><div class="stat-label">Servers</div></div>
      <div class="stat-card"><div class="stat-value">${chefCount}</div><div class="stat-label">Chefs</div></div>
      <div class="stat-card"><div class="stat-value">${managerCount}</div><div class="stat-label">Managers</div></div>
    </div>

    <div class="card">
      <div class="card-title">📅 Today's Logins (${todayLogs.length})</div>
      ${todayLogs.length === 0
        ? '<p style="color:var(--muted);padding:0.5rem 0">No staff logins today yet.</p>'
        : `<table class="attendance-table" style="margin-top:0.75rem">
          <thead><tr>
            <th>#</th><th>Name</th><th>Role</th><th>Login Time</th>
          </tr></thead>
          <tbody>
            ${todayLogs.map((a, i) => `
              <tr>
                <td style="color:var(--muted)">${i+1}</td>
                <td><strong>${a.name}</strong></td>
                <td><span class="attendance-role-chip ${roleChipClass(a.role)}">${a.role}</span></td>
                <td>${fmtTime(a.loginTime)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`}
    </div>

    ${state.attendance.length > todayLogs.length ? `
    <div class="card">
      <div class="card-title">📋 All Attendance Records (${state.attendance.length})</div>
      <table class="attendance-table" style="margin-top:0.75rem">
        <thead><tr>
          <th>#</th><th>Name</th><th>Role</th><th>Date</th><th>Login Time</th>
        </tr></thead>
        <tbody>
          ${state.attendance.slice().reverse().map((a, i) => `
            <tr>
              <td style="color:var(--muted)">${i+1}</td>
              <td><strong>${a.name}</strong></td>
              <td><span class="attendance-role-chip ${roleChipClass(a.role)}">${a.role}</span></td>
              <td>${a.date}</td>
              <td>${fmtTime(a.loginTime)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>` : ''}
  `;
}

// ---------- Staff ----------
async function renderStaff(el) {
  state.staff = await api('/api/staff');
  el.innerHTML = `
    <h1 class="page-title">👥 Staff</h1>
    <p class="page-sub">Servers, Chefs & Managers currently in system</p>
    <div class="grid-3">
      ${state.staff.map(s => `
        <div class="card">
          <div style="font-size:2rem;margin-bottom:0.5rem">${ROLE_ICONS[s.role] || '👤'}</div>
          <div class="card-title">${s.name}</div>
          <div class="order-meta" style="margin-top:0.25rem">
            <span class="attendance-role-chip ${roleChipClass(s.role)}">${s.role}</span>
            · ${s.phone}
          </div>
        </div>
      `).join('')}
    </div>`;
}

// ---------- Reports (Management) ----------
async function renderReports(el) {
  state.stats = await api('/api/stats');
  state.orders = await api('/api/orders');
  const s = state.stats;
  const byStatus = {};
  state.orders.forEach(o => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });
  const byZone = {};
  state.orders.forEach(o => o.items.forEach(i => {
    const food = state.foods.find(f => f.id === i.foodId);
    if (food) byZone[food.zone] = (byZone[food.zone] || 0) + i.qty;
  }));

  el.innerHTML = `
    <h1 class="page-title">📊 Reports & Analytics</h1>
    <p class="page-sub">Full visibility across all operations</p>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${s.totalOrders}</div><div class="stat-label">Total Orders</div></div>
      <div class="stat-card"><div class="stat-value">${money(s.todayRevenue)}</div><div class="stat-label">Revenue (Paid)</div></div>
      <div class="stat-card"><div class="stat-value">${s.cancelledOrders}</div><div class="stat-label">Cancellations</div></div>
      <div class="stat-card"><div class="stat-value">${s.parcelOrders}</div><div class="stat-label">Parcels</div></div>
      <div class="stat-card"><div class="stat-value">${s.paidOrders}</div><div class="stat-label">Paid Bills</div></div>
      <div class="stat-card"><div class="stat-value">${s.unpaidOrders}</div><div class="stat-label">Unpaid Bills</div></div>
      <div class="stat-card"><div class="stat-value">${s.totalFeedbacks}</div><div class="stat-label">Feedbacks</div></div>
      <div class="stat-card"><div class="stat-value">${s.totalAttendance}</div><div class="stat-label">Attendance Logs</div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-title">Order Status Breakdown</div>
        <div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin-top:0.75rem">
          ${Object.entries(byStatus).map(([k,v]) => `
            <span class="status-pill status-${k}">${k}: ${v}</span>
          `).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-title">Tables Now</div>
        <div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin-top:0.75rem">
          <span class="info-chip green">✅ ${s.tablesAvailable} Free</span>
          <span class="info-chip red">🔴 ${s.tablesOccupied} Occupied</span>
          <span class="info-chip blue">🔵 ${s.tablesPrebooked} Pre-booked</span>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Information Flow</div>
      <div class="feedback-box">
        Customer places order → <strong>Server</strong> receives & assigns → <strong>Chef</strong> prepares → Server serves & collects payment → <strong>Manager</strong> oversees billing & feedback → <strong>Management</strong> sees full picture including attendance & increments.
      </div>
    </div>
  `;
}

// ---------- Boot ----------
(async function init() {
  if (state.token && state.user) {
    try {
      const me = await api('/api/me');
      state.user = me;
      enterApp();
    } catch {
      localStorage.removeItem('sr_token');
      localStorage.removeItem('sr_user');
    }
  }
})();
