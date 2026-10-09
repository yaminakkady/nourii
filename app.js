// ========================================================
// NOURII STORE - APPLICATION CONTROLLER (المحرك البرمجي)
// ========================================================

const APP_STATE = {
  currentCategory: 'all',
  searchQuery: '',
  sortBy: 'popular',
  favoritesOnly: false,
  cart: [],
  favorites: [],
  lang: 'ar',
  theme: 'light',
  promoCode: null,
  discountRate: 0,
  settings: {
    whatsappNumber: '201000000000', // رقم الواتساب الافتراضي - يمكن تغييره من الإعدادات
    storeName: 'Nourii',
    currencyAr: 'ج.م',
    currencyEn: 'EGP',
    instagram: 'nourii_crafts',
    facebook: 'NouriiCrafts',
    tiktok: 'nourii_crafts'
  }
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  loadStoredData();
  applyTheme(APP_STATE.theme);
  applyLanguage(APP_STATE.lang);
  renderCategories();
  renderProducts();
  renderReviews();
  renderFaqs();
  updateCartBadge();
  setupEventListeners();
  initGiveawaysEstimator();
});

// LOAD PERSISTENT DATA
function loadStoredData() {
  try {
    const savedCart = localStorage.getItem('nourii_cart');
    if (savedCart) APP_STATE.cart = JSON.parse(savedCart);

    const savedFavs = localStorage.getItem('nourii_favs');
    if (savedFavs) APP_STATE.favorites = JSON.parse(savedFavs);

    const savedTheme = localStorage.getItem('nourii_theme');
    if (savedTheme) APP_STATE.theme = savedTheme;

    const savedLang = localStorage.getItem('nourii_lang');
    if (savedLang) APP_STATE.lang = savedLang;

    const savedSettings = localStorage.getItem('nourii_settings');
    if (savedSettings) APP_STATE.settings = { ...APP_STATE.settings, ...JSON.parse(savedSettings) };

    // Live updated products from Admin / Google Drive
    const liveProds = localStorage.getItem('nourii_live_products') || localStorage.getItem('nourii_admin_products');
    if (liveProds) {
      try {
        const parsed = JSON.parse(liveProds);
        if (Array.isArray(parsed) && parsed.length > 0) {
          PRODUCTS.length = 0;
          parsed.forEach(p => PRODUCTS.push(p));
        }
      } catch (err) {
        console.warn('Error applying live products:', err);
      }
    }
  } catch (e) {
    console.error('Error loading stored data:', e);
  }
}

// SAVE DATA
function saveCart() {
  localStorage.setItem('nourii_cart', JSON.stringify(APP_STATE.cart));
  updateCartBadge();
}

function saveFavorites() {
  localStorage.setItem('nourii_favs', JSON.stringify(APP_STATE.favorites));
  updateFavBadge();
}

// THEME & LANGUAGE
function applyTheme(theme) {
  APP_STATE.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('nourii_theme', theme);

  const themeIcon = document.getElementById('theme-toggle-icon');
  if (themeIcon) {
    themeIcon.className = theme === 'dark' ? 'fa-solid fa-sun text-yellow-400' : 'fa-solid fa-moon text-stone-600';
  }
}

function toggleTheme() {
  applyTheme(APP_STATE.theme === 'dark' ? 'light' : 'dark');
  showToast(APP_STATE.lang === 'ar' ? 'تم تغيير المظهر بنجاح' : 'Theme updated', 'info');
}

function applyLanguage(lang) {
  APP_STATE.lang = lang;
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lang);
  localStorage.setItem('nourii_lang', lang);

  // Update translatable texts
  document.querySelectorAll('[data-i18n-ar]').forEach(el => {
    const text = lang === 'ar' ? el.getAttribute('data-i18n-ar') : el.getAttribute('data-i18n-en');
    if (text) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = text;
      } else {
        el.innerText = text;
      }
    }
  });

  const langLabel = document.getElementById('lang-toggle-text');
  if (langLabel) langLabel.innerText = lang === 'ar' ? 'English' : 'عربي';

  renderCategories();
  renderProducts();
}

function toggleLanguage() {
  applyLanguage(APP_STATE.lang === 'ar' ? 'en' : 'ar');
}

// RENDER CATEGORY BUTTONS
function renderCategories() {
  const container = document.getElementById('categories-container');
  if (!container) return;

  const isAr = APP_STATE.lang === 'ar';
  
  // "All" Category button
  let html = `
    <button onclick="selectCategory('all')" 
      class="category-chip px-5 py-2.5 rounded-full border text-sm font-bold flex items-center gap-2.5 transition-all ${
        APP_STATE.currentCategory === 'all' && !APP_STATE.favoritesOnly
          ? 'active'
          : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:border-pink-300'
      }">
      <i class="fa-solid fa-border-all text-xs"></i>
      <span>${isAr ? 'جميع الأقسام' : 'All Products'}</span>
      <span class="text-xs px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-700 font-normal">${PRODUCTS.length}</span>
    </button>
  `;

  CATEGORIES.forEach(cat => {
    const count = PRODUCTS.filter(p => p.categoryId === cat.id).length;
    const isActive = APP_STATE.currentCategory === cat.id && !APP_STATE.favoritesOnly;
    const name = isAr ? cat.nameAr : cat.nameEn;

    html += `
      <button onclick="selectCategory('${cat.id}')" 
        class="category-chip px-5 py-2.5 rounded-full border text-sm font-bold flex items-center gap-2.5 transition-all ${
          isActive
            ? 'active'
            : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:border-pink-300'
        }">
        <i class="fa-solid ${cat.icon} text-xs"></i>
        <span>${name}</span>
        <span class="text-xs px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-700 font-normal">${count}</span>
      </button>
    `;
  });

  container.innerHTML = html;
}

