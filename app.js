// Main Application Logic
// Handles UI rendering, cart, and game management

// ===== GLOBAL STATE =====
let db = [];
let nextId = 1;
let currentTab = 'Game PC';
let searchQuery = '';
let priceFilter = '';
let locFilter = '';
let sizeTypeFilter = 'setup'; // 'setup' or 'jadi'
let cartSizeType = 'setup'; // Independent cart size type
let currentPage = 1;
const PAGE_SIZE = 25;
let cart = [];
let editGameId = null;

// ===== INIT DATABASE =====
function initDB() {
  for (const [cat, games] of Object.entries(RAW_DB)) {
    for (const g of games) {
      if (!g.title || g.title.trim() === '') continue;
      db.push({
        id: nextId++,
        title: g.title.replace(/^#/, '').trim(),
        rawTitle: g.title,
        size: g.size || '',
        location: g.location || '',
        backup: g.backup || '',
        size_jadi: g.size_jadi || '',
        category: cat,
        ...(g.hypervisor ? { hypervisor: true } : {}),
      });
    }
  }
  db.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
}

// ===== SIZE CALCULATION =====
function parseGB(sizeStr) {
  if (!sizeStr) return null;
  const s = sizeStr.toString().replace(',', '.').toLowerCase();
  const match = s.match(/(\d+\.?\d*)/);
  if (!match) return null;
  return parseFloat(match[1]);
}

function getDisplaySize(game) {
  // If user selected "Size Setup", always show original setup size
  if (sizeTypeFilter === 'setup') {
    return game.size || '';
  }
  
  // If user selected "Size Jadi":
  // 1. Use size_jadi from database if it exists and is not empty
  if (game.size_jadi && game.size_jadi.trim() !== '') {
    return game.size_jadi;
  }
  
  // 2. If size_jadi is empty, calculate as setup size + 10%
  const setupSize = parseGB(game.size);
  if (setupSize !== null) {
    const calculatedSize = setupSize * 1.1; // Add 10%
    return Math.round(calculatedSize * 10) / 10 + ' GB'; // Round to 1 decimal
  }
  
  return game.size || '';
}

// Get display size for cart (uses independent cart size type)
function getCartDisplaySize(game) {
  // If cart uses "Size Setup", always show original setup size
  if (cartSizeType === 'setup') {
    return game.size || '';
  }
  
  // If cart uses "Size Jadi":
  // 1. Use size_jadi from database if it exists and is not empty
  if (game.size_jadi && game.size_jadi.trim() !== '') {
    return game.size_jadi;
  }
  
  // 2. If size_jadi is empty, calculate as setup size + 10%
  const setupSize = parseGB(game.size);
  if (setupSize !== null) {
    const calculatedSize = setupSize * 1.1; // Add 10%
    return Math.round(calculatedSize * 10) / 10 + ' GB'; // Round to 1 decimal
  }
  
  return game.size || '';
}

function calculateTotalSize(cartItems) {
  let total = 0;
  cartItems.forEach(g => {
    const sizeStr = getCartDisplaySize(g);
    const gb = parseGB(sizeStr);
    if (gb !== null) {
      total += gb;
    }
  });
  return Math.round(total * 10) / 10; // Round to 1 decimal
}

// ===== PRICE LOGIC =====
function parseGB(sizeStr) {
  if (!sizeStr) return null;
  const s = sizeStr.toString().replace(',', '.').toLowerCase();
  const match = s.match(/(\d+\.?\d*)/);
  if (!match) return null;
  return parseFloat(match[1]);
}

function getPrice(game) {
  const cat = game.category;
  if (cat === 'PC Lawas 5k') return 5000;
  if (cat === 'PC Cilik') return 5000;
  
  // Use the larger size between setup and size jadi for pricing
  let gb = null;
  
  // First, try to get size from size_jadi if it exists
  if (game.size_jadi && game.size_jadi.trim() !== '') {
    gb = parseGB(game.size_jadi);
  }
  
  // If size_jadi doesn't exist, use setup size
  if (gb === null) {
    gb = parseGB(game.size);
  }
  
  if (gb === null) return 5000;
  if (gb >= 100) return 30000;
  if (gb >= 30) return 20000;
  if (gb >= 20) return 15000;
  if (gb >= 10) return 10000;
  return 5000;
}

function getPriceClass(price) {
  const map = {5000:'size-5k',10000:'size-10k',15000:'size-15k',20000:'size-20k',30000:'size-30k'};
  return map[price] || 'size-5k';
}

function getPriceTextClass(price){
  const map = {5000:'size-5k-text',10000:'size-10k-text',15000:'size-15k-text',20000:'size-20k-text',30000:'size-30k-text'};
  return map[price] || 'size-5k-text';
}

function formatRp(n){ return 'Rp '+n.toLocaleString('id-ID'); }

// ===== FILTER/SEARCH =====
function getFiltered() {
  return db.filter(g => {
    if (currentTab && g.category !== currentTab) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!g.title.toLowerCase().includes(q) && !g.location.toLowerCase().includes(q)) return false;
    }
    if (priceFilter) {
      const p = getPrice(g);
      if (p.toString() !== priceFilter) return false;
    }
    if (locFilter) {
      // For non-admin users, if "tersedia" is selected, show all games with location
      if (locFilter === 'tersedia') {
        if (!g.location) return false;
      } else {
        // For admin users, filter by actual location value
        if (!g.location.toLowerCase().includes(locFilter.toLowerCase())) return false;
      }
    }
    return true;
  });
}

