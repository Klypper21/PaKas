document.addEventListener('DOMContentLoaded', async () => {
  Auth.init();
  initHamburgerMenu();
  initUserDropdown();
  initSearchRedirect();
  initNavbarScrollHide();
  if (Auth.supabase) {
    initAuthButtons();
    updateNavAuth();
    updateCartCount();
    Auth.onAuthChange(() => {
      updateNavAuth();
      updateCartCount();
    });
    if (!window.location.pathname.includes('login') && !window.location.pathname.includes('perfil.html')) {
      checkProfileComplete();
    }
    // Si está en la tienda (index) y es admin, redirigir al panel admin
    const path = window.location.pathname;
    const isTienda = path.endsWith('index.html') || path === '/' || path.endsWith('/');
    if (isTienda && (await Auth.getUser()) && (await Auth.isAdmin())) {
      location.replace('admin.html');
      return;
    }
  }
});

function initAuthButtons() {
  const btnLogin = document.getElementById('btn-login');
  if (btnLogin) {
    btnLogin.onclick = () => {
      const current = window.location.pathname.split('/').pop() || 'index.html';
      const params = new URLSearchParams();
      params.set('redirect', current);
      window.location.href = `login.html?${params.toString()}`;
    };
  }
  const navUserLogout = document.getElementById('nav-user-logout');
  if (navUserLogout) navUserLogout.onclick = () => Auth.logout();
}

async function checkProfileComplete() {
  const user = await Auth.getUser();
  if (!user) return;
  const profile = await Auth.getProfile(user.id);
  const hasName = profile?.full_name?.trim();
  const hasPhone = profile?.phone?.trim();
  if (hasName && hasPhone) return;
  showProfileModal(user, profile);
}

function showProfileModal(user, profile) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal profile-modal-backdrop';
  backdrop.id = 'profile-modal-backdrop';
  const name = (profile?.full_name || user.user_metadata?.full_name || '').trim() || '';
  backdrop.innerHTML = `
    <div class="modal-content auth-card" style="max-width: 400px;">
      <div class="auth-card-header">
        <h2>Completa tu perfil</h2>
        <p>Necesitamos tu nombre y teléfono para reseñas y pedidos.</p>
      </div>
      <form id="profile-complete-form" class="auth-form">
        <input type="text" name="full_name" placeholder="Nombre completo" required value="${name.replace(/"/g, '&quot;')}" autocomplete="name">
        <input type="tel" name="phone" placeholder="Teléfono" required value="${(profile?.phone || '').replace(/"/g, '&quot;')}" autocomplete="tel">
        <p id="profile-complete-error" class="error-msg"></p>
        <button type="submit" class="btn btn-primary btn-block">Guardar</button>
      </form>
    </div>
  `;
  backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  document.body.appendChild(backdrop);

  document.getElementById('profile-complete-form').onsubmit = async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('profile-complete-error');
    errEl.textContent = '';
    const form = e.target;
    const full_name = (form.full_name.value || '').trim();
    const phone = (form.phone.value || '').trim();
    const { error } = await Auth.ensureProfile({ full_name, phone });
    if (error) {
      errEl.textContent = error;
      return;
    }
    backdrop.remove();
    updateNavAuth();
  };
}

function initHamburgerMenu() {
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  if (!hamburger || !navLinks) return;
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
  });
}

function initUserDropdown() {
  const userBtn = document.getElementById('nav-user-btn');
  const userDropdown = document.getElementById('nav-user-dropdown');
  if (!userBtn || !userDropdown) return;
  userBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('is-open');
    userBtn.setAttribute('aria-expanded', userDropdown.classList.contains('is-open'));
  });
  document.addEventListener('click', () => {
    userDropdown.classList.remove('is-open');
    userBtn.setAttribute('aria-expanded', 'false');
  });
}

function initSearchRedirect() {
  const path = window.location.pathname;
  const isIndex = path.endsWith('index.html') || path === '/' || path.endsWith('/');
  const searchInput = document.getElementById('search-input');
  if (!searchInput || isIndex) return;
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = (searchInput.value || '').trim();
      location.href = q ? `index.html?q=${encodeURIComponent(q)}` : 'index.html';
    }
  });
}

function initNavbarScrollHide() {
  const headerBar = document.getElementById('header-bar');
  if (!headerBar) return;
  const HIDE_THRESHOLD = 160;
  const SHOW_THRESHOLD = 50;
  const SCROLL_UP_DELTA = 55;
  let lastScrollY = window.scrollY;
  let scrollYWhenScrolled = 0;
  let ticking = false;

  function update() {
    const scrollY = window.scrollY;
    const isScrolled = headerBar.classList.contains('header-bar--scrolled');
    if (isScrolled) {
      const nearTop = scrollY <= SHOW_THRESHOLD;
      const scrolledUpEnough = scrollY <= scrollYWhenScrolled - SCROLL_UP_DELTA;
      if (nearTop || scrolledUpEnough) {
        headerBar.classList.remove('header-bar--scrolled');
      }
    } else {
      if (scrollY > HIDE_THRESHOLD && scrollY > lastScrollY) {
        headerBar.classList.add('header-bar--scrolled');
        scrollYWhenScrolled = scrollY;
      }
    }
    lastScrollY = scrollY;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
}

function updateNavAuth() {
  const btnLogin = document.getElementById('btn-login');
  const navUserWrap = document.getElementById('nav-user-wrap');
  const navUserName = document.getElementById('nav-user-name');
  const bottomLogin = document.getElementById('nav-bottom-login');
  const bottomUser = document.getElementById('nav-bottom-user');

  Auth.getUser().then(async user => {
    if (user) {
      if (btnLogin) btnLogin.style.display = 'none';
      if (navUserWrap) navUserWrap.style.display = 'inline-block';
      const profile = await Auth.getProfile(user.id);
      const name = profile?.full_name?.trim() || user.email || 'Usuario';
      if (navUserName) navUserName.textContent = name.length > 18 ? name.slice(0, 16) + '…' : name;
      if (bottomLogin) bottomLogin.style.display = 'none';
      if (bottomUser) bottomUser.style.display = 'flex';
    } else {
      if (btnLogin) btnLogin.style.display = 'inline-block';
      if (navUserWrap) navUserWrap.style.display = 'none';
      if (bottomLogin) bottomLogin.style.display = 'flex';
      if (bottomUser) bottomUser.style.display = 'none';
    }
  });
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const count = cart.reduce((acc, item) => acc + item.quantity, 0);
  const topEl = document.getElementById('cart-count');
  const bottomEl = document.getElementById('cart-count-bottom');
  if (topEl) {
    topEl.textContent = count;
    topEl.style.display = count > 0 ? 'inline' : 'none';
  }
  if (bottomEl) {
    bottomEl.textContent = count;
    bottomEl.style.display = count > 0 ? 'flex' : 'none';
  }
}

// Helpers para carrito en localStorage
const Cart = {
  get() {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  },
  set(items) {
    localStorage.setItem('cart', JSON.stringify(items));
    updateCartCount?.();
  },
  add(product, quantity = 1) {
    const cart = this.get();
    const idx = cart.findIndex(i => i.id === product.id);
    if (idx >= 0) cart[idx].quantity += quantity;
    else cart.push({ ...product, quantity });
    this.set(cart);
  },
  remove(productId) {
    this.set(this.get().filter(i => i.id !== productId));
  },
  clear() {
    this.set([]);
  }
};
