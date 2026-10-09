// ========================================================
// NOURII STORE - ADMIN PORTAL CONTROLLER (محرك لوحة التحكم)
// ========================================================

const ADMIN_STATE = {
  currentUser: null,
  activeTab: 'overview',
  products: [],
  categories: [],
  users: [],
  searchQuery: '',
  categoryFilter: 'all',
  settings: {
    googleScriptUrl: '',
    githubToken: '',
    githubRepo: 'yaminakkady/nourii',
    githubBranch: 'main'
  }
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  loadAdminStoredData();
  initTheme();
  checkAuthSession();
});

// LOAD STORED DATA
function loadAdminStoredData() {
  try {
    // 1. Settings from config.js or localStorage
    if (typeof NOURII_CONFIG !== 'undefined' && NOURII_CONFIG.googleScriptUrl) {
      ADMIN_STATE.settings.googleScriptUrl = NOURII_CONFIG.googleScriptUrl;
    }
    const savedScriptUrl = localStorage.getItem('nourii_google_script_url');
    if (savedScriptUrl) {
      ADMIN_STATE.settings.googleScriptUrl = savedScriptUrl;
    }

    const ghToken = localStorage.getItem('nourii_github_pat');
    if (ghToken) ADMIN_STATE.settings.githubToken = ghToken;

    // 2. Current user session
    const session = localStorage.getItem('nourii_admin_session');
    if (session) ADMIN_STATE.currentUser = JSON.parse(session);

    // 3. Users list
    const storedUsers = localStorage.getItem('nourii_admin_users');
    if (storedUsers) {
      ADMIN_STATE.users = JSON.parse(storedUsers);
    } else {
      // Default users list with super admin
      ADMIN_STATE.users = [
        {
          username: 'admin',
          password: 'nourii2026',
          fullName: 'مدير النظام (Super Admin)',
          role: 'admin',
          createdAt: new Date().toLocaleDateString('ar-EG'),
          isActive: true,
          mustChangePassword: false
        }
      ];
      localStorage.setItem('nourii_admin_users', JSON.stringify(ADMIN_STATE.users));
    }

    // 4. Products (Custom from storage or fallback from products.js)
    const storedProds = localStorage.getItem('nourii_admin_products') || localStorage.getItem('nourii_live_products');
    if (storedProds) {
      ADMIN_STATE.products = JSON.parse(storedProds);
    } else if (typeof PRODUCTS !== 'undefined') {
      ADMIN_STATE.products = JSON.parse(JSON.stringify(PRODUCTS));
      localStorage.setItem('nourii_admin_products', JSON.stringify(ADMIN_STATE.products));
    }

    // 5. Categories
    if (typeof CATEGORIES !== 'undefined') {
      ADMIN_STATE.categories = CATEGORIES;
    }

    // If Google Drive URL is active, fetch live data from Google Drive as PRIMARY source
    if (ADMIN_STATE.settings.googleScriptUrl) {
      syncSilentlyFromGoogleDrive();
      fetchLiveUsersFromGoogleDrive();
    }

  } catch (e) {
    console.error('Error loading admin state:', e);
  }
}

// AUTHENTICATION & SESSION MANAGEMENT
function checkAuthSession() {
  const loginScreen = document.getElementById('login-screen');
  const firstTimeScreen = document.getElementById('first-time-setup-screen');
  const dashboardLayout = document.getElementById('dashboard-layout');

  if (ADMIN_STATE.currentUser) {
    if (loginScreen) loginScreen.classList.add('hidden');
    if (firstTimeScreen) firstTimeScreen.classList.add('hidden');
    if (dashboardLayout) dashboardLayout.classList.remove('hidden');
    updateUserProfileDisplay();
    populateCategorySelectors();
    refreshAllData();
  } else {
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (firstTimeScreen) firstTimeScreen.classList.add('hidden');
    if (dashboardLayout) dashboardLayout.classList.add('hidden');
  }
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  const errorMsg = document.getElementById('login-error-msg');

  const username = usernameInput ? usernameInput.value.trim().toLowerCase() : '';
  const password = passwordInput ? passwordInput.value.trim() : '';

  // 1. Check in local users state
  const user = ADMIN_STATE.users.find(u => u.username.toLowerCase() === username && u.password === password);

  if (user) {
    if (user.isActive === false) {
      showLoginError('هذا الحساب معطل حالياً من قِبل الإدارة.');
      return;
    }

    // 🟢 هل هذا تسجيل دخوله الأول ومطلوب منه إنشاء كلمة مرور خاصة؟
    if (user.mustChangePassword) {
      showFirstTimePasswordScreen(user);
      return;
    }

    // تسجيل الدخول العادي
    completeUserLogin(user);
  } else {
    // 2. فحص عبر Google Drive API إذا كان مربوطاً
    if (ADMIN_STATE.settings.googleScriptUrl) {
      checkLoginWithGoogleDrive(username, password);
    } else {
      showLoginError('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }
  }
}

function completeUserLogin(user) {
  ADMIN_STATE.currentUser = {
    username: user.username,
    fullName: user.fullName,
    role: user.role
  };

  localStorage.setItem('nourii_admin_session', JSON.stringify(ADMIN_STATE.currentUser));
  const errorMsg = document.getElementById('login-error-msg');
  if (errorMsg) errorMsg.classList.add('hidden');

  showAdminToast(`مرحباً بك مجدداً، ${user.fullName} 👋`, 'success');
  checkAuthSession();
}

function checkLoginWithGoogleDrive(username, password) {
  showAdminToast('جاري التحقق من الحساب عبر Google Drive...', 'info');

  fetch(ADMIN_STATE.settings.googleScriptUrl, {
    method: 'POST',
    body: JSON.stringify({
      action: 'login',
      username: username,
      password: password
    })
  })
  .then(res => {
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('رابط Google Apps Script غير صالح أو تم تغييره (خطأ 404). يرجى نسخ رابط النشر الحالي من Apps Script.');
      }
      throw new Error(`تعذر الاتصال بخادم Google (${res.status})`);
    }
    return res.json();
  })
  .then(res => {
    if (res.status === 'success' && res.user) {
      // مزامنة المستخدم محلياً
      const existingIdx = ADMIN_STATE.users.findIndex(u => u.username.toLowerCase() === res.user.username.toLowerCase());
      if (existingIdx > -1) {
        ADMIN_STATE.users[existingIdx] = { ...ADMIN_STATE.users[existingIdx], ...res.user, password };
      } else {
        ADMIN_STATE.users.push({ ...res.user, password, isActive: true, createdAt: new Date().toLocaleDateString('ar-EG') });
      }
      localStorage.setItem('nourii_admin_users', JSON.stringify(ADMIN_STATE.users));

      if (res.user.mustChangePassword) {
        showFirstTimePasswordScreen(res.user);
      } else {
        completeUserLogin(res.user);
      }
    } else {
      showLoginError(res.message || 'اسم المستخدم أو كلمة المرور غير صحيحة.');
    }
  })
  .catch(err => {
    console.error(err);
    const msg = (err && err.message && err.message.includes('404'))
      ? err.message
      : 'تعذر الاتصال بـ Google Drive للتحقق من الحساب. تأكد من أن رابط النشر سليم ومضبوط على Anyone.';
    showLoginError(msg);
  });
}