// ===== TABS =====
const TABS = ['Game PC','PS4'];
function renderTabs() {
  const c = document.getElementById('tabsContainer');
  const counts = {};
  TABS.forEach(t => {
    counts[t] = db.filter(g => g.category === t).length;
  });
  c.innerHTML = TABS.map(t =>
    `<div class="tab ${t===currentTab?'active':''}" onclick="setTab('${t}')">${t} <span style="opacity:.6;font-size:.65rem">(${counts[t]})</span></div>`
  ).join('');
}
function setTab(t) { currentTab = t; currentPage = 1; renderAll(); }

// ===== LOCATION FILTER POPULATE =====
function populateLocFilter() {
  const isAdmin = isAdminAuthenticated();
  const locs = [...new Set(db.map(g => g.location).filter(Boolean))].sort();
  const sel = document.getElementById('locFilter');
  
  // Always show location filter
  sel.parentElement.style.display = 'block';
  
  if (isAdmin) {
    // Show full location details for admin
    sel.innerHTML = '<option value="">Semua Lokasi</option>' +
      locs.map(l => `<option value="${l}">${l}</option>`).join('');
  } else {
    // For non-admin users, show simplified location options
    sel.innerHTML = '<option value="">Semua Lokasi</option>' +
      '<option value="tersedia">Tersedia</option>';
  }
}