function selectCategory(catId) {
  APP_STATE.currentCategory = catId;
  APP_STATE.favoritesOnly = false;
  renderCategories();
  renderProducts();

  // Smooth scroll to catalog section if user clicked from hero or category showcase
  const catalogEl = document.getElementById('catalog-section');
  if (catalogEl) {
    catalogEl.scrollIntoView({ behavior: 'smooth' });
  }
}

// RENDER PRODUCTS
function renderProducts() {
  const container = document.getElementById('products-grid');
  const countEl = document.getElementById('products-count');
  if (!container) return;

  const isAr = APP_STATE.lang === 'ar';
  const currency = isAr ? APP_STATE.settings.currencyAr : APP_STATE.settings.currencyEn;

  // Filter products
  let filtered = PRODUCTS.filter(p => {
    // Category filter
    if (APP_STATE.favoritesOnly) {
      if (!APP_STATE.favorites.includes(p.id)) return false;
    } else if (APP_STATE.currentCategory !== 'all' && p.categoryId !== APP_STATE.currentCategory) {
      return false;
    }

    // Search query filter
    if (APP_STATE.searchQuery.trim() !== '') {
      const q = APP_STATE.searchQuery.toLowerCase().trim();
      const inNameAr = p.nameAr.toLowerCase().includes(q);
      const inNameEn = p.nameEn.toLowerCase().includes(q);
      const inDescAr = p.descriptionAr.toLowerCase().includes(q);
      const inDescEn = p.descriptionEn.toLowerCase().includes(q);
      if (!inNameAr && !inNameEn && !inDescAr && !inDescEn) return false;
    }

    return true;
  });

  // Sort
  if (APP_STATE.sortBy === 'price-asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (APP_STATE.sortBy === 'price-desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (APP_STATE.sortBy === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  if (countEl) {
    countEl.innerText = `${filtered.length} ${isAr ? 'منتج متاح' : 'products found'}`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center">
        <div class="w-20 h-20 mx-auto rounded-full bg-pink-50 dark:bg-stone-800 flex items-center justify-center text-pink-400 text-3xl mb-4">
          <i class="fa-solid fa-bag-shopping"></i>
        </div>
        <h3 class="text-xl font-bold mb-2">${isAr ? 'لم نعثر على منتجات مطابقة' : 'No products found'}</h3>
        <p class="text-stone-500 max-w-md mx-auto text-sm mb-6">${isAr ? 'جرب البحث بكلمات أخرى أو تصفح بقية أقسام نوري الجميلة.' : 'Try searching for something else or browse our categories.'}</p>
        <button onclick="resetFilters()" class="btn-primary px-6 py-2.5 text-sm">
          ${isAr ? 'عرض كل المنتجات' : 'View All Products'}
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(prod => {
    const isFav = APP_STATE.favorites.includes(prod.id);
    const name = isAr ? prod.nameAr : prod.nameEn;
    const badge = isAr ? prod.badgeAr : prod.badgeEn;
    const desc = isAr ? prod.descriptionAr : prod.descriptionEn;

    return `
      <div class="nourii-card flex flex-col overflow-hidden group">
        <!-- Image & Badges -->
        <div class="product-img-wrapper h-56 w-full cursor-pointer" onclick="openProductModal('${prod.id}')">
          <img src="${prod.image}" alt="${name}" class="w-full h-full object-cover object-center" loading="lazy">
          
          <!-- Category / Promotion Badge -->
          ${badge ? `
            <span class="absolute top-3.5 inset-inline-start-3.5 bg-white/95 dark:bg-stone-900/90 backdrop-blur-md text-pink-600 dark:text-pink-400 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
              ${badge}
            </span>
          ` : ''}

          <!-- Favorite Button -->
          <button onclick="event.stopPropagation(); toggleFavorite('${prod.id}')" 
            class="absolute top-3.5 inset-inline-end-3.5 w-9 h-9 rounded-full bg-white/95 dark:bg-stone-900/90 backdrop-blur-md flex items-center justify-center text-stone-400 hover:text-red-500 transition-colors shadow-sm">
            <i class="${isFav ? 'fa-solid fa-heart text-red-500' : 'fa-regular fa-heart'} text-sm"></i>
          </button>

          ${prod.isCustomizable ? `
            <span class="absolute bottom-3 inset-inline-start-3 bg-amber-500/90 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-md backdrop-blur-sm flex items-center gap-1">
              <i class="fa-solid fa-pen-fancy text-[10px]"></i>
              ${isAr ? 'قابل للتخصيص بالاسم' : 'Personalizable'}
            </span>
          ` : ''}
        </div>

        <!-- Content -->
        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between text-xs text-stone-400 mb-2">
              <span class="flex items-center gap-1 text-amber-500 font-bold">
                <i class="fa-solid fa-star text-[11px]"></i>
                ${prod.rating}
                <span class="text-stone-400 font-normal">(${prod.reviewsCount})</span>
              </span>
              <span class="text-stone-400 uppercase text-[11px] font-semibold">${prod.categoryId}</span>
            </div>

            <h3 onclick="openProductModal('${prod.id}')" class="font-bold text-base mb-1.5 line-clamp-1 hover:text-pink-600 dark:hover:text-pink-400 cursor-pointer transition-colors" title="${name}">
              ${name}
            </h3>

            <p class="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed mb-4">
              ${desc}
            </p>
          </div>

          <!-- Price & Action -->
          <div class="pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between gap-2">
            <div>
              <div class="flex items-baseline gap-2">
                <span class="text-lg font-black text-pink-600 dark:text-pink-400">${prod.price}</span>
                <span class="text-xs font-bold text-pink-600/80 dark:text-pink-400/80">${currency}</span>
                ${prod.originalPrice ? `
                  <span class="text-xs text-stone-400 line-through">${prod.originalPrice} ${currency}</span>
                ` : ''}
              </div>
            </div>

            <div class="flex items-center gap-1.5">
              <button onclick="openProductModal('${prod.id}')" 
                class="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 flex items-center justify-center transition-colors"
                title="${isAr ? 'معاينة سريعة' : 'Quick View'}">
                <i class="fa-solid fa-eye text-xs"></i>
              </button>
              <button onclick="quickAddToCart('${prod.id}')" 
                class="btn-primary h-9 px-3.5 rounded-full text-xs flex items-center gap-1.5">
                <i class="fa-solid fa-cart-plus"></i>
                <span class="hidden sm:inline">${isAr ? 'أضف' : 'Add'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function resetFilters() {
  APP_STATE.currentCategory = 'all';
  APP_STATE.searchQuery = '';
  APP_STATE.favoritesOnly = false;
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';
  renderCategories();
  renderProducts();
}

// FAVORITES
function toggleFavorite(id) {
  const index = APP_STATE.favorites.indexOf(id);
  const isAr = APP_STATE.lang === 'ar';
  if (index > -1) {
    APP_STATE.favorites.splice(index, 1);
    showToast(isAr ? 'تم الحذف من المفضلة' : 'Removed from wishlist', 'info');
  } else {
    APP_STATE.favorites.push(id);
    showToast(isAr ? 'تمت الإضافة إلى قائمة المفضلة ❤️' : 'Added to wishlist ❤️', 'success');
  }
  saveFavorites();
  renderProducts();
}

function toggleFavoritesView() {
  APP_STATE.favoritesOnly = !APP_STATE.favoritesOnly;
  renderCategories();
  renderProducts();
  const isAr = APP_STATE.lang === 'ar';
  if (APP_STATE.favoritesOnly) {
    showToast(isAr ? 'عرض المنتجات المفضلة فقط' : 'Showing favorite items only', 'info');
  }
}

function updateFavBadge() {
  const badge = document.getElementById('fav-count-badge');
  if (badge) {
    const count = APP_STATE.favorites.length;
    badge.innerText = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

// PRODUCT QUICK VIEW MODAL
let currentModalProduct = null;

function openProductModal(productId) {
  const prod = PRODUCTS.find(p => p.id === productId);
  if (!prod) return;

  currentModalProduct = prod;
  const modal = document.getElementById('product-modal');
  const modalContent = document.getElementById('product-modal-content');
  if (!modal || !modalContent) return;

  const isAr = APP_STATE.lang === 'ar';
  const currency = isAr ? APP_STATE.settings.currencyAr : APP_STATE.settings.currencyEn;
  const name = isAr ? prod.nameAr : prod.nameEn;
  const desc = isAr ? prod.descriptionAr : prod.descriptionEn;
  const badge = isAr ? prod.badgeAr : prod.badgeEn;
  const customLabel = isAr ? prod.customFieldLabelAr : prod.customFieldLabelEn;

  modalContent.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      <!-- Product Image -->
      <div class="rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 relative h-72 md:h-auto max-h-96">
        <img src="${prod.image}" alt="${name}" class="w-full h-full object-cover">
        ${badge ? `
          <span class="absolute top-4 inset-inline-start-4 bg-white/95 dark:bg-stone-900/90 text-pink-600 dark:text-pink-400 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
            ${badge}
          </span>
        ` : ''}
      </div>

      <!-- Product Details & Customization -->
      <div class="flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs uppercase font-bold text-pink-600 tracking-wider">${prod.categoryId}</span>
            <div class="flex items-center gap-1 text-amber-500 text-sm">
              <i class="fa-solid fa-star"></i>
              <span class="font-bold">${prod.rating}</span>
              <span class="text-stone-400 text-xs font-normal">(${prod.reviewsCount} ${isAr ? 'تقييم' : 'reviews'})</span>
            </div>
          </div>

          <h2 class="text-2xl font-black mb-3">${name}</h2>

          <div class="flex items-baseline gap-3 mb-4">
            <span class="text-3xl font-black text-pink-600">${prod.price}</span>
            <span class="text-base font-bold text-pink-600">${currency}</span>
            ${prod.originalPrice ? `
              <span class="text-sm text-stone-400 line-through">${prod.originalPrice} ${currency}</span>
              <span class="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">
                ${Math.round((1 - prod.price / prod.originalPrice) * 100)}% ${isAr ? 'خصم' : 'OFF'}
              </span>
            ` : ''}
          </div>

          <p class="text-stone-600 dark:text-stone-300 text-sm leading-relaxed mb-6">
            ${desc}
          </p>

          <!-- Customization Field if Applicable -->
          ${prod.isCustomizable ? `
            <div class="bg-pink-50/70 dark:bg-stone-800/60 p-4 rounded-xl border border-pink-100 dark:border-stone-700 mb-6">
              <label class="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1.5 flex items-center gap-1.5">
                <i class="fa-solid fa-wand-magic-sparkles text-pink-500"></i>
                <span>${customLabel || (isAr ? 'الاسم أو العبارة المراد كتابتها:' : 'Custom text / name:')}</span>
              </label>
              <input type="text" id="modal-custom-text" 
                placeholder="${isAr ? 'مثال: اسم نور أو مناسبة سبوع آدم...' : 'e.g., Name: Noor'}"
                class="w-full px-3.5 py-2.5 text-sm rounded-lg border border-pink-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-pink-400">
              <p class="text-[11px] text-stone-500 mt-1.5">
                ${isAr ? '✨ سيتم تنفيذ الطلب خصيصاً بالاسم والبيانات المكتوبة هنا.' : '✨ We will handcraft this item specifically with your provided details.'}
              </p>
            </div>
          ` : ''}

          <!-- Quantity Stepper -->
          <div class="flex items-center gap-4 mb-6">
            <span class="text-sm font-bold text-stone-700 dark:text-stone-300">${isAr ? 'الكمية:' : 'Quantity:'}</span>
            <div class="flex items-center border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800">
              <button onclick="changeModalQty(-1)" class="w-9 h-9 flex items-center justify-center text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-r-lg">-</button>
              <input type="number" id="modal-qty" value="1" min="1" max="99" class="w-12 text-center text-sm font-bold bg-transparent focus:outline-none" readonly>
              <button onclick="changeModalQty(1)" class="w-9 h-9 flex items-center justify-center text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-l-lg">+</button>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-stone-100 dark:border-stone-800">
          <button onclick="submitModalAddToCart()" class="btn-primary flex-1 py-3 px-6 text-sm flex items-center justify-center gap-2">
            <i class="fa-solid fa-cart-plus"></i>
            <span>${isAr ? 'إضافة إلى السلة' : 'Add to Cart'}</span>
          </button>
          <button onclick="directOrderOnWhatsApp('${prod.id}')" class="btn-whatsapp py-3 px-6 text-sm flex items-center justify-center gap-2">
            <i class="fa-brands fa-whatsapp text-lg"></i>
            <span>${isAr ? 'طلب فوري بالواتساب' : 'Direct WhatsApp'}</span>
          </button>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
  currentModalProduct = null;
}

function changeModalQty(delta) {
  const qtyInput = document.getElementById('modal-qty');
  if (!qtyInput) return;
  let val = parseInt(qtyInput.value) || 1;
  val = Math.max(1, val + delta);
  qtyInput.value = val;
}

function submitModalAddToCart() {
  if (!currentModalProduct) return;
  const qtyInput = document.getElementById('modal-qty');
  const customInput = document.getElementById('modal-custom-text');
  
  const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
  const customText = customInput ? customInput.value.trim() : '';

  addItemToCart(currentModalProduct, qty, customText);
  closeProductModal();
}

function quickAddToCart(productId) {
  const prod = PRODUCTS.find(p => p.id === productId);
  if (prod) {
    if (prod.isCustomizable) {
      openProductModal(productId);
    } else {
      addItemToCart(prod, 1, '');
    }
  }
}

// CART MANAGEMENT
function addItemToCart(product, qty, customText) {
  const existingIndex = APP_STATE.cart.findIndex(
    item => item.id === product.id && item.customText === customText
  );

  if (existingIndex > -1) {
    APP_STATE.cart[existingIndex].qty += qty;
  } else {
    APP_STATE.cart.push({
      id: product.id,
      nameAr: product.nameAr,
      nameEn: product.nameEn,
      price: product.price,
      image: product.image,
      qty: qty,
      customText: customText
    });
  }

  saveCart();
  const isAr = APP_STATE.lang === 'ar';
  showToast(
    isAr 
      ? `تمت إضافة "${product.nameAr}" إلى السلة بنجاح 🛍️` 
      : `Added "${product.nameEn}" to cart 🛍️`,
    'success'
  );

  // Pulse animation on cart buttons
  document.querySelectorAll('.floating-cart-btn, #nav-cart-btn').forEach(btn => {
    btn.classList.add('pulse-animation');
    setTimeout(() => btn.classList.remove('pulse-animation'), 400);
  });
}

function updateCartItemQty(index, delta) {
  if (APP_STATE.cart[index]) {
    APP_STATE.cart[index].qty += delta;
    if (APP_STATE.cart[index].qty <= 0) {
      APP_STATE.cart.splice(index, 1);
    }
    saveCart();
    renderCartDrawer();
  }
}

function removeCartItem(index) {
  if (APP_STATE.cart[index]) {
    APP_STATE.cart.splice(index, 1);
    saveCart();
    renderCartDrawer();
    const isAr = APP_STATE.lang === 'ar';
    showToast(isAr ? 'تم حذف العنصر من السلة' : 'Item removed from cart', 'info');
  }
}

function clearCart() {
  APP_STATE.cart = [];
  saveCart();
  renderCartDrawer();
}

function updateCartBadge() {
  const totalCount = APP_STATE.cart.reduce((sum, item) => sum + item.qty, 0);
  
  document.querySelectorAll('.cart-badge-count').forEach(el => {
    el.innerText = totalCount;
  });

  const floatingTotalEl = document.getElementById('floating-cart-total');
  if (floatingTotalEl) {
    const isAr = APP_STATE.lang === 'ar';
    const currency = isAr ? APP_STATE.settings.currencyAr : APP_STATE.settings.currencyEn;
    const subtotal = APP_STATE.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    floatingTotalEl.innerText = `${subtotal} ${currency}`;
  }
}

// CART DRAWER
function toggleCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  if (!drawer) return;

  const isHidden = drawer.classList.contains('hidden');
  if (isHidden) {
    renderCartDrawer();
    drawer.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  } else {
    drawer.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

function renderCartDrawer() {
  const itemsContainer = document.getElementById('cart-items-container');
  const subtotalEl = document.getElementById('cart-subtotal');
  const discountEl = document.getElementById('cart-discount');
  const totalEl = document.getElementById('cart-total');
  if (!itemsContainer) return;

  const isAr = APP_STATE.lang === 'ar';
  const currency = isAr ? APP_STATE.settings.currencyAr : APP_STATE.settings.currencyEn;

  if (APP_STATE.cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="py-20 text-center">
        <div class="w-20 h-20 mx-auto rounded-full bg-pink-50 dark:bg-stone-800 flex items-center justify-center text-pink-400 text-3xl mb-4">
          <i class="fa-solid fa-cart-shopping"></i>
        </div>
        <p class="font-bold text-lg mb-1">${isAr ? 'سلة المشتريات فارغة' : 'Your cart is empty'}</p>
        <p class="text-xs text-stone-500 mb-6">${isAr ? 'تصفح أقسام Nourii وأضف منتجاتك المفضلة الآن.' : 'Explore Nourii collections and add your favorite items.'}</p>
        <button onclick="toggleCartDrawer()" class="btn-primary px-6 py-2.5 text-xs">
          ${isAr ? 'تصفح المنتجات' : 'Start Shopping'}
        </button>
      </div>
    `;
    if (subtotalEl) subtotalEl.innerText = `0 ${currency}`;
    if (discountEl) discountEl.innerText = `0 ${currency}`;
    if (totalEl) totalEl.innerText = `0 ${currency}`;
    return;
  }

  let subtotal = 0;

  itemsContainer.innerHTML = APP_STATE.cart.map((item, index) => {
    const itemTotal = item.price * item.qty;
    subtotal += itemTotal;
    const name = isAr ? item.nameAr : item.nameEn;

    return `
      <div class="flex gap-4 p-4 rounded-xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-800/50 relative">
        <img src="${item.image}" alt="${name}" class="w-20 h-20 rounded-lg object-cover flex-shrink-0">
        
        <div class="flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between gap-2">
              <h4 class="font-bold text-sm leading-tight">${name}</h4>
              <button onclick="removeCartItem(${index})" class="text-stone-400 hover:text-red-500 transition-colors p-1 text-xs">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
            
            ${item.customText ? `
              <div class="text-[11px] text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-stone-700/50 px-2 py-0.5 rounded mt-1 inline-flex items-center gap-1">
                <i class="fa-solid fa-pen-nib text-[9px]"></i>
                <span>${item.customText}</span>
              </div>
            ` : ''}
          </div>

          <div class="flex items-center justify-between mt-3">
            <span class="text-sm font-black text-pink-600">${itemTotal} ${currency}</span>

            <!-- Quantity controls -->
            <div class="flex items-center border border-stone-200 dark:border-stone-700 rounded-md bg-stone-50 dark:bg-stone-800">
              <button onclick="updateCartItemQty(${index}, -1)" class="w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:bg-stone-200 dark:hover:bg-stone-700">-</button>
              <span class="w-8 text-center text-xs font-bold">${item.qty}</span>
              <button onclick="updateCartItemQty(${index}, 1)" class="w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:bg-stone-200 dark:hover:bg-stone-700">+</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const discountAmount = Math.round(subtotal * APP_STATE.discountRate);
  const finalTotal = subtotal - discountAmount;

  if (subtotalEl) subtotalEl.innerText = `${subtotal} ${currency}`;
  if (discountEl) discountEl.innerText = `-${discountAmount} ${currency}`;
  if (totalEl) totalEl.innerText = `${finalTotal} ${currency}`;
}

// PROMO CODE
function applyPromoCode() {
  const input = document.getElementById('promo-input');
  if (!input) return;

  const code = input.value.trim().toUpperCase();
  const isAr = APP_STATE.lang === 'ar';

  if (code === 'NOURII10' || code === 'NOUR10') {
    APP_STATE.promoCode = code;
    APP_STATE.discountRate = 0.10; // 10%
    showToast(isAr ? 'تم تطبيق كود الخصم 10% بنجاح! 🎉' : '10% discount promo applied! 🎉', 'success');
  } else if (code === 'WELCOME') {
    APP_STATE.promoCode = code;
    APP_STATE.discountRate = 0.05; // 5%
    showToast(isAr ? 'تم تطبيق كود الترحيب 5% بنجاح! 🎁' : '5% welcome promo applied! 🎁', 'success');
  } else if (code === '') {
    showToast(isAr ? 'يرجى كتابة كود الخصم أولاً' : 'Please enter promo code', 'error');
    return;
  } else {
    showToast(isAr ? 'كود الخصم غير صالح' : 'Invalid promo code', 'error');
    return;
  }

  renderCartDrawer();
}

// WHATSAPP CHECKOUT (مولد رسائل الواتساب الذكي)
function openCheckoutModal() {
  if (APP_STATE.cart.length === 0) {
    showToast(APP_STATE.lang === 'ar' ? 'السلة فارغة حالياً' : 'Cart is empty', 'error');
    return;
  }
  const modal = document.getElementById('checkout-modal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function closeCheckoutModal() {
  const modal = document.getElementById('checkout-modal');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
}

function executeWhatsAppOrder() {
  const nameInput = document.getElementById('order-cust-name');
  const phoneInput = document.getElementById('order-cust-phone');
  const cityInput = document.getElementById('order-cust-city');
  const addressInput = document.getElementById('order-cust-address');
  const notesInput = document.getElementById('order-cust-notes');

  const name = nameInput ? nameInput.value.trim() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const city = cityInput ? cityInput.value.trim() : '';
  const address = addressInput ? addressInput.value.trim() : '';
  const notes = notesInput ? notesInput.value.trim() : '';

  const isAr = APP_STATE.lang === 'ar';

  if (!name || !phone) {
    showToast(isAr ? 'يرجى إدخال الاسم ورقم الهاتف للمتابعة' : 'Please provide name and phone', 'error');
    return;
  }

  // Generate unique order ID
  const orderId = 'NR-' + Math.floor(1000 + Math.random() * 9000);
  const currency = isAr ? APP_STATE.settings.currencyAr : APP_STATE.settings.currencyEn;

  let subtotal = 0;
  let itemsListText = '';

  APP_STATE.cart.forEach((item, i) => {
    const itemTotal = item.price * item.qty;
    subtotal += itemTotal;
    const itemName = isAr ? item.nameAr : item.nameEn;
    itemsListText += `\n${i + 1}. *${itemName}*\n   - الكمية: ${item.qty}\n   - السعر: ${itemTotal} ${currency}`;
    if (item.customText) {
      itemsListText += `\n   - التخصيص المطلوب: "${item.customText}"`;
    }
  });

  const discountAmount = Math.round(subtotal * APP_STATE.discountRate);
  const finalTotal = subtotal - discountAmount;

  let message = `*🌸 طلب جديد من متجر Nourii 🌸*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📋 *رقم الطلب:* #${orderId}\n`;
  message += `📅 *التاريخ:* ${new Date().toLocaleDateString('ar-EG')}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📦 *المنتجات المطلوبة:*${itemsListText}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💰 *المجموع الفرعي:* ${subtotal} ${currency}\n`;
  if (APP_STATE.promoCode) {
    message += `🏷️ *كود الخصم:* ${APP_STATE.promoCode} (-${discountAmount} ${currency})\n`;
  }
  message += `💵 *الإجمالي النهائي المطلوب:* ${finalTotal} ${currency}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `👤 *بيانات العميل والتوصيل:*\n`;
  message += `▫️ *الاسم:* ${name}\n`;
  message += `▫️ *الهاتف:* ${phone}\n`;
  if (city) message += `▫️ *المحافظة / المدينة:* ${city}\n`;
  if (address) message += `▫️ *العنوان التفصيلي:* ${address}\n`;
  if (notes) message += `▫️ *ملاحظات إضافية:* ${notes}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `بانتظار تأكيدكم والبدء في تجهيز الطلب بكل حب! ✨`;

  const cleanPhone = APP_STATE.settings.whatsappNumber.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

  // Close modals
  closeCheckoutModal();
  toggleCartDrawer();

  // Clear cart after order
  clearCart();

  showToast(isAr ? 'جاري توجيهك إلى واتساب لإرسال الطلب...' : 'Redirecting to WhatsApp...', 'success');
  window.open(whatsappUrl, '_blank');
}

// DIRECT BUY FOR SINGLE PRODUCT VIA WHATSAPP
function directOrderOnWhatsApp(productId) {
  const prod = PRODUCTS.find(p => p.id === productId);
  if (!prod) return;

  const customInput = document.getElementById('modal-custom-text');
  const qtyInput = document.getElementById('modal-qty');
  const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
  const custom = customInput ? customInput.value.trim() : '';

  const isAr = APP_STATE.lang === 'ar';
  const currency = isAr ? APP_STATE.settings.currencyAr : APP_STATE.settings.currencyEn;
  const name = isAr ? prod.nameAr : prod.nameEn;
  const total = prod.price * qty;

  let msg = `*🌸 استفسار / طلب مباشر من متجر Nourii 🌸*\n\n`;
  msg += `أود الاستفسار وطلب هذا المنتج:\n`;
  msg += `▫️ *المنتج:* ${name}\n`;
  msg += `▫️ *الكمية:* ${qty}\n`;
  msg += `▫️ *السعر:* ${total} ${currency}\n`;
  if (custom) {
    msg += `▫️ *التخصيص والاسم المطلوب:* "${custom}"\n`;
  }
  msg += `\nيرجى إفادتي بإمكانية التنفيذ وموعد التسليم وشكراً!`;

  const cleanPhone = APP_STATE.settings.whatsappNumber.replace(/[^0-9]/g, '');
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  closeProductModal();
  window.open(url, '_blank');
}

// SMART GIVEAWAYS ESTIMATOR (صانع التوزيعات الذكي للمناسبات)
function initGiveawaysEstimator() {
  const eventSelect = document.getElementById('gw-event');
  const typeSelect = document.getElementById('gw-type');
  const qtySelect = document.getElementById('gw-qty');
  const calcBtn = document.getElementById('gw-calc-btn');

  if (calcBtn) {
    calcBtn.addEventListener('click', calculateGiveawayQuote);
  }

  // Auto calculate on change if already calculated
  [eventSelect, typeSelect, qtySelect].forEach(el => {
    if (el) el.addEventListener('change', calculateGiveawayQuote);
  });
}

function calculateGiveawayQuote() {
  const eventSelect = document.getElementById('gw-event');
  const typeSelect = document.getElementById('gw-type');
  const qtySelect = document.getElementById('gw-qty');
  const nameInput = document.getElementById('gw-name');
  const resultCard = document.getElementById('gw-result-card');
  const unitPriceEl = document.getElementById('gw-unit-price');
  const discountBadgeEl = document.getElementById('gw-discount-badge');
  const totalPriceEl = document.getElementById('gw-total-price');

  if (!eventSelect || !typeSelect || !qtySelect) return;

  const basePrices = {
    'choco-box': 25,     // علب شوكولاتة وكروت
    'mini-quran': 35,    // ميني مصحف مخمل وسبحة
    'concrete-paint': 30, // مجسمات كونكريت للتلوين
    'kids-cards': 22,    // كروت تعليمية وألعاب
    'wax-envelope': 20   // أظرف مع ختم شمع وكارت
  };

  const selectedType = typeSelect.value;
  const qty = parseInt(qtySelect.value) || 25;
  const basePrice = basePrices[selectedType] || 25;

  // Volume discounts
  let discount = 0;
  let discountLabel = 'سعر أساسي';
  if (qty >= 200) {
    discount = 0.20; // 20%
    discountLabel = 'خصم كميات كبرى 20%';
  } else if (qty >= 100) {
    discount = 0.15; // 15%
    discountLabel = 'خصم مناسبات 15%';
  } else if (qty >= 50) {
    discount = 0.10; // 10%
    discountLabel = 'خصم خاص 10%';
  }

  const discountedUnitPrice = Math.round(basePrice * (1 - discount));
  const total = discountedUnitPrice * qty;

  const isAr = APP_STATE.lang === 'ar';
  const currency = isAr ? APP_STATE.settings.currencyAr : APP_STATE.settings.currencyEn;

  if (unitPriceEl) unitPriceEl.innerText = `${discountedUnitPrice} ${currency}`;
  if (discountBadgeEl) discountBadgeEl.innerText = isAr ? discountLabel : `${discount * 100}% Discount`;
  if (totalPriceEl) totalPriceEl.innerText = `${total} ${currency}`;

  if (resultCard) {
    resultCard.classList.remove('hidden');
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function requestGiveawayWhatsApp() {
  const eventSelect = document.getElementById('gw-event');
  const typeSelect = document.getElementById('gw-type');
  const qtySelect = document.getElementById('gw-qty');
  const nameInput = document.getElementById('gw-name');

  const eventText = eventSelect ? eventSelect.options[eventSelect.selectedIndex].text : '';
  const typeText = typeSelect ? typeSelect.options[typeSelect.selectedIndex].text : '';
  const qty = qtySelect ? qtySelect.value : '50';
  const nameVal = nameInput ? nameInput.value.trim() : 'غير محدد';

  const totalPriceEl = document.getElementById('gw-total-price');
  const total = totalPriceEl ? totalPriceEl.innerText : '';

  let msg = `*🎉 استفسار عن طلب توزيعات مخصصة من Nourii 🎉*\n\n`;
  msg += `▫️ *نوع المناسبة:* ${eventText}\n`;
  msg += `▫️ *نوع التوزيعات:* ${typeText}\n`;
  msg += `▫️ *الكمية المطلوبة:* ${qty} قطعة\n`;
  msg += `▫️ *الاسم أو التاريخ المراد طباعته:* ${nameVal}\n`;
  msg += `▫️ *التقدير المالي في الموقع:* ${total}\n\n`;
  msg += `أرجو إفادتي بالأشكال المتاحة وموعد التسليم وشكراً!`;

  const cleanPhone = APP_STATE.settings.whatsappNumber.replace(/[^0-9]/g, '');
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// REVIEWS & FAQS RENDERING
function renderReviews() {
  const container = document.getElementById('reviews-container');
  if (!container) return;

  const isAr = APP_STATE.lang === 'ar';

  container.innerHTML = REVIEWS.map(r => {
    const name = isAr ? r.nameAr : r.nameEn;
    const city = isAr ? r.cityAr : r.cityEn;
    const comment = isAr ? r.commentAr : r.commentEn;

    return `
      <div class="nourii-card p-6 flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-1 text-amber-400 mb-3 text-sm">
            ${Array(r.rating).fill('<i class="fa-solid fa-star"></i>').join('')}
          </div>
          <p class="text-stone-600 dark:text-stone-300 text-sm leading-relaxed mb-6 italic">
            "${comment}"
          </p>
        </div>
        <div class="flex items-center gap-3 pt-4 border-t border-stone-100 dark:border-stone-800">
          <img src="${r.avatar}" alt="${name}" class="w-11 h-11 rounded-full object-cover border-2 border-pink-200">
          <div>
            <h4 class="font-bold text-sm">${name}</h4>
            <span class="text-xs text-stone-400">${city}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderFaqs() {
  const container = document.getElementById('faqs-container');
  if (!container) return;

  const isAr = APP_STATE.lang === 'ar';

  container.innerHTML = FAQS.map((faq, i) => {
    const q = isAr ? faq.qAr : faq.qEn;
    const a = isAr ? faq.aAr : faq.aEn;

    return `
      <div class="border border-stone-200 dark:border-stone-700/80 rounded-2xl overflow-hidden bg-white dark:bg-stone-800/40">
        <button onclick="toggleFaq(${i})" class="w-full p-5 text-start font-bold text-base flex items-center justify-between gap-4 hover:bg-stone-50 dark:hover:bg-stone-800/80 transition-colors">
          <span>${q}</span>
          <i id="faq-icon-${i}" class="fa-solid fa-chevron-down text-xs text-stone-400 transition-transform"></i>
        </button>
        <div id="faq-answer-${i}" class="hidden p-5 pt-0 text-sm text-stone-600 dark:text-stone-300 leading-relaxed border-t border-stone-100 dark:border-stone-700/50">
          ${a}
        </div>
      </div>
    `;
  }).join('');
}

function toggleFaq(index) {
  const ans = document.getElementById(`faq-answer-${index}`);
  const icon = document.getElementById(`faq-icon-${index}`);
  if (ans && icon) {
    const isHidden = ans.classList.contains('hidden');
    ans.classList.toggle('hidden', !isHidden);
    icon.style.transform = isHidden ? 'rotate(180deg)' : '';
  }
}

// STORE SETTINGS MODAL (لتعديل رقم الواتساب وروابط السوشيال بسهولة)
function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;

  const phoneInput = document.getElementById('set-whatsapp-phone');
  if (phoneInput) phoneInput.value = APP_STATE.settings.whatsappNumber;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
}

function saveStoreSettings() {
  const phoneInput = document.getElementById('set-whatsapp-phone');
  if (phoneInput && phoneInput.value.trim() !== '') {
    APP_STATE.settings.whatsappNumber = phoneInput.value.trim();
  }

  localStorage.setItem('nourii_settings', JSON.stringify(APP_STATE.settings));
  closeSettingsModal();
  showToast(APP_STATE.lang === 'ar' ? 'تم حفظ الإعدادات بنجاح!' : 'Settings saved successfully!', 'success');
}

// TOAST NOTIFICATIONS
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'nourii-toast';

  let icon = 'fa-circle-info text-blue-500';
  if (type === 'success') icon = 'fa-circle-check text-emerald-500';
  if (type === 'error') icon = 'fa-circle-exclamation text-rose-500';

  toast.innerHTML = `
    <i class="fa-solid ${icon} text-lg"></i>
    <div class="text-xs font-semibold flex-1 leading-snug">${message}</div>
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
  }, 3500);
}

// SETUP EVENT LISTENERS
function setupEventListeners() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      APP_STATE.searchQuery = e.target.value;
      renderProducts();
    });
  }

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      APP_STATE.sortBy = e.target.value;
      renderProducts();
    });
  }

  // Keyboard shortcut for closing modals with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProductModal();
      closeCheckoutModal();
      closeSettingsModal();
      const cartDrawer = document.getElementById('cart-drawer');
      if (cartDrawer && !cartDrawer.classList.contains('hidden')) {
        toggleCartDrawer();
      }
    }
  });
}