function showLoginError(msg) {
  const errorMsg = document.getElementById('login-error-msg');
  if (errorMsg) {
    errorMsg.innerText = msg;
    errorMsg.classList.remove('hidden');
  }
}

function handleLogout() {
  ADMIN_STATE.currentUser = null;
  localStorage.removeItem('nourii_admin_session');
  checkAuthSession();
  showAdminToast('تم تسجيل الخروج بنجاح.', 'info');
}

function togglePasswordVisibility(id) {
  const input = document.getElementById(id);
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
}

function updateUserProfileDisplay() {
  const nameEl = document.getElementById('current-user-name');
  const roleEl = document.getElementById('current-user-role');
  if (nameEl && ADMIN_STATE.currentUser) {
    nameEl.innerText = ADMIN_STATE.currentUser.fullName || ADMIN_STATE.currentUser.username;
  }
  if (roleEl && ADMIN_STATE.currentUser) {
    roleEl.innerText = ADMIN_STATE.currentUser.role === 'admin' ? 'Super Admin' : 'Editor';
  }
}

// ========================================================
// 2. FIRST-TIME PASSWORD SETUP (إنشاء كلمة مرور أول مرة)
// ========================================================
function showFirstTimePasswordScreen(user) {
  const loginScreen = document.getElementById('login-screen');
  const firstTimeScreen = document.getElementById('first-time-setup-screen');
  const targetInput = document.getElementById('first-time-user-target');
  const nameDisplay = document.getElementById('first-time-username-display');

  if (loginScreen) loginScreen.classList.add('hidden');
  if (firstTimeScreen) firstTimeScreen.classList.remove('hidden');

  if (targetInput) targetInput.value = user.username;
  if (nameDisplay) nameDisplay.innerText = user.fullName || user.username;
}

function handleFirstTimePasswordSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('first-time-user-target').value;
  const newPass = document.getElementById('first-time-new-pass').value.trim();
  const confirmPass = document.getElementById('first-time-confirm-pass').value.trim();
  const errorBox = document.getElementById('first-time-error-msg');

  if (newPass.length < 4) {
    showFirstTimeError('يجب أن لا تقل كلمة المرور عن 4 خانات.');
    return;
  }

  if (newPass !== confirmPass) {
    showFirstTimeError('كلمتا المرور غير متطابقتين! يرجى إعادة التأكيد.');
    return;
  }

  // تحديث كلمة المرور محلياً وإلغاء شرط أول دخول
  const userIdx = ADMIN_STATE.users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
  if (userIdx > -1) {
    ADMIN_STATE.users[userIdx].password = newPass;
    ADMIN_STATE.users[userIdx].mustChangePassword = false;
    localStorage.setItem('nourii_admin_users', JSON.stringify(ADMIN_STATE.users));

    // تحديث في Google Drive إذا كان متاحاً
    if (ADMIN_STATE.settings.googleScriptUrl) {
      updatePasswordInGoogleDrive(username, newPass);
    }

    showAdminToast('تم إنشاء كلمة المرور الخاصة بك بنجاح! 🎉', 'success');

    // تسجيل الدخول التلقائي
    completeUserLogin(ADMIN_STATE.users[userIdx]);
  } else {
    showFirstTimeError('حدث خطأ في العثور على الحساب.');
  }
}

function showFirstTimeError(msg) {
  const errorBox = document.getElementById('first-time-error-msg');
  if (errorBox) {
    errorBox.innerText = msg;
    errorBox.classList.remove('hidden');
  }
}

// ========================================================
// 1. CHANGE CURRENT USER'S PASSWORD (تغيير كلمة المرور الشخصية)
// ========================================================
function openChangePasswordModal() {
  const modal = document.getElementById('change-password-modal');
  const form = document.getElementById('change-password-form');
  const errorBox = document.getElementById('chg-pass-error');
  if (form) form.reset();
  if (errorBox) errorBox.classList.add('hidden');
  if (modal) modal.classList.remove('hidden');
}

function closeChangePasswordModal() {
  const modal = document.getElementById('change-password-modal');
  if (modal) modal.classList.add('hidden');
}