// ===== TABLE RENDERING WITH ADMIN MODE =====
function renderTable() {
  const filtered = getFiltered();
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const page = filtered.slice(start, start + PAGE_SIZE);

  document.getElementById('countInfo').textContent = `${total} game ditemukan`;

  const isAdmin = isAdminAuthenticated();
  const tbody = document.getElementById('gameTableBody');
  
  if (page.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="no-results">Tidak ada game yang ditemukan 😢</td></tr>`;
  } else {
    tbody.innerHTML = page.map(g => {
      const price = getPrice(g);
      const pc = getPriceClass(price);
      const ptc = getPriceTextClass(price);
      const inCart = cart.some(c => c.id === g.id);
      
      // Show full location for admin, hidden for regular users
      const locationDisplay = getLocationDisplay(g.location, isAdmin);
      
      return `<tr>
        <td class="title-cell">
          ${escHtml(g.title)}
          ${g.hypervisor ? `<span class="hypervisor-badge">⚙️ Hypervisor</span>` : ''}
          ${g.backup ? `<div class="sub">Backup: ${escHtml(g.backup)}</div>` : ''}
          ${g.size_jadi && g.size_jadi.trim() !== '' ? `<div class="sub">Size jadi: ${escHtml(g.size_jadi)}</div>` : ''}
        </td>
        <td><span class="size-badge ${pc}">${getDisplaySize(g) || '—'}</span></td>
        <td class="mobile-hide"><span class="loc-tag">${locationDisplay}</span></td>
        <td><span class="price-tag ${ptc}">${formatRp(price)}</span></td>
        <td><button class="add-btn ${inCart?'added':''}" onclick="toggleCart_item(${g.id})">${inCart?'✓ Ditambah':'+ Keranjang'}</button></td>
      </tr>`;
    }).join('');
  }

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const c = document.getElementById('paginationContainer');
  if (totalPages <= 1) { c.innerHTML = ''; return; }
  let pages = [];
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, getFiltered().length);
  const rangeStart = Math.max(1, currentPage - 2);
  const rangeEnd = Math.min(totalPages, currentPage + 2);
  let html = `<button class="page-btn" onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''}>‹</button>`;
  if (rangeStart > 1) html += `<button class="page-btn" onclick="goPage(1)">1</button>${rangeStart>2?'<span style="color:var(--text3);font-size:.7rem">...</span>':''}`;
  for (let i = rangeStart; i <= rangeEnd; i++) {
    html += `<button class="page-btn ${i===currentPage?'active':''}" onclick="goPage(${i})">${i}</button>`;
  }
  if (rangeEnd < totalPages) html += `${rangeEnd<totalPages-1?'<span style="color:var(--text3);font-size:.7rem">...</span>':''}<button class="page-btn" onclick="goPage(${totalPages})">${totalPages}</button>`;
  html += `<button class="page-btn" onclick="goPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}>›</button>`;
  html += `<span class="page-info">Hal ${currentPage}/${totalPages} · ${start+1}-${end}</span>`;
  c.innerHTML = html;
}

function goPage(p) {
  const filtered = getFiltered();
  const total = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  currentPage = Math.max(1, Math.min(p, total));
  renderTable();
  window.scrollTo({top:0,behavior:'smooth'});
}

// ===== CART =====
function toggleCart_item(id) {
  const g = db.find(x => x.id === id);
  if (!g) return;
  const idx = cart.findIndex(c => c.id === id);
  if (idx >= 0) {
    cart.splice(idx, 1);
    showNotif('Dihapus dari keranjang', 'error');
  } else {
    cart.push({...g, price: getPrice(g)});
    showNotif(`${g.title} ditambahkan!`, 'success');
  }
  renderCart();
  renderTable();
}

function addAllVisible() {
  const filtered = getFiltered();
  let added = 0;
  filtered.forEach(g => {
    if (!cart.some(c => c.id === g.id)) {
      cart.push({...g, price: getPrice(g)});
      added++;
    }
  });
  showNotif(`${added} game ditambahkan ke keranjang!`, 'success');
  renderCart();
  renderTable();
}

function renderCart() {
  const badge = document.getElementById('cartBadge');
  const mobileBadge = document.getElementById('mobileCartBadge');
  const count = document.getElementById('cartCount');
  const items = document.getElementById('cartItems');
  const summary = document.getElementById('cartSummary');
  const cartSizeSelect = document.getElementById('cartSizeType');

  badge.textContent = cart.length;
  badge.style.display = cart.length > 0 ? 'flex' : 'none';
  
  // Update mobile badge too (now used for all devices)
  if (mobileBadge) {
    mobileBadge.textContent = cart.length;
    mobileBadge.style.display = cart.length > 0 ? 'flex' : 'none';
  }
  
  count.textContent = `(${cart.length} game)`;

  if (cart.length === 0) {
    items.innerHTML = '<div class="cart-empty">Keranjang kosong.<br>Pilih game dulu!</div>';
    summary.classList.add('hidden');
    return;
  }

  // Sync dropdown with cart size type
  if (cartSizeSelect && cartSizeSelect.value !== cartSizeType) {
    cartSizeSelect.value = cartSizeType;
  }

  const catLabel = {
    'Game PC':'💻 Game PC', 'PC Cilik':'🖥️ PC Cilik',
    'PC Lawas 5k':'🗄️ PC Lawas', 'PS4':'🎮 PS4'
  };
  items.innerHTML = cart.map(g =>
    `<div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name" title="${escHtml(g.title)}">${escHtml(g.title)}</div>
        <div class="cart-item-cat">${catLabel[g.category]||g.category} · ${getCartDisplaySize(g)||'Kecil'}</div>
      </div>
      <span class="cart-item-price">${formatRp(g.price)}</span>
      <button class="cart-del" onclick="toggleCart_item(${g.id})">✕</button>
    </div>`
  ).join('');

  const total = cart.reduce((s, g) => s + g.price, 0);
  const totalSize = calculateTotalSize(cart);
  document.getElementById('cartSubtotal').textContent = formatRp(total);
  document.getElementById('cartGameCount').textContent = cart.length + ' game';
  document.getElementById('cartTotal').textContent = formatRp(total);
  
  // Add total size display
  const sizeDisplay = document.getElementById('cartTotalSize');
  if (sizeDisplay) {
    sizeDisplay.textContent = totalSize > 0 ? `${totalSize} GB` : '—';
  }
  summary.classList.remove('hidden');
}

