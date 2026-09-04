// Admin Module - Handles admin authentication and location visibility
// Password: admincik

const ADMIN_CONFIG = {
  PASSWORD: 'admincik',
  STORAGE_KEY: 'gamevault_admin_authenticated',
  MODE_KEY: 'gamevault_admin_mode'
};

// Check if user is authenticated as admin
function isAdminAuthenticated() {
  return localStorage.getItem(ADMIN_CONFIG.STORAGE_KEY) === 'true';
}

// Check if admin mode is currently active (must be authenticated AND mode is on)
function isAdminMode() {
  if (!isAdminAuthenticated()) return false;
  const mode = localStorage.getItem(ADMIN_CONFIG.MODE_KEY);
  // Default to true if authenticated and MODE_KEY not set yet
  return mode === null || mode === 'true';
}

// Set admin mode on or off
function setAdminMode(active) {
  if (active) {
    localStorage.setItem(ADMIN_CONFIG.MODE_KEY, 'true');
  } else {
    localStorage.setItem(ADMIN_CONFIG.MODE_KEY, 'false');
  }
}

// Login as admin
function loginAdmin(password) {
  if (password === ADMIN_CONFIG.PASSWORD) {
    localStorage.setItem(ADMIN_CONFIG.STORAGE_KEY, 'true');
    localStorage.setItem(ADMIN_CONFIG.MODE_KEY, 'true');
    return { success: true };
  }
  return { success: false, message: 'Password salah!' };
}

// Logout admin
function logoutAdmin() {
  localStorage.removeItem(ADMIN_CONFIG.STORAGE_KEY);
  localStorage.removeItem(ADMIN_CONFIG.MODE_KEY);
}

// Get location display based on admin status / mode
function getLocationDisplay(location, isAdmin = false) {
  const locStr = (location !== null && location !== undefined) ? String(location).trim() : '';
  if (isAdmin) {
    return locStr || '—';
  }
  // For non-admin or admin mode off, hide actual location details and show 'Tersedia'
  return locStr ? 'Tersedia' : '—';
}

// Get full location data (admin only)
function getFullLocation(location, isAdmin = false) {
  if (!isAdmin) {
    return 'Lokasi disembunyikan. Login admin untuk melihat.';
  }
  const locStr = (location !== null && location !== undefined) ? String(location).trim() : '';
  return locStr || '—';
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ADMIN_CONFIG,
    isAdminAuthenticated,
    isAdminMode,
    setAdminMode,
    loginAdmin,
    logoutAdmin,
    getLocationDisplay,
    getFullLocation
  };
}

