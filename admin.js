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
    // Current user session
    const session = localStorage.getItem('nourii_admin_session');
    if (session) ADMIN_STATE.currentUser = JSON.parse(session);

    // Users list
    const storedUsers = localStorage.getItem('nourii_admin_users');
    if (storedUsers) {
      ADMIN_STATE.users = JSON.parse(storedUsers);
    } else {
      // Default users
      ADMIN_STATE.users = [
        {
          username: 'admin',
          password: 'nourii2026',
          fullName: 'مدير النظام (Super Admin)',
          role: 'admin',
          createdAt: new Date().toLocaleDateString('ar-EG'),
          isActive: true
        }
      ];
      localStorage.setItem('nourii_admin_users', JSON.stringify(ADMIN_STATE.users));
    }

    // Products (Custom or fallback from products.js)
    const storedProds = localStorage.getItem('nourii_admin_products');
    if (storedProds) {
      ADMIN_STATE.products = JSON.parse(storedProds);
    } else if (typeof PRODUCTS !== 'undefined') {
      ADMIN_STATE.products = JSON.parse(JSON.stringify(PRODUCTS));
      localStorage.setItem('nourii_admin_products', JSON.stringify(ADMIN_STATE.products));
    }

    // Categories
    if (typeof CATEGORIES !== 'undefined') {
      ADMIN_STATE.categories = CATEGORIES;
    }

    // Settings
    const scriptUrl = localStorage.getItem('nourii_google_script_url');
    if (scriptUrl) ADMIN_STATE.settings.googleScriptUrl = scriptUrl;

    const ghToken = localStorage.getItem('nourii_github_pat');
    if (ghToken) ADMIN_STATE.settings.githubToken = ghToken;

  } catch (e) {
    console.error('Error loading admin state:', e);
  }
}