function handleChangePasswordSubmit(e) {
  e.preventDefault();
  if (!ADMIN_STATE.currentUser) return;

  const currentPass = document.getElementById('chg-current-pass').value.trim();
  const newPass = document.getElementById('chg-new-pass').value.trim();
  const confirmPass = document.getElementById('chg-confirm-pass').value.trim();
  const errorBox = document.getElementById('chg-pass-error');

  const username = ADMIN_STATE.currentUser.username;
  const user = ADMIN_STATE.users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user || user.password !== currentPass) {
    if (errorBox) {
      errorBox.innerText = 'كلمة المرور الحالية غير صحيحة!';
      errorBox.classList.remove('hidden');
    }
    return;
  }

  if (newPass.length < 4) {
    if (errorBox) {
      errorBox.innerText = 'كلمة المرور الجديدة يجب أن لا تقل عن 4 خانات.';
      errorBox.classList.remove('hidden');
    }
    return;
  }

  if (newPass !== confirmPass) {
    if (errorBox) {
      errorBox.innerText = 'كلمتا المرور الجديدتان غير متطابقتين!';
      errorBox.classList.remove('hidden');
    }
    return;
  }

  // تحديث كلمة المرور
  user.password = newPass;
  localStorage.setItem('nourii_admin_users', JSON.stringify(ADMIN_STATE.users));

  if (ADMIN_STATE.settings.googleScriptUrl) {
    updatePasswordInGoogleDrive(username, newPass);
  }

  closeChangePasswordModal();
  showAdminToast('تم تغيير كلمة المرور بنجاح! 🔒', 'success');
}

function updatePasswordInGoogleDrive(username, newPassword) {
  const url = ADMIN_STATE.settings.googleScriptUrl;
  if (!url) return;

  fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      action: 'changePassword',
      username: username,
      newPassword: newPassword
    })
  }).catch(err => console.warn('Drive password update err:', err));
}

// ========================================================
// 1. EDIT EXISTING USERS (تعديل المستخدمين وصلاحياتهم)
// ========================================================
function openEditUserModal(username) {
  const user = ADMIN_STATE.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return;

  const modal = document.getElementById('edit-user-modal');
  document.getElementById('edit-user-username').value = user.username;
  document.getElementById('edit-user-fullname').value = user.fullName || '';
  document.getElementById('edit-user-role').value = user.role || 'editor';
  document.getElementById('edit-user-status').value = user.isActive !== false ? 'active' : 'disabled';
  document.getElementById('edit-user-new-password').value = '';
  document.getElementById('edit-user-must-change-pass').checked = Boolean(user.mustChangePassword);

  if (modal) modal.classList.remove('hidden');
}

function closeEditUserModal() {
  const modal = document.getElementById('edit-user-modal');
  if (modal) modal.classList.add('hidden');
}

function handleEditUserFormSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('edit-user-username').value;
  const fullName = document.getElementById('edit-user-fullname').value.trim();
  const role = document.getElementById('edit-user-role').value;
  const isActive = document.getElementById('edit-user-status').value === 'active';
  const newPass = document.getElementById('edit-user-new-password').value.trim();
  const mustChange = document.getElementById('edit-user-must-change-pass').checked;

  const idx = ADMIN_STATE.users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
  if (idx > -1) {
    ADMIN_STATE.users[idx].fullName = fullName;
    ADMIN_STATE.users[idx].role = role;
    ADMIN_STATE.users[idx].isActive = isActive;
    ADMIN_STATE.users[idx].mustChangePassword = mustChange;

    if (newPass) {
      ADMIN_STATE.users[idx].password = newPass;
    }

    localStorage.setItem('nourii_admin_users', JSON.stringify(ADMIN_STATE.users));

    // مزامنة التعديل في Google Drive إذا كان متاحاً
    if (ADMIN_STATE.settings.googleScriptUrl) {
      syncUserToGoogleDrive(ADMIN_STATE.users[idx]);
    }

    closeEditUserModal();
    renderUsersTable();
    updateStatCards();
    showAdminToast(`تم تحديث بيانات المستخدم "${fullName}" بنجاح! ✨`, 'success');
  }
}

// ========================================================
// TAB SWITCHING & OVERVIEW
// ========================================================
function switchTab(tabId) {
  ADMIN_STATE.activeTab = tabId;

  const tabs = ['overview', 'products', 'users', 'sync'];
  tabs.forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    const btn = document.getElementById(`tab-btn-${t}`);
    if (el) el.classList.toggle('hidden', t !== tabId);
    if (btn) btn.classList.toggle('active', t !== tabId);
  });

  const titleEl = document.getElementById('page-title');
  const subEl = document.getElementById('page-subtitle');

  if (tabId === 'overview') {
    titleEl.innerText = 'نظرة عامة';
    subEl.innerText = 'ملخص إحصائيات المتجر والمنتجات الحالية';
  } else if (tabId === 'products') {
    titleEl.innerText = 'إدارة المنتجات والكتالوج';
    subEl.innerText = 'إضافة، تعديل الأسعار، تغيير الصور، وتخصيص المنتجات';
    renderProductsTable();
  } else if (tabId === 'users') {
    titleEl.innerText = 'إدارة المستخدمين والمشرفين';
    subEl.innerText = 'التحكم في صلاحيات الوصول وإنشاء كلمات المرور';
    renderUsersTable();
    fetchLiveUsersFromGoogleDrive(false);
  } else if (tabId === 'sync') {
    titleEl.innerText = 'إعدادات Google Drive & GitHub';
    subEl.innerText = 'ربط قاعدة بيانات Google Sheets كمصدر رئيسي ومزامنة المستودع';
    loadSyncSettingsInputs();
  }
}

function refreshAllData() {
  updateStatCards();
  renderProductsTable();
  renderUsersTable();
  loadSyncSettingsInputs();
}

