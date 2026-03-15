document.addEventListener('DOMContentLoaded', async () => {
  Auth.init();
  initHamburgerMenu();
  if (Auth.supabase) {
    initAuthButtons();
    updateNavAuth();
    updateCartCount();
    Auth.onAuthChange(() => {
      updateNavAuth();
      updateCartCount();
    });
    if (!window.location.pathname.includes('login')) {
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
  const btnLogout = document.getElementById('btn-logout');

  if (btnLogin) {
    btnLogin.onclick = () => {
      const current = window.location.pathname.split('/').pop() || 'index.html';
      const params = new URLSearchParams();
      params.set('redirect', current);
      window.location.href = `login.html?${params.toString()}`;
    };
  }

  if (btnLogout) {
    btnLogout.onclick = () => Auth.logout();
  }
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

function updateNavAuth() {
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');
  const userInfo = document.getElementById('user-info');
  if (!btnLogin || !btnLogout) return;
  
  Auth.getUser().then(async user => {
    if (user) {
      btnLogin.style.display = 'none';
      btnLogout.style.display = 'inline-block';
      const profile = await Auth.getProfile(user.id);
      if (userInfo) userInfo.textContent = profile?.full_name?.trim() || user.email || '';
    } else {
      btnLogin.style.display = 'inline-block';
      btnLogout.style.display = 'none';
      if (userInfo) userInfo.textContent = '';
    }
  });
}

function updateCartCount() {
  const el = document.getElementById('cart-count');
  if (!el) return;
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const count = cart.reduce((acc, item) => acc + item.quantity, 0);
  el.textContent = count;
  el.style.display = count > 0 ? 'inline' : 'none';
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