// AUTHENTICATION
function checkAuthSession() {
  const loginScreen = document.getElementById('login-screen');
  const dashboardLayout = document.getElementById('dashboard-layout');

  if (ADMIN_STATE.currentUser) {
    if (loginScreen) loginScreen.classList.add('hidden');
    if (dashboardLayout) dashboardLayout.classList.remove('hidden');
    updateUserProfileDisplay();
    populateCategorySelectors();
    refreshAllData();
  } else {
    if (loginScreen) loginScreen.classList.remove('hidden');
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

  // Check in users list
  const user = ADMIN_STATE.users.find(u => u.username.toLowerCase() === username && u.password === password);

  if (user) {
    if (user.isActive === false) {
      showLoginError('هذا الحساب معطل حالياً من قبل الإدارة.');
      return;
    }

    ADMIN_STATE.currentUser = {
      username: user.username,
      fullName: user.fullName,
      role: user.role
    };

    localStorage.setItem('nourii_admin_session', JSON.stringify(ADMIN_STATE.currentUser));
    if (errorMsg) errorMsg.classList.add('hidden');
    
    showAdminToast(`مرحباً بك مجدداً، ${user.fullName} 👋`, 'success');
    checkAuthSession();
  } else {
    showLoginError('اسم المستخدم أو كلمة المرور غير صحيحة.');
  }
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

// TAB SWITCHING
function switchTab(tabId) {
  ADMIN_STATE.activeTab = tabId;

  // Tabs
  const tabs = ['overview', 'products', 'users', 'sync'];
  tabs.forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    const btn = document.getElementById(`tab-btn-${t}`);
    if (el) el.classList.toggle('hidden', t !== tabId);
    if (btn) btn.classList.toggle('active', t !== tabId);
  });

  // Headers
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
    subEl.innerText = 'التحكم في صلاحيات الوصول للمتجر';
    renderUsersTable();
  } else if (tabId === 'sync') {
    titleEl.innerText = 'إعدادات Google Drive & GitHub';
    subEl.innerText = 'ربط قاعدة بيانات Google Sheets والمزامنة مع المستودع';
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

// POPULATE CATEGORIES IN SELECTORS
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
// PRODUCTS MANAGEMENT (إدارة المنتجات)
// ========================================================
function renderProductsTable() {
  const tbody = document.getElementById('admin-products-table-body');
  if (!tbody) return;

  let filtered = ADMIN_STATE.products.filter(p => {
    // Category filter
    if (ADMIN_STATE.categoryFilter !== 'all' && p.categoryId !== ADMIN_STATE.categoryFilter) {
      return false;
    }
    // Search query
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

// ADD & EDIT PRODUCT MODAL
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

  showAdminToast(isEditing ? 'تم تعديل المنتج بنجاح! ✨' : 'تمت إضافة المنتج الجديد بنجاح! 🎉', 'success');

  // Trigger optional sync to Google Drive
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
  // Keep live store synchronized too
  localStorage.setItem('nourii_live_products', JSON.stringify(ADMIN_STATE.products));
}

// ========================================================
// USERS MANAGEMENT (إدارة المستخدمين)
// ========================================================
function renderUsersTable() {
  const tbody = document.getElementById('admin-users-table-body');
  if (!tbody) return;

  tbody.innerHTML = ADMIN_STATE.users.map((u, i) => {
    const isSuperAdmin = u.username.toLowerCase() === 'admin';

    return `
      <tr>
        <td class="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <i class="fa-solid fa-user-circle text-stone-400 text-lg"></i>
          <span>${u.username}</span>
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
          <span class="text-xs font-bold text-emerald-600 flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span> نشط
          </span>
        </td>
        <td class="text-center">
          ${isSuperAdmin ? `
            <span class="text-xs text-stone-400 italic">حساب رئيسي</span>
          ` : `
            <button onclick="deleteUser('${u.username}')" class="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors" title="حذف المستخدم">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

function openAddUserModal() {
  const modal = document.getElementById('user-form-modal');
  const form = document.getElementById('user-form');
  if (form) form.reset();
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
    isActive: true
  };

  ADMIN_STATE.users.push(newUser);
  localStorage.setItem('nourii_admin_users', JSON.stringify(ADMIN_STATE.users));

  closeUserFormModal();
  renderUsersTable();
  updateStatCards();
  showAdminToast(`تمت إضافة المستخدم "${fullName}" بنجاح! 🎉`, 'success');
}

function deleteUser(username) {
  if (confirm(`هل أنت متأكد من حذف المستخدم "${username}"؟`)) {
    ADMIN_STATE.users = ADMIN_STATE.users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
    localStorage.setItem('nourii_admin_users', JSON.stringify(ADMIN_STATE.users));
    renderUsersTable();
    updateStatCards();
    showAdminToast('تم حذف المستخدم بنجاح.', 'info');
  }
}

// ========================================================
// GOOGLE DRIVE & SHEETS INTEGRATION
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
  showAdminToast('جاري اختبار الاتصال بقاعدة بيانات Google Drive...', 'info');

  fetch(`${url}?action=ping`)
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        showAdminToast('تم الاتصال بنجاح بـ Google Drive و Sheets! 🟢', 'success');
        updateSyncStatusIndicator('Google Drive متصل', 'ok');
      } else {
        showAdminToast('فشل التحقق: ' + (data.message || 'خطأ غير معروف'), 'error');
      }
    })
    .catch(err => {
      console.warn('Ping error (CORS or network):', err);
      // Apps Script might have CORS redirects, show successful save
      showAdminToast('تم حفظ الرابط بنجاح! 🟢', 'success');
    });
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
        showAdminToast('لم يتم العثور على منتجات في ورقة Google Sheet.', 'info');
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

  showAdminToast('جاري تصدير المنتجات إلى Google Sheet...', 'info');

  // Push items sequentially
  let successCount = 0;
  const prods = ADMIN_STATE.products;

  const pushItem = (index) => {
    if (index >= prods.length) {
      showAdminToast(`تم تصدير ${successCount} منتج بنجاح إلى Google Drive! 📤`, 'success');
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

// UPLOAD IMAGE TO GOOGLE DRIVE
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
// GITHUB SYNCHRONIZATION (المزامنة مع GITHUB)
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

function publishToGitHub() {
  const tokenInput = document.getElementById('github-pat-token');
  const token = tokenInput ? tokenInput.value.trim() : (ADMIN_STATE.settings.githubToken || '');

  if (token) {
    ADMIN_STATE.settings.githubToken = token;
    localStorage.setItem('nourii_github_pat', token);
    pushDirectlyViaGitHubApi(token);
  } else {
    // If no token in browser, update local file & offer download or batch script
    saveProductsToStorage();
    downloadUpdatedProductsJs();
    showAdminToast('تم تجهيز التعديلات! يمكنك تشغيل sync_store.bat لرفعها إلى GitHub بنقرة واحدة.', 'info');
  }
}

function pushDirectlyViaGitHubApi(token) {
  showAdminToast('جاري رفع التعديلات مباشرة إلى مستودع GitHub...', 'info');

  const content = generateProductsJsContent();
  const encodedContent = btoa(unescape(encodeURIComponent(content)));
  const repo = ADMIN_STATE.settings.githubRepo;
  const path = 'products.js';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  // 1. Get current file sha
  fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  })
  .then(res => res.json())
  .then(fileData => {
    const sha = fileData.sha;

    // 2. Commit and push
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
    showAdminToast('تعذر النشر عبر GitHub API، تأكد من صحة التوكن والصلاحيات.', 'error');
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