function updateStatCards() {
  const totalProdEl = document.getElementById('stat-total-products');
  const totalUsersEl = document.getElementById('stat-total-users');
  if (totalProdEl) totalProdEl.innerText = ADMIN_STATE.products.length;
  if (totalUsersEl) totalUsersEl.innerText = ADMIN_STATE.users.length;
}

function populateCategorySelectors() {
  const filterSelect = document.getElementById('admin-category-filter');
  const formSelect = document.getElementById('prod-category');

  if (filterSelect) {
    let opts = '<option value="all">جميع الأقسام (10)</option>';
    ADMIN_STATE.categories.forEach(c => {
      opts += `<option value="${c.id}">${c.nameAr} (${c.nameEn})</option>`;
    });
    filterSelect.innerHTML = opts;
  }

  if (formSelect) {
    let opts = '';
    ADMIN_STATE.categories.forEach(c => {
      opts += `<option value="${c.id}">${c.nameAr}</option>`;
    });
    formSelect.innerHTML = opts;
  }
}

// ========================================================
// PRODUCTS MANAGEMENT
// ========================================================
function renderProductsTable() {
  const tbody = document.getElementById('admin-products-table-body');
  if (!tbody) return;

  let filtered = ADMIN_STATE.products.filter(p => {
    if (ADMIN_STATE.categoryFilter !== 'all' && p.categoryId !== ADMIN_STATE.categoryFilter) {
      return false;
    }
    if (ADMIN_STATE.searchQuery.trim() !== '') {
      const q = ADMIN_STATE.searchQuery.toLowerCase().trim();
      const matchAr = p.nameAr && p.nameAr.toLowerCase().includes(q);
      const matchEn = p.nameEn && p.nameEn.toLowerCase().includes(q);
      const matchCat = p.categoryId && p.categoryId.toLowerCase().includes(q);
      if (!matchAr && !matchEn && !matchCat) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-12 text-stone-400">
          <i class="fa-solid fa-box-open text-3xl mb-2 block text-stone-300"></i>
          لا توجد منتجات مطابقة للبحث أو القسم المحدد.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const cat = ADMIN_STATE.categories.find(c => c.id === p.categoryId);
    const catName = cat ? cat.nameAr : p.categoryId;

    return `
      <tr>
        <td class="w-16">
          <img src="${p.image}" alt="${p.nameAr}" class="w-12 h-12 rounded-xl object-cover border border-stone-200 dark:border-stone-700 bg-stone-100">
        </td>
        <td>
          <div class="font-bold text-sm text-stone-900 dark:text-stone-100">${p.nameAr}</div>
          <div class="text-[11px] text-stone-400 font-mono">${p.nameEn || ''}</div>
        </td>
        <td>
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300">
            ${catName}
          </span>
        </td>
        <td>
          <div class="font-black text-sm text-pink-600">${p.price} ج.م</div>
          ${p.originalPrice ? `<span class="text-xs text-stone-400 line-through">${p.originalPrice} ج.م</span>` : ''}
        </td>
        <td>
          ${p.badgeAr ? `
            <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              ${p.badgeAr}
            </span>
          ` : '<span class="text-xs text-stone-400">-</span>'}
        </td>
        <td>
          ${p.isCustomizable ? `
            <span class="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <i class="fa-solid fa-check"></i> متاح بالاسم
            </span>
          ` : '<span class="text-xs text-stone-400">لا</span>'}
        </td>
        <td class="text-center">
          <div class="flex items-center justify-center gap-2">
            <button onclick="openEditProductModal('${p.id}')" class="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300 transition-colors" title="تعديل">
              <i class="fa-solid fa-pen-to-square text-xs"></i>
            </button>
            <button onclick="deleteProduct('${p.id}')" class="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors" title="حذف">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function handleProductSearch(val) {
  ADMIN_STATE.searchQuery = val;
  renderProductsTable();
}

function handleCategoryFilter(val) {
  ADMIN_STATE.categoryFilter = val;
  renderProductsTable();
}

function openAddProductModal() {
  const modal = document.getElementById('product-form-modal');
  const title = document.getElementById('product-modal-title');
  const form = document.getElementById('product-form');

  if (title) title.innerText = 'إضافة منتج جديد';
  if (form) form.reset();

  document.getElementById('prod-form-id').value = '';
  modal.classList.remove('hidden');
}

function openEditProductModal(id) {
  const prod = ADMIN_STATE.products.find(p => p.id === id);
  if (!prod) return;

  const modal = document.getElementById('product-form-modal');
  const title = document.getElementById('product-modal-title');

  if (title) title.innerText = 'تعديل بيانات المنتج';

  document.getElementById('prod-form-id').value = prod.id;
  document.getElementById('prod-name-ar').value = prod.nameAr || '';
  document.getElementById('prod-name-en').value = prod.nameEn || '';
  document.getElementById('prod-category').value = prod.categoryId || 'others';
  document.getElementById('prod-price').value = prod.price || '';
  document.getElementById('prod-original-price').value = prod.originalPrice || '';
  document.getElementById('prod-image-url').value = prod.image || '';
  document.getElementById('prod-badge-ar').value = prod.badgeAr || '';
  document.getElementById('prod-badge-en').value = prod.badgeEn || '';
  document.getElementById('prod-customizable').checked = Boolean(prod.isCustomizable);
  document.getElementById('prod-custom-label-ar').value = prod.customFieldLabelAr || '';
  document.getElementById('prod-desc-ar').value = prod.descriptionAr || '';

  modal.classList.remove('hidden');
}

function closeProductFormModal() {
  const modal = document.getElementById('product-form-modal');
  if (modal) modal.classList.add('hidden');
}

function handleProductFormSubmit(e) {
  e.preventDefault();

  const idInput = document.getElementById('prod-form-id').value;
  const isEditing = Boolean(idInput);
  const id = isEditing ? idInput : `prod-${Date.now()}`;

  const productObj = {
    id: id,
    categoryId: document.getElementById('prod-category').value,
    nameAr: document.getElementById('prod-name-ar').value.trim(),
    nameEn: document.getElementById('prod-name-en').value.trim(),
    price: Number(document.getElementById('prod-price').value) || 0,
    originalPrice: Number(document.getElementById('prod-original-price').value) || 0,
    image: document.getElementById('prod-image-url').value.trim(),
    badgeAr: document.getElementById('prod-badge-ar').value.trim(),
    badgeEn: document.getElementById('prod-badge-en').value.trim(),
    rating: 5.0,
    reviewsCount: 1,
    isCustomizable: document.getElementById('prod-customizable').checked,
    customFieldLabelAr: document.getElementById('prod-custom-label-ar').value.trim(),
    descriptionAr: document.getElementById('prod-desc-ar').value.trim(),
    descriptionEn: ''
  };

  if (isEditing) {
    const idx = ADMIN_STATE.products.findIndex(p => p.id === id);
    if (idx > -1) ADMIN_STATE.products[idx] = { ...ADMIN_STATE.products[idx], ...productObj };
  } else {
    ADMIN_STATE.products.unshift(productObj);
  }

  saveProductsToStorage();
  closeProductFormModal();
  renderProductsTable();
  updateStatCards();

  showAdminToast(isEditing ? 'تم حفظ التعديل! ✨' : 'تمت إضافة المنتج بنجاح! 🎉', 'success');

  // مزامنة فورية مع Google Drive إذا كان مربوطاً كقاعدة بيانات
  if (ADMIN_STATE.settings.googleScriptUrl) {
    syncProductToGoogleDrive(productObj);
  }
}

function deleteProduct(id) {
  const prod = ADMIN_STATE.products.find(p => p.id === id);
  const name = prod ? prod.nameAr : '';

  if (confirm(`هل أنت متأكد من حذف المنتج: "${name}"؟`)) {
    ADMIN_STATE.products = ADMIN_STATE.products.filter(p => p.id !== id);
    saveProductsToStorage();
    renderProductsTable();
    updateStatCards();
    showAdminToast('تم حذف المنتج بنجاح.', 'info');

    if (ADMIN_STATE.settings.googleScriptUrl) {
      deleteProductFromGoogleDrive(id);
    }
  }
}

function saveProductsToStorage() {
  localStorage.setItem('nourii_admin_products', JSON.stringify(ADMIN_STATE.products));
  localStorage.setItem('nourii_live_products', JSON.stringify(ADMIN_STATE.products));
}

// ========================================================
// USERS MANAGEMENT
// ========================================================
function renderUsersTable() {
  const tbody = document.getElementById('admin-users-table-body');
  if (!tbody) return;

  tbody.innerHTML = ADMIN_STATE.users.map((u, i) => {
    const isSuperAdmin = u.username.toLowerCase() === 'admin';
    const isSelf = ADMIN_STATE.currentUser && ADMIN_STATE.currentUser.username.toLowerCase() === u.username.toLowerCase();

    return `
      <tr>
        <td class="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <i class="fa-solid fa-user-circle text-stone-400 text-lg"></i>
          <span>${u.username}</span>
          ${isSelf ? '<span class="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded font-bold">أنت</span>' : ''}
        </td>
        <td class="text-sm">${u.fullName}</td>
        <td>
          <span class="px-2.5 py-1 rounded-full text-xs font-bold ${
            u.role === 'admin' ? 'badge-role-admin' : 'badge-role-editor'
          }">
            ${u.role === 'admin' ? 'مشرف رئيسي (Admin)' : 'محرر (Editor)'}
          </span>
        </td>
        <td class="text-xs text-stone-400">${u.createdAt || '-'}</td>
        <td>
          ${u.isActive !== false ? `
            <span class="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span> نشط
            </span>
          ` : `
            <span class="text-xs font-bold text-red-500 flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-red-400"></span> معطل
            </span>
          `}
          ${u.mustChangePassword ? `
            <span class="text-[10px] text-amber-600 block mt-0.5">⚠️ بانتظار تعيين كلمة مرور</span>
          ` : ''}
        </td>
        <td class="text-center">
          <div class="flex items-center justify-center gap-2">
            <!-- Edit User Button -->
            <button onclick="openEditUserModal('${u.username}')" class="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300 transition-colors" title="تعديل المستخدم">
              <i class="fa-solid fa-pen-to-square text-xs"></i>
            </button>

            ${isSuperAdmin ? '' : `
              <button onclick="deleteUser('${u.username}')" class="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors" title="حذف المستخدم">
                <i class="fa-solid fa-trash-can text-xs"></i>
              </button>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddUserModal() {
  const modal = document.getElementById('user-form-modal');
  const form = document.getElementById('user-form');
  if (form) form.reset();
  const mustChangeBox = document.getElementById('user-must-change-pass');
  if (mustChangeBox) mustChangeBox.checked = true;
  if (modal) modal.classList.remove('hidden');
}

function closeUserFormModal() {
  const modal = document.getElementById('user-form-modal');
  if (modal) modal.classList.add('hidden');
}

function handleUserFormSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('user-username').value.trim().toLowerCase();
  const fullName = document.getElementById('user-fullname').value.trim();
  const password = document.getElementById('user-password').value.trim();
  const role = document.getElementById('user-role').value;
  const mustChange = document.getElementById('user-must-change-pass').checked;

  if (ADMIN_STATE.users.some(u => u.username.toLowerCase() === username)) {
    showAdminToast('اسم المستخدم مسجل بالفعل!', 'error');
    return;
  }

  const newUser = {
    username,
    fullName,
    password,
    role,
    createdAt: new Date().toLocaleDateString('ar-EG'),
    isActive: true,
    mustChangePassword: mustChange
  };

  ADMIN_STATE.users.push(newUser);
  localStorage.setItem('nourii_admin_users', JSON.stringify(ADMIN_STATE.users));

  // مزامنة المستخدم إلى Google Drive
  if (ADMIN_STATE.settings.googleScriptUrl) {
    syncUserToGoogleDrive(newUser);
  }

  closeUserFormModal();
  renderUsersTable();
  updateStatCards();
  showAdminToast(`تمت إضافة المستخدم "${fullName}" بنجاح! سيُطلب منه تعيين كلمة مروره الخاصة عند أول دخول. 🔐`, 'success');
}

function deleteUser(username) {
  if (confirm(`هل أنت متأكد من حذف المستخدم "${username}"؟`)) {
    ADMIN_STATE.users = ADMIN_STATE.users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
    localStorage.setItem('nourii_admin_users', JSON.stringify(ADMIN_STATE.users));

    if (ADMIN_STATE.settings.googleScriptUrl) {
      deleteUserFromGoogleDrive(username);
    }

    renderUsersTable();
    updateStatCards();
    showAdminToast('تم حذف المستخدم بنجاح.', 'info');
  }
}

function syncUserToGoogleDrive(user) {
  const url = ADMIN_STATE.settings.googleScriptUrl;
  if (!url) {
    showAdminToast('تنبيه: تم حفظ المستخدم محلياً على هذا الجهاز فقط. Google Drive غير متصل بعد.', 'warning');
    return;
  }

  fetch(url, {
    method: 'POST',
    body: JSON.stringify({ action: 'saveUser', user: user })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'success') {
      showAdminToast(`تمت مزامنة المستخدم "${user.fullName || user.username}" بنجاح في Google Drive ليتمكن من الدخول من أي جهاز! ☁️✨`, 'success');
    } else {
      showAdminToast(`تنبيه: فشل الحفظ في Google Drive (${data.message || 'خطأ'}).`, 'warning');
    }
  })
  .catch(e => {
    console.warn('Drive user sync err:', e);
    showAdminToast('تنبيه: تعذر الاتصال بـ Google Drive. تأكد من صحة الرابط ليعمل الحساب من الأجهزة الأخرى.', 'warning');
  });
}

function deleteUserFromGoogleDrive(username) {
  const url = ADMIN_STATE.settings.googleScriptUrl;
  if (!url) return;

  fetch(url, {
    method: 'POST',
    body: JSON.stringify({ action: 'deleteUser', username: username })
  }).catch(e => console.warn('Drive user delete err:', e));
}

function fetchLiveUsersFromGoogleDrive(notify = false) {
  const url = (typeof NOURII_CONFIG !== 'undefined' && NOURII_CONFIG.googleScriptUrl) 
    || localStorage.getItem('nourii_google_script_url');
  if (!url) {
    if (notify) showAdminToast('يرجى ربط رابط Google Apps Script أولاً.', 'error');
    return;
  }

  if (notify) showAdminToast('جاري سحب أحدث قائمة مستخدمين من Google Drive...', 'info');

  fetch(`${url}?action=getUsers`)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return res.json();
    })
    .then(res => {
      if (res.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
        res.data.forEach(remoteUser => {
          const idx = ADMIN_STATE.users.findIndex(u => u.username.toLowerCase() === remoteUser.username.toLowerCase());
          if (idx > -1) {
            ADMIN_STATE.users[idx] = { ...ADMIN_STATE.users[idx], ...remoteUser };
          } else {
            ADMIN_STATE.users.push(remoteUser);
          }
        });
        localStorage.setItem('nourii_admin_users', JSON.stringify(ADMIN_STATE.users));
        renderUsersTable();
        updateStatCards();
        if (notify) showAdminToast(`تم جلب وتحديث ${res.data.length} مستخدم بنجاح من Google Drive! 👥`, 'success');
      } else if (notify) {
        showAdminToast('تم الاتصال بـ Drive ولكن لا يوجد مستخدمون إضافيون.', 'info');
      }
    })
    .catch(err => {
      console.warn('Fetch live users error:', err);
      if (notify) showAdminToast('تعذر الاتصال بـ Google Drive لجلب المستخدمين. تأكد من صحة الرابط.', 'error');
    });
}

function pushAllUsersToGoogleDrive() {
  const url = ADMIN_STATE.settings.googleScriptUrl;
  if (!url) {
    showAdminToast('يرجى ربط رابط Google Apps Script أولاً', 'error');
    return;
  }

  showAdminToast('جاري تصدير ومزامنة جميع المستخدمين إلى Google Drive...', 'info');

  const usersToPush = ADMIN_STATE.users.filter(u => u.username.toLowerCase() !== 'admin');
  if (usersToPush.length === 0) {
    showAdminToast('لا يوجد مستخدمون إضافيون للتصدير (المشرف admin مدمج تلقائياً).', 'info');
    return;
  }

  let count = 0;
  const pushNext = (idx) => {
    if (idx >= usersToPush.length) {
      if (count > 0) {
        showAdminToast(`تم تصدير وحفظ ${count} مستخدم بنجاح في Google Drive ليتمكنوا من الدخول من أي جهاز! ☁️🎉`, 'success');
        fetchLiveUsersFromGoogleDrive(false);
      } else {
        showAdminToast('تعذر تصدير المستخدمين. تأكد من أن الرابط سليم ومضبوط على Anyone.', 'error');
      }
      return;
    }
    fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveUser', user: usersToPush[idx] })
    })
    .then(res => res.json())
    .then(d => {
      if (d.status === 'success') count++;
      pushNext(idx + 1);
    })
    .catch(() => pushNext(idx + 1));
  };
  pushNext(0);
}

// ========================================================
// 3. GOOGLE DRIVE AS PRIMARY DATABASE (قاعدة البيانات الرئيسية)
// ========================================================
function loadSyncSettingsInputs() {
  const scriptInput = document.getElementById('google-script-url');
  const patInput = document.getElementById('github-pat-token');
  if (scriptInput) scriptInput.value = ADMIN_STATE.settings.googleScriptUrl || '';
  if (patInput) patInput.value = ADMIN_STATE.settings.githubToken || '';
}

function saveAndTestGoogleDrive() {
  const input = document.getElementById('google-script-url');
  if (!input) return;

  const url = input.value.trim();
  if (!url) {
    showAdminToast('يرجى إدخال رابط Google Apps Script Web App', 'error');
    return;
  }

  ADMIN_STATE.settings.googleScriptUrl = url;
  localStorage.setItem('nourii_google_script_url', url);
  showAdminToast('جاري الاتصال بـ Google Drive وتفعيله كقاعدة بيانات رئيسية...', 'info');

  fetch(`${url}?action=ping`)
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        showAdminToast('تم ربط وتفعيل Google Drive كقاعدة بيانات رئيسية بنجاح! 🟢', 'success');
        updateSyncStatusIndicator('Google Drive متصل (المصدر الرئيسي)', 'ok');
        // جلب المنتجات فوراً
        syncFromGoogleDrive();
      } else {
        showAdminToast('فشل التحقق: ' + (data.message || 'خطأ غير معروف'), 'error');
      }
    })
    .catch(err => {
      console.warn('Ping error:', err);
      showAdminToast('تم حفظ الرابط بنجاح! 🟢', 'success');
    });
}

function syncSilentlyFromGoogleDrive() {
  const url = ADMIN_STATE.settings.googleScriptUrl;
  if (!url) return;

  fetch(`${url}?action=getProducts`)
    .then(res => res.json())
    .then(res => {
      if (res.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
        ADMIN_STATE.products = res.data;
        saveProductsToStorage();
        renderProductsTable();
        updateStatCards();
        updateSyncStatusIndicator('Google Drive متصل (المصدر الرئيسي)', 'ok');
      }
    })
    .catch(err => console.warn('Silent drive sync:', err));
}

function syncFromGoogleDrive() {
  const url = ADMIN_STATE.settings.googleScriptUrl;
  if (!url) {
    showAdminToast('يرجى ربط رابط Google Apps Script أولاً', 'error');
    return;
  }

  showAdminToast('جاري سحب أحدث المنتجات من Google Sheets...', 'info');

  fetch(`${url}?action=getProducts`)
    .then(res => res.json())
    .then(res => {
      if (res.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
        ADMIN_STATE.products = res.data;
        saveProductsToStorage();
        renderProductsTable();
        updateStatCards();
        showAdminToast(`تم جلب ${res.data.length} منتج بنجاح من Google Drive! 📥`, 'success');
      } else {
        showAdminToast('تم الاتصال ولكن ورقة Products فارغة حالياً.', 'info');
      }
    })
    .catch(err => {
      console.error(err);
      showAdminToast('تعذر الاتصال بـ Google Apps Script، تأكد من نشر الرابط كـ Anyone.', 'error');
    });
}

function pushToGoogleDrive() {
  const url = ADMIN_STATE.settings.googleScriptUrl;
  if (!url) {
    showAdminToast('يرجى ربط رابط Google Apps Script أولاً', 'error');
    return;
  }

  showAdminToast('جاري تصدير ومزامنة جميع المنتجات إلى Google Sheet...', 'info');

  const prods = ADMIN_STATE.products;

  // المحاولة الأولى: تصدير سريع دفعة واحدة Bulk Import
  fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      action: 'bulkImportProducts',
      products: prods
    })
  })
  .then(res => res.json())
  .then(d => {
    if (d.status === 'success') {
      showAdminToast(`تم تصدير وحفظ كافة الـ ${prods.length} منتج بنجاح في Google Sheet! 📤✨`, 'success');
    } else {
      throw new Error(d.message || 'Bulk failed');
    }
  })
  .catch(err => {
    console.warn('Bulk import fallback to sequential:', err);
    let successCount = 0;
    const pushItem = (index) => {
      if (index >= prods.length) {
        if (successCount > 0) {
          showAdminToast(`تم تصدير ${successCount} منتج بنجاح إلى Google Drive! 📤`, 'success');
        } else {
          showAdminToast('تعذر التصدير. تأكد من ضبط إعداد النشر في Google Apps Script على Anyone (أي شخص).', 'error');
        }
        return;
      }

      fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          action: 'saveProduct',
          product: prods[index]
        })
      })
      .then(res => res.json())
      .then(d => {
        if (d.status === 'success') successCount++;
        pushItem(index + 1);
      })
      .catch(() => pushItem(index + 1));
    };
    pushItem(0);
  });
}

function syncProductToGoogleDrive(product) {
  const url = ADMIN_STATE.settings.googleScriptUrl;
  if (!url) return;

  fetch(url, {
    method: 'POST',
    body: JSON.stringify({ action: 'saveProduct', product: product })
  }).catch(e => console.warn('Drive sync background err:', e));
}

function deleteProductFromGoogleDrive(id) {
  const url = ADMIN_STATE.settings.googleScriptUrl;
  if (!url) return;

  fetch(url, {
    method: 'POST',
    body: JSON.stringify({ action: 'deleteProduct', id: id })
  }).catch(e => console.warn('Drive delete background err:', e));
}

function handleImageFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const url = ADMIN_STATE.settings.googleScriptUrl;
  if (!url) {
    showAdminToast('لرفع الصور إلى Drive، يرجى ربط رابط Google Apps Script أولاً في تبويب المزامنة.', 'error');
    return;
  }

  showAdminToast('جاري رفع الصورة إلى مجلد Google Drive...', 'info');

  const reader = new FileReader();
  reader.onload = function(evt) {
    const base64Data = evt.target.result;

    fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        action: 'uploadImage',
        base64Data: base64Data,
        filename: file.name,
        mimeType: file.type
      })
    })
    .then(res => res.json())
    .then(res => {
      if (res.status === 'success' && res.imageUrl) {
        document.getElementById('prod-image-url').value = res.imageUrl;
        showAdminToast('تم رفع الصورة بنجاح إلى Google Drive! 🖼️', 'success');
      } else {
        showAdminToast('فشل رفع الصورة: ' + (res.message || 'خطأ'), 'error');
      }
    })
    .catch(err => {
      console.error(err);
      showAdminToast('حدث خطأ أثناء رفع الصورة لـ Drive.', 'error');
    });
  };

  reader.readAsDataURL(file);
}

// ========================================================
// GITHUB SYNCHRONIZATION
// ========================================================
function generateProductsJsContent() {
  return `// ========================================================
// NOURII STORE - CATALOG DATA (قائمة المنتجات والأقسام)
// تم التحديث تلقائياً عبر لوحة تحكم Nourii Admin
// التاريخ: ${new Date().toLocaleString('ar-EG')}
// ========================================================

const CATEGORIES = ${JSON.stringify(ADMIN_STATE.categories, null, 2)};

const PRODUCTS = ${JSON.stringify(ADMIN_STATE.products, null, 2)};

const REVIEWS = ${typeof REVIEWS !== 'undefined' ? JSON.stringify(REVIEWS, null, 2) : '[]'};

const FAQS = ${typeof FAQS !== 'undefined' ? JSON.stringify(FAQS, null, 2) : '[]'};
`;
}

function generateConfigFileContent() {
  return `// ========================================================
// NOURII STORE - GLOBAL CONFIGURATION (الإعدادات وقاعدة البيانات)
// ========================================================

const NOURII_CONFIG = {
  // 🟢 رابط Google Apps Script Web App المتصل بـ Google Drive كقاعدة بيانات رئيسية
  googleScriptUrl: '${ADMIN_STATE.settings.googleScriptUrl || ''}',

  // مستودع وبيانات GitHub
  githubRepo: 'yaminakkady/nourii',
  githubBranch: 'main'
};
`;
}

function publishToGitHub() {
  const tokenInput = document.getElementById('github-pat-token');
  const token = tokenInput ? tokenInput.value.trim() : (ADMIN_STATE.settings.githubToken || '');

  saveProductsToStorage();

  if (token) {
    ADMIN_STATE.settings.githubToken = token;
    localStorage.setItem('nourii_github_pat', token);
    pushDirectlyViaGitHubApi(token);
  } else {
    downloadUpdatedProductsJs();
    showAdminToast('تم حفظ التعديلات محلياً! اضغط مرتين على sync_store.bat لنشرها إلى GitHub فوراً.', 'info');
  }
}

function pushDirectlyViaGitHubApi(token) {
  showAdminToast('جاري رفع التعديلات مباشرة إلى مستودع GitHub...', 'info');

  const content = generateProductsJsContent();
  const encodedContent = btoa(unescape(encodeURIComponent(content)));
  const repo = ADMIN_STATE.settings.githubRepo;
  const path = 'products.js';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  })
  .then(res => res.json())
  .then(fileData => {
    const sha = fileData.sha;

    return fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'feat(admin): update products catalog via Nourii Admin',
        content: encodedContent,
        sha: sha,
        branch: ADMIN_STATE.settings.githubBranch
      })
    });
  })
  .then(res => res.json())
  .then(commitData => {
    if (commitData.commit) {
      showAdminToast('🎉 تم تحديث ونشر المنتجات بنجاح على GitHub Pages!', 'success');
      updateSyncStatusIndicator('GitHub محدّث 🟢', 'ok');
    } else {
      showAdminToast('خطأ من GitHub: ' + (commitData.message || 'فشل النشر'), 'error');
    }
  })
  .catch(err => {
    console.error(err);
    showAdminToast('تعذر النشر عبر GitHub API، يمكنك استخدام sync_store.bat بدلاً منه.', 'error');
  });
}

function downloadUpdatedProductsJs() {
  const content = generateProductsJsContent();
  const blob = new Blob([content], { type: 'application/javascript;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'products.js';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function updateSyncStatusIndicator(text, type) {
  const el = document.getElementById('sync-status-indicator');
  const textEl = document.getElementById('sync-status-text');
  if (el && textEl) {
    textEl.innerText = text;
    el.classList.remove('hidden');
  }
}

// THEME & TOAST
function initTheme() {
  const theme = localStorage.getItem('nourii_theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('admin-theme-icon');
  if (icon) icon.className = theme === 'dark' ? 'fa-solid fa-sun text-yellow-400' : 'fa-solid fa-moon text-stone-600';
}

function toggleAdminTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('nourii_theme', next);
  const icon = document.getElementById('admin-theme-icon');
  if (icon) icon.className = next === 'dark' ? 'fa-solid fa-sun text-yellow-400' : 'fa-solid fa-moon text-stone-600';
}

function showAdminToast(msg, type = 'info') {
  let container = document.getElementById('admin-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'admin-toast-container';
    container.className = 'fixed top-6 inset-inline-end-6 z-50 flex flex-col gap-2.5 pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'admin-toast pointer-events-auto';

  let icon = 'fa-circle-info text-blue-500';
  if (type === 'success') icon = 'fa-circle-check text-emerald-500';
  if (type === 'error') icon = 'fa-circle-exclamation text-rose-500';

  toast.innerHTML = `
    <i class="fa-solid ${icon} text-lg"></i>
    <div class="text-xs font-bold flex-1">${msg}</div>
    <button onclick="this.parentElement.remove()" class="text-stone-400 hover:text-stone-600 text-xs">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