function clearCart() {
  cart = [];
  renderCart();
  renderTable();
  showNotif('Keranjang dikosongkan', 'error');
}

function toggleCart() {
  const panel = document.getElementById('cartPanel');
  panel.scrollIntoView({behavior:'smooth', block:'start'});
}

// ===== EXPORT FUNCTIONS =====
function exportCart() {
  if (cart.length === 0) { showNotif('Keranjang kosong!', 'error'); return; }
  
  // Calculate totals
  const totalPrice = cart.reduce((s, g) => s + g.price, 0);
  const totalSize = calculateTotalSize(cart);
  
  // Format WhatsApp message
  let message = '*PESANAN BACKUP GAME*\n';
  message += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
  message += `📋 Total Game: ${cart.length} game\n`;
  message += `💾 Total Size: ${totalSize} GB\n`;
  message += `💰 Total Harga: ${formatRp(totalPrice)}\n\n`;
  message += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
  message += '*DETAIL GAME:*\n\n';
  
  cart.forEach((g, i) => {
    const size = getCartDisplaySize(g) || '—';
    const price = formatRp(g.price);
    const category = g.category.replace('PC ', '').replace(' Lawas 5k', ' Lawas');
    message += `${i + 1}. *${g.title}*\n`;
    message += `   📋 Category: ${category}\n`;
    message += `   💾 Size: ${size}\n`;
    message += `   💰 Harga: ${price}\n\n`;
  });
  
  message += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
  message += 'Silakan transfer sesuai total harga.\n';
  message += 'Terima kasih! 🎮';
  
  // Encode for WhatsApp
  const encodedMessage = encodeURIComponent(message);
  const phoneNumber = '62881027764090'; // Format international without +
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  
  // Open WhatsApp
  window.open(whatsappUrl, '_blank');
  showNotif('Membuka WhatsApp...', 'success');
}

function exportExcel() {
  const wb = XLSX.utils.book_new();
  const cats = ['Game PC','PC Cilik','PC Lawas 5k','PS4'];
  cats.forEach(cat => {
    const games = db.filter(g => g.category === cat).sort((a,b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
    let ws_data;
    if (cat === 'Game PC' || cat === 'PS4') {
      ws_data = [['Judul Game','Size','Letak','Backup','Size Jadi'],
        ...games.map(g => [g.title, g.size, g.location, g.backup, g.size_jadi])];
    } else if (cat === 'PC Cilik') {
      ws_data = [['Game Kecil','Letak'],
        ...games.map(g => [g.title, g.location])];
    } else {
      ws_data = [['Judul Game','Letak'],
        ...games.map(g => [g.title, g.location])];
    }
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, cat);
  });
  XLSX.writeFile(wb, `list_game_backup_${new Date().toISOString().slice(0,10)}.xlsx`);
  showNotif('Database diekspor ke Excel!', 'success');
}

// ===== SEARCH/FILTER HANDLERS =====
let searchTimeout;
function handleSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchQuery = document.getElementById('searchInput').value.trim();
    currentPage = 1;
    renderTable();
  }, 200);
}

