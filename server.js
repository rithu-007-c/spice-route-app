const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');

// ===================== IN-MEMORY DATA STORE =====================
let nextId = 100;

const foods = [
  { id: 1, name: 'Margherita Pizza', price: 299, zone: 'Italian', available: true, stock: 50 },
  { id: 2, name: 'Pepperoni Pizza', price: 349, zone: 'Italian', available: true, stock: 40 },
  { id: 3, name: 'Paneer Tikka', price: 249, zone: 'Indian Starters', available: true, stock: 30 },
  { id: 4, name: 'Butter Chicken', price: 399, zone: 'Indian Main', available: true, stock: 25 },
  { id: 5, name: 'Dal Makhani', price: 279, zone: 'Indian Main', available: true, stock: 35 },
  { id: 6, name: 'Veg Biryani', price: 259, zone: 'Rice', available: true, stock: 40 },
  { id: 7, name: 'Chicken Biryani', price: 329, zone: 'Rice', available: true, stock: 30 },
  { id: 8, name: 'Caesar Salad', price: 199, zone: 'Salads', available: true, stock: 20 },
  { id: 9, name: 'Chocolate Brownie', price: 149, zone: 'Desserts', available: true, stock: 45 },
  { id: 10, name: 'Cold Coffee', price: 129, zone: 'Beverages', available: true, stock: 60 },
  { id: 11, name: 'Mango Lassi', price: 99, zone: 'Beverages', available: true, stock: 50 },
  { id: 12, name: 'Garlic Bread', price: 149, zone: 'Italian', available: true, stock: 55 },
];

const tables = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  number: i + 1,
  status: 'available', // available | occupied | prebooked
  bookedUntil: null,
  currentOrderId: null,
  customerName: null,
  arrivedAt: null,
  maxHours: 1,
}));

const users = [
  { id: 1, name: 'Admin Manager', phone: '9999999999', password: 'manager123', role: 'manager' },
  { id: 2, name: 'Head Chef', phone: '8888888888', password: 'chef123', role: 'chef' },
  { id: 3, name: 'Senior Waiter', phone: '7777777777', password: 'server123', role: 'server' },
  { id: 4, name: 'Management HQ', phone: '6666666666', password: 'mgmt123', role: 'management' },
];

let orders = [];
let sessions = {}; // token -> userId

// NEW: Feedback, increments, attendance stores
let feedbacks = [];
let increments = [];
let attendance = [];

function generateToken() {
  return 'tok_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getUserFromToken(token) {
  const uid = sessions[token];
  return users.find(u => u.id === uid) || null;
}

function calculateOrderTotal(items) {
  return items.reduce((sum, it) => sum + it.price * it.qty, 0);
}

// ===================== API HANDLERS =====================
function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

