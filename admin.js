// Admin Module - Handles admin authentication and location visibility
// Password: admincik

const ADMIN_CONFIG = {
  PASSWORD: 'admincik',
  STORAGE_KEY: 'gamevault_admin_authenticated'
};

// Check if user is authenticated as admin
function isAdminAuthenticated() {
  return localStorage.getItem(ADMIN_CONFIG.STORAGE_KEY) === 'true';
}

// Login as admin
function loginAdmin(password) {
  if (password === ADMIN_CONFIG.PASSWORD) {
    localStorage.setItem(ADMIN_CONFIG.STORAGE_KEY, 'true');
    return { success: true };
  }
  return { success: false, message: 'Password salah!' };
}

// Logout admin
function logoutAdmin() {
  localStorage.removeItem(ADMIN_CONFIG.STORAGE_KEY);
}

// Get location display based on admin status
function getLocationDisplay(location, isAdmin = false) {
  if (isAdmin) {
    return location || '—';
  }
  // For non-admin users, hide location details
  return location ? 'Tersedia' : '—';
}

// Get full location data (admin only)
function getFullLocation(location, isAdmin = false) {
  if (!isAdmin) {
    return 'Lokasi disembunyikan. Login admin untuk melihat.';
  }
  return location || '—';
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ADMIN_CONFIG,
    isAdminAuthenticated,
    loginAdmin,
    logoutAdmin,
    getLocationDisplay,
    getFullLocation
  };
}