function applyFilters() {
  priceFilter = document.getElementById('priceFilter').value;
  locFilter = document.getElementById('locFilter').value;
  sizeTypeFilter = document.getElementById('sizeTypeFilter').value;
  
  // Update header text based on size type
  const header = document.getElementById('sizeColumnHeader');
  if (header) {
    header.textContent = sizeTypeFilter === 'jadi' ? 'Size Jadi' : 'Size Setup';
  }
  
  currentPage = 1;
  renderTable();
}

// ===== CART SIZE TYPE =====
function updateCartSizeType() {
  cartSizeType = document.getElementById('cartSizeType').value;
  renderCart();
  showNotif(`Size keranjang diubah ke ${cartSizeType === 'setup' ? 'Setup' : 'Jadi'}`, 'success');
}

// ===== ADMIN FUNCTIONS =====
function openAdminLogin() {
  if (isAdminAuthenticated()) {
    openAdminDrawer();
  } else {
    document.getElementById('adminPass').value = '';
    openModal('loginModal');
    setTimeout(() => document.getElementById('adminPass').focus(), 100);
  }
}

function doLogin() {
  const pass = document.getElementById('adminPass').value;
  const result = loginAdmin(pass);
  if (result.success) {
    closeModal('loginModal');
    document.getElementById('adminFab').classList.add('active');
    document.getElementById('adminFab').textContent = '🛡️';
    document.getElementById('adminModeToggle').textContent = '👁️';
    openAdminDrawer();
    showNotif('Login admin berhasil!', 'success');
  } else {
    showNotif(result.message, 'error');
    document.getElementById('adminPass').value = '';
    document.getElementById('adminPass').focus();
  }
}

function openAdminDrawer() {
  renderAdminStats();
  renderAdminList();
  document.getElementById('adminDrawer').classList.add('open');
}

function closeAdmin() {
  document.getElementById('adminDrawer').classList.remove('open');
}

function logout() {
  logoutAdmin();
  document.getElementById('adminFab').classList.remove('active');
  document.getElementById('adminFab').textContent = '⚙️';
  document.getElementById('adminModeToggle').textContent = '👁️';
  closeAdmin();
  populateLocFilter();
  renderAll();
  showNotif('Logged out', 'error');
}

function renderAdminStats() {
  const s = document.getElementById('adminStats');
  const cats = ['Game PC','PC Cilik','PS4'];
  const total = db.length;
  const locs = new Set(db.map(g=>g.location).filter(Boolean)).size;
  let html = `
    <div style="background:var(--surface2);border-radius:8px;padding:12px;border:1px solid var(--border)">
      <div style="font-size:1.5rem;font-weight:700;font-family:'Syne',sans-serif">${total}</div>
      <div style="font-size:.65rem;color:var(--text3)">TOTAL GAME</div>
    </div>
    <div style="background:var(--surface2);border-radius:8px;padding:12px;border:1px solid var(--border)">
      <div style="font-size:1.5rem;font-weight:700;font-family:'Syne',sans-serif">${locs}</div>
      <div style="font-size:.65rem;color:var(--text3)">LOKASI HDD</div>
    </div>
  `;
  cats.forEach(cat => {
    html += `<div style="background:var(--surface2);border-radius:8px;padding:10px;border:1px solid var(--border)">
      <div style="font-size:1.1rem;font-weight:700;font-family:'Syne',sans-serif">${db.filter(g=>g.category===cat).length}</div>
      <div style="font-size:.62rem;color:var(--text3)">${cat.toUpperCase()}</div>
    </div>`;
  });
  s.innerHTML = html;
}