async function handleAPI(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    return sendJSON(res, 200, {});
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '');
  const currentUser = getUserFromToken(token);

  // ---- Auth ----
  // Staff role passwords (any mobile number accepted if password matches)
  const STAFF_PASSWORDS = {
    server: 'server123',
    chef: 'chef123',
    manager: 'manager123',
    management: 'mgmt123',
  };
  const STAFF_DEFAULT_NAMES = {
    server: 'Server Staff',
    chef: 'Kitchen Chef',
    manager: 'Floor Manager',
    management: 'Management HQ',
  };

  if (pathname === '/api/login' && req.method === 'POST') {
    const body = await parseBody(req);
    const { phone, password, role } = body;
    if (!phone || !password) return sendJSON(res, 400, { error: 'Phone and password required' });

    let user = null;

    // Staff roles: any mobile number + fixed role password
    if (role && STAFF_PASSWORDS[role]) {
      if (password !== STAFF_PASSWORDS[role]) {
        return sendJSON(res, 401, { error: 'Invalid credentials' });
      }
      // Find existing user with this phone + role, or create one
      user = users.find(u => u.phone === phone && u.role === role);
      if (!user) {
        user = {
          id: ++nextId,
          name: STAFF_DEFAULT_NAMES[role] + ' (' + phone.slice(-4) + ')',
          phone,
          password: STAFF_PASSWORDS[role],
          role,
        };
        users.push(user);
      }
    } else {
      // Customer (or no role): exact phone + password match
      user = users.find(u => u.phone === phone && u.password === password);
      if (!user) return sendJSON(res, 401, { error: 'Invalid credentials' });
      if (role && user.role !== role && user.role !== 'management') {
        return sendJSON(res, 403, { error: 'Role mismatch' });
      }
    }

    const tok = generateToken();
    sessions[tok] = user.id;

    // Record attendance for staff
    if (['server', 'chef', 'manager', 'management'].includes(user.role)) {
      attendance.push({
        id: ++nextId,
        userId: user.id,
        name: user.name,
        role: user.role,
        loginTime: new Date().toISOString(),
        date: new Date().toISOString().slice(0, 10),
      });
    }

    return sendJSON(res, 200, {
      token: tok,
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
    });
  }

  if (pathname === '/api/signup' && req.method === 'POST') {
    const body = await parseBody(req);
    const { name, phone, password, role } = body;
    if (!name || !phone || !password) return sendJSON(res, 400, { error: 'Missing fields' });
    if (users.find(u => u.phone === phone)) return sendJSON(res, 400, { error: 'Phone already registered' });
    const newUser = {
      id: ++nextId,
      name,
      phone,
      password,
      role: role || 'customer',
    };
    users.push(newUser);
    const tok = generateToken();
    sessions[tok] = newUser.id;
    return sendJSON(res, 201, {
      token: tok,
      user: { id: newUser.id, name: newUser.name, phone: newUser.phone, role: newUser.role },
    });
  }

  if (pathname === '/api/me' && req.method === 'GET') {
    if (!currentUser) return sendJSON(res, 401, { error: 'Unauthorized' });
    return sendJSON(res, 200, {
      id: currentUser.id,
      name: currentUser.name,
      phone: currentUser.phone,
      role: currentUser.role,
    });
  }

  // ---- Foods ----
  if (pathname === '/api/foods' && req.method === 'GET') {
    return sendJSON(res, 200, foods.filter(f => f.available));
  }

  if (pathname === '/api/foods/all' && req.method === 'GET') {
    if (!currentUser || !['manager', 'management', 'chef', 'server'].includes(currentUser.role)) {
      return sendJSON(res, 403, { error: 'Forbidden' });
    }
    return sendJSON(res, 200, foods);
  }

  if (pathname === '/api/foods/toggle' && req.method === 'POST') {
    if (!currentUser || !['manager', 'management', 'chef'].includes(currentUser.role)) {
      return sendJSON(res, 403, { error: 'Forbidden' });
    }
    const body = await parseBody(req);
    const food = foods.find(f => f.id === body.id);
    if (food) {
      food.available = !food.available;
      return sendJSON(res, 200, food);
    }
    return sendJSON(res, 404, { error: 'Not found' });
  }

  // ---- Tables ----
  if (pathname === '/api/tables' && req.method === 'GET') {
    return sendJSON(res, 200, tables);
  }

  if (pathname === '/api/tables/update' && req.method === 'POST') {
    if (!currentUser || !['server', 'manager', 'management'].includes(currentUser.role)) {
      return sendJSON(res, 403, { error: 'Forbidden' });
    }
    const body = await parseBody(req);
    const table = tables.find(t => t.id === body.id);
    if (!table) return sendJSON(res, 404, { error: 'Table not found' });
    if (body.status) table.status = body.status;
    if (body.bookedUntil !== undefined) table.bookedUntil = body.bookedUntil;
    if (body.customerName !== undefined) table.customerName = body.customerName;
    if (body.status === 'available') {
      table.currentOrderId = null;
      table.customerName = null;
      table.arrivedAt = null;
      table.bookedUntil = null;
    }
    if (body.status === 'occupied' && !table.arrivedAt) {
      table.arrivedAt = new Date().toISOString();
    }
    return sendJSON(res, 200, table);
  }

  if (pathname === '/api/tables/prebook' && req.method === 'POST') {
    if (!currentUser) return sendJSON(res, 401, { error: 'Unauthorized' });
    const body = await parseBody(req);
    const table = tables.find(t => t.id === body.tableId && t.status === 'available');
    if (!table) return sendJSON(res, 400, { error: 'Table not available' });
    table.status = 'prebooked';
    table.bookedUntil = body.time || new Date(Date.now() + 60 * 60 * 1000).toISOString();
    table.customerName = body.customerName || currentUser.name;
    return sendJSON(res, 200, table);
  }

  // ---- Orders ----
  if (pathname === '/api/orders' && req.method === 'GET') {
    if (!currentUser) return sendJSON(res, 401, { error: 'Unauthorized' });
    let result = orders;
    if (currentUser.role === 'customer') {
      result = orders.filter(o => o.customerId === currentUser.id);
    } else if (currentUser.role === 'chef') {
      result = orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status));
    } else if (currentUser.role === 'server') {
      result = orders.filter(o => o.status !== 'cancelled');
    }
    // manager & management see all
    return sendJSON(res, 200, result);
  }

  if (pathname === '/api/orders' && req.method === 'POST') {
    if (!currentUser) return sendJSON(res, 401, { error: 'Unauthorized' });
    const body = await parseBody(req);
    const { items, tableId, type = 'dinein', notes } = body;
    if (!items || !items.length) return sendJSON(res, 400, { error: 'No items' });

    const orderItems = [];
    for (const it of items) {
      const food = foods.find(f => f.id === it.foodId && f.available);
      if (!food) return sendJSON(res, 400, { error: `Food ${it.foodId} unavailable` });
      if (food.stock < it.qty) return sendJSON(res, 400, { error: `Insufficient stock for ${food.name}` });
      orderItems.push({
        foodId: food.id,
        name: food.name,
        price: food.price,
        qty: it.qty,
      });
      food.stock -= it.qty;
    }

    const total = calculateOrderTotal(orderItems);
    const order = {
      id: ++nextId,
      customerId: currentUser.id,
      customerName: currentUser.name,
      customerPhone: currentUser.phone,
      tableId: tableId || null,
      items: orderItems,
      total,
      status: 'pending',
      type,
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chefId: null,
      chefName: null,
      waiterId: null,
      waiterName: null,
      paid: false,
    };
    orders.push(order);

    if (type === 'dinein' && tableId) {
      const table = tables.find(t => t.id === tableId);
      if (table) {
        table.status = 'occupied';
        table.currentOrderId = order.id;
        table.customerName = currentUser.name;
        table.arrivedAt = new Date().toISOString();
      }
    }

    return sendJSON(res, 201, order);
  }

  if (pathname.startsWith('/api/orders/') && req.method === 'PUT') {
    if (!currentUser) return sendJSON(res, 401, { error: 'Unauthorized' });
    const orderId = parseInt(pathname.split('/')[3], 10);
    const order = orders.find(o => o.id === orderId);
    if (!order) return sendJSON(res, 404, { error: 'Order not found' });

    const body = await parseBody(req);
    const { status, waiterId, chefId, paid } = body;

    if (status === 'cancelled' && order.status !== 'cancelled') {
      for (const it of order.items) {
        const food = foods.find(f => f.id === it.foodId);
        if (food) food.stock += it.qty;
      }
      order.total = 0;
      if (order.tableId) {
        const table = tables.find(t => t.id === order.tableId);
        if (table && table.currentOrderId === order.id) {
          table.status = 'available';
          table.currentOrderId = null;
          table.customerName = null;
          table.arrivedAt = null;
        }
      }
    }

    // Free table when served & paid
    if (status === 'served' && order.tableId) {
      const table = tables.find(t => t.id === order.tableId);
      if (table && table.currentOrderId === order.id) {
        table.status = 'available';
        table.currentOrderId = null;
        table.customerName = null;
        table.arrivedAt = null;
      }
    }

    if (status) order.status = status;
    if (waiterId !== undefined) order.waiterId = waiterId;
    if (chefId !== undefined) order.chefId = chefId;
    if (paid !== undefined) order.paid = paid;
    order.updatedAt = new Date().toISOString();

    if (order.waiterId) {
      const w = users.find(u => u.id === order.waiterId);
      order.waiterName = w ? w.name : null;
    }
    if (order.chefId) {
      const c = users.find(u => u.id === order.chefId);
      order.chefName = c ? c.name : null;
    }

    return sendJSON(res, 200, order);
  }

  // ---- Feedback ----
  if (pathname === '/api/feedback' && req.method === 'POST') {
    if (!currentUser) return sendJSON(res, 401, { error: 'Unauthorized' });
    if (currentUser.role !== 'customer') return sendJSON(res, 403, { error: 'Only customers can leave feedback' });
    const body = await parseBody(req);
    const { orderId, foodRating, serviceRating, comment } = body;
    if (!orderId || !foodRating || !serviceRating) return sendJSON(res, 400, { error: 'Missing fields' });

    const order = orders.find(o => o.id === orderId && o.customerId === currentUser.id);
    if (!order) return sendJSON(res, 404, { error: 'Order not found' });
    if (feedbacks.find(f => f.orderId === orderId)) return sendJSON(res, 400, { error: 'Feedback already submitted' });

    const fb = {
      id: ++nextId,
      orderId,
      customerId: currentUser.id,
      customerName: currentUser.name,
      tableId: order.tableId,
      foodRating: parseInt(foodRating),
      serviceRating: parseInt(serviceRating),
      comment: comment || '',
      chefId: order.chefId,
      chefName: order.chefName,
      waiterId: order.waiterId,
      waiterName: order.waiterName,
      createdAt: new Date().toISOString(),
    };
    feedbacks.push(fb);
    return sendJSON(res, 201, fb);
  }

  if (pathname === '/api/feedback' && req.method === 'GET') {
    if (!currentUser || !['manager', 'management'].includes(currentUser.role)) {
      return sendJSON(res, 403, { error: 'Forbidden' });
    }
    return sendJSON(res, 200, feedbacks);
  }

  // ---- Increments ----
  if (pathname === '/api/increment' && req.method === 'POST') {
    if (!currentUser || !['manager', 'management'].includes(currentUser.role)) {
      return sendJSON(res, 403, { error: 'Forbidden' });
    }
    const body = await parseBody(req);
    const { staffId, amount, reason } = body;
    if (!staffId || !amount) return sendJSON(res, 400, { error: 'Missing fields' });
    const staff = users.find(u => u.id === staffId);
    if (!staff) return sendJSON(res, 404, { error: 'Staff not found' });

    const inc = {
      id: ++nextId,
      staffId,
      staffName: staff.name,
      staffRole: staff.role,
      amount: parseInt(amount),
      reason: reason || '',
      givenBy: currentUser.name,
      givenById: currentUser.id,
      createdAt: new Date().toISOString(),
    };
    increments.push(inc);
    return sendJSON(res, 201, inc);
  }

  if (pathname === '/api/increments' && req.method === 'GET') {
    if (!currentUser || !['manager', 'management'].includes(currentUser.role)) {
      return sendJSON(res, 403, { error: 'Forbidden' });
    }
    return sendJSON(res, 200, increments);
  }

  // ---- Attendance ----
  if (pathname === '/api/attendance' && req.method === 'GET') {
    if (!currentUser || !['manager', 'management'].includes(currentUser.role)) {
      return sendJSON(res, 403, { error: 'Forbidden' });
    }
    return sendJSON(res, 200, attendance);
  }

  // ---- Stats / Dashboard helpers ----
  if (pathname === '/api/stats' && req.method === 'GET') {
    if (!currentUser) return sendJSON(res, 401, { error: 'Unauthorized' });
    const activeOrders = orders.filter(o => !['cancelled', 'served'].includes(o.status));
    const todayRevenue = orders
      .filter(o => o.paid && o.status !== 'cancelled')
      .reduce((s, o) => s + o.total, 0);
    return sendJSON(res, 200, {
      totalOrders: orders.length,
      activeOrders: activeOrders.length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      preparingOrders: orders.filter(o => o.status === 'preparing').length,
      readyOrders: orders.filter(o => o.status === 'ready').length,
      cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
      parcelOrders: orders.filter(o => o.type === 'parcel').length,
      tablesAvailable: tables.filter(t => t.status === 'available').length,
      tablesOccupied: tables.filter(t => t.status === 'occupied').length,
      tablesPrebooked: tables.filter(t => t.status === 'prebooked').length,
      todayRevenue,
      paidOrders: orders.filter(o => o.paid && o.status !== 'cancelled').length,
      unpaidOrders: orders.filter(o => !o.paid && !['cancelled'].includes(o.status)).length,
      totalFeedbacks: feedbacks.length,
      totalIncrements: increments.length,
      totalAttendance: attendance.length,
      foodZones: [...new Set(foods.map(f => f.zone))],
    });
  }

  // ---- Users list (for assignment) ----
  if (pathname === '/api/staff' && req.method === 'GET') {
    if (!currentUser || !['server', 'manager', 'management', 'chef'].includes(currentUser.role)) {
      return sendJSON(res, 403, { error: 'Forbidden' });
    }
    return sendJSON(res, 200, users
      .filter(u => ['server', 'chef', 'manager'].includes(u.role))
      .map(u => ({ id: u.id, name: u.name, role: u.role, phone: u.phone })));
  }

  sendJSON(res, 404, { error: 'Not found' });
}

// ===================== STATIC FILE SERVER =====================
function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(PUBLIC, filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  if (pathname.startsWith('/api/')) {
    try {
      await handleAPI(req, res, pathname);
    } catch (e) {
      console.error(e);
      sendJSON(res, 500, { error: 'Server error' });
    }
  } else {
    serveStatic(req, res, pathname);
  }
});

server.listen(PORT, () => {
  console.log(`SpiceRoute Restaurant App running at http://localhost:${PORT}`);
  console.log('Staff login (any mobile number + fixed password):');
  console.log('  Manager   : any phone / manager123');
  console.log('  Chef      : any phone / chef123');
  console.log('  Server    : any phone / server123');
  console.log('  Management: any phone / mgmt123');
  console.log('  Customers : Sign up with any phone');
});