function renderAdminList() {
  const c = document.getElementById('adminGameList');
  const sorted = [...db].sort((a,b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
  c.innerHTML = sorted.map(g => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);">
      <div style="flex:1;min-width:0;">
        <div style="font-size:.7rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(g.title)}</div>
        <div style="font-size:.62rem;color:var(--text3);">${g.category} · ${g.size||'Kecil'} · ${g.location||'—'}</div>
      </div>
      <button class="btn btn-ghost btn-sm" style="flex-shrink:0" onclick="openEditGame(${g.id})">✏️</button>
      <button class="btn btn-sm" style="background:rgba(239,68,68,.15);color:#f87171;border:1px solid rgba(239,68,68,.3);flex-shrink:0" onclick="deleteGame(${g.id})">✕</button>
    </div>
  `).join('');
}

// ===== ADD/EDIT GAME =====
function openAddGame() {
  editGameId = null;
  document.getElementById('gameModalTitle').textContent = '➕ Tambah Game';
  document.getElementById('gTitle').value = '';
  document.getElementById('gSize').value = '';
  document.getElementById('gLoc').value = '';
  document.getElementById('gBackup').value = '';
  document.getElementById('gSizeJadi').value = '';
  document.getElementById('gCat').value = 'Game PC';
  openModal('gameModal');
}

function openEditGame(id) {
  const g = db.find(x => x.id === id);
  if (!g) return;
  editGameId = id;
  document.getElementById('gameModalTitle').textContent = '✏️ Edit Game';
  document.getElementById('gTitle').value = g.title;
  document.getElementById('gSize').value = g.size;
  document.getElementById('gLoc').value = g.location;
  document.getElementById('gBackup').value = g.backup;
  document.getElementById('gSizeJadi').value = g.size_jadi;
  document.getElementById('gCat').value = g.category;
  openModal('gameModal');
}

function saveGame() {
  const title = document.getElementById('gTitle').value.trim();
  if (!title) { showNotif('Nama game wajib diisi!', 'error'); return; }
  const data = {
    title,
    rawTitle: title,
    size: document.getElementById('gSize').value.trim(),
    location: document.getElementById('gLoc').value.trim(),
    backup: document.getElementById('gBackup').value.trim(),
    size_jadi: document.getElementById('gSizeJadi').value.trim(),
    category: document.getElementById('gCat').value,
  };
  if (editGameId !== null) {
    const idx = db.findIndex(g => g.id === editGameId);
    if (idx >= 0) {
      db[idx] = {...db[idx], ...data};
      showNotif('Game diupdate!', 'success');
    }
  } else {
    db.push({id: nextId++, ...data});
    showNotif('Game ditambahkan!', 'success');
  }
  db.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
  closeModal('gameModal');
  renderAll();
  if (isAdminAuthenticated()) { renderAdminStats(); renderAdminList(); }
}

function deleteGame(id) {
  if (!confirm('Yakin hapus game ini?')) return;
  const idx = db.findIndex(g => g.id === id);
  if (idx >= 0) {
    db.splice(idx, 1);
    cart = cart.filter(c => c.id !== id);
    renderAll();
    renderAdminStats();
    renderAdminList();
    renderCart();
    showNotif('Game dihapus', 'error');
  }
}

// ===== MODAL UTILS =====
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
  }
});

// ===== NOTIF =====
function showNotif(msg, type = 'success') {
  const c = document.getElementById('notifContainer');
  const n = document.createElement('div');
  n.className = `notif-item ${type}`;
  n.textContent = (type === 'success' ? '✓ ' : '✕ ') + msg;
  c.appendChild(n);
  setTimeout(() => n.remove(), 3000);
}

// ===== RENDER ALL =====
function renderAll() {
  renderTabs();
  renderTable();
}

// ===== ADMIN MODE TOGGLE =====
function toggleAdminMode() {
  if (isAdminAuthenticated()) {
    // Logout admin mode
    logoutAdmin();
    document.getElementById('adminFab').classList.remove('active');
    document.getElementById('adminFab').textContent = '⚙️';
    document.getElementById('adminModeToggle').textContent = '👁️';
    showNotif('Admin mode dimatikan', 'error');
  } else {
    // Open login modal
    openAdminLogin();
  }
  populateLocFilter();
  renderAll();
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== INIT APPLICATION =====
function initApp() {
  initDB();
  populateLocFilter();
  renderAll();
  renderCart();
  
  // Check admin status on load
  if (isAdminAuthenticated()) {
    document.getElementById('adminFab').classList.add('active');
    document.getElementById('adminFab').textContent = '🛡️';
    document.getElementById('adminModeToggle').textContent = '👁️';
  }
}

// Start the application
initApp();
