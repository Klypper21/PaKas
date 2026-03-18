document.addEventListener('DOMContentLoaded', async () => {
  Auth.init();
  initHamburgerMenu();
  initUserDropdown();
  initSearchRedirect();
  initNavbarScrollHide();
  initSwipeTabs();
  initMobileSwipeNav();
  initTopNavActiveLink();
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

function initTopNavActiveLink() {
  const nav = document.querySelector('.nav-links');
  if (!nav) return;

  function normalizePath(p) {
    const clean = (p || '').split('?')[0].split('#')[0];
    if (!clean) return '';
    if (clean.endsWith('/')) return 'index.html';
    return clean.split('/').pop() || clean;
  }

  const links = Array.from(nav.querySelectorAll('a.nav-link'));
  if (!links.length) return;
  const current = normalizePath(window.location.pathname);
  links.forEach((a) => {
    const isActive = normalizePath(a.getAttribute('href')) === current;
    a.classList.toggle('is-active', isActive);
    if (isActive) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

// UI: notificaciones y modales consistentes (evita alerts/confirm del sistema)
(() => {
  if (window.UI) return;

  function ensureToastRoot() {
    let root = document.getElementById('toast-root');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'toast-root';
    root.className = 'toast-root';
    document.body.appendChild(root);
    return root;
  }

  function toast(message, type = 'info', opts = {}) {
    const root = ensureToastRoot();
    const el = document.createElement('div');
    const ttl = typeof opts.durationMs === 'number' ? opts.durationMs : 2600;
    el.className = `toast toast--${type}`;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = `
      <div class="toast__body">${escapeHtml(message)}</div>
      <button type="button" class="toast__close" aria-label="Cerrar">&times;</button>
    `;
    root.appendChild(el);
    const close = () => {
      el.classList.add('toast--hide');
      setTimeout(() => el.remove(), 180);
    };
    el.querySelector('.toast__close')?.addEventListener('click', close);
    if (ttl > 0) setTimeout(close, ttl);
  }

  function ensureModalRoot() {
    let root = document.getElementById('ui-modal-root');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'ui-modal-root';
    document.body.appendChild(root);
    return root;
  }

  function openModal({ title = '', html = '', actions = [], closeOnBackdrop = true } = {}) {
    const root = ensureModalRoot();
    const wrap = document.createElement('div');
    wrap.className = 'modal ui-modal';
    wrap.innerHTML = `
      <div class="modal-backdrop ui-modal__backdrop"></div>
      <div class="modal-content ui-modal__content">
        ${title ? `<h2 class="ui-modal__title">${escapeHtml(title)}</h2>` : ''}
        <div class="ui-modal__body">${html}</div>
        <div class="ui-modal__actions"></div>
      </div>
    `;
    const backdrop = wrap.querySelector('.ui-modal__backdrop');
    const actionsWrap = wrap.querySelector('.ui-modal__actions');
    const close = () => {
      wrap.remove();
      document.body.style.overflow = '';
    };
    if (closeOnBackdrop && backdrop) backdrop.addEventListener('click', close);
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape') close();
      },
      { once: true }
    );

    (actions || []).forEach((a) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn ${a.variant === 'primary' ? 'btn-primary' : 'btn-outline'}`;
      btn.textContent = a.label || 'OK';
      btn.addEventListener('click', async () => {
        try {
          const res = await a.onClick?.({ close, wrap });
          if (a.closeOnClick !== false) close();
          return res;
        } catch (err) {
          console.error(err);
          toast('Ocurrió un error. Intenta de nuevo.', 'error');
        }
      });
      actionsWrap?.appendChild(btn);
    });

    root.appendChild(wrap);
    document.body.style.overflow = 'hidden';
    return { close, wrap };
  }

  function confirm({ title = 'Confirmar', message = '¿Seguro?', confirmText = 'Confirmar', cancelText = 'Cancelar' } = {}) {
    return new Promise((resolve) => {
      openModal({
        title,
        html: `<p class="ui-modal__text">${escapeHtml(message)}</p>`,
        actions: [
          { label: cancelText, variant: 'outline', onClick: () => resolve(false) },
          { label: confirmText, variant: 'primary', onClick: () => resolve(true) },
        ],
      });
    });
  }

  function promptReason({
    title = 'Motivo',
    message = 'Escribe el motivo.',
    placeholder = 'Escribe aquí…',
    confirmText = 'Enviar',
    cancelText = 'Cancelar',
    minLen = 3,
  } = {}) {
    return new Promise((resolve) => {
      const { wrap } = openModal({
        title,
        html: `
          <p class="ui-modal__text">${escapeHtml(message)}</p>
          <textarea class="ui-modal__textarea" id="ui-modal-textarea" rows="4" placeholder="${escapeAttr(
            placeholder
          )}"></textarea>
          <p class="ui-modal__error error-msg" style="margin-top:0.5rem"></p>
        `,
        actions: [
          { label: cancelText, variant: 'outline', onClick: () => resolve(null) },
          {
            label: confirmText,
            variant: 'primary',
            closeOnClick: false,
            onClick: ({ close }) => {
              const ta = wrap.querySelector('#ui-modal-textarea');
              const err = wrap.querySelector('.ui-modal__error');
              const value = (ta?.value || '').trim();
              if (value.length < minLen) {
                if (err) err.textContent = `Escribe al menos ${minLen} caracteres.`;
                return;
              }
              resolve(value);
              close();
            },
          },
        ],
      });

      setTimeout(() => wrap.querySelector('#ui-modal-textarea')?.focus(), 50);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }
  function escapeAttr(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.UI = { toast, openModal, confirm, promptReason };
})();

function initSwipeTabs() {
  // Soporta .auth-tabs (login) y .admin-tabs (admin) con botones dentro.
  const candidates = Array.from(document.querySelectorAll('.auth-tabs, .admin-tabs'));
  if (!candidates.length) return;

  const isMobile = () => window.matchMedia && window.matchMedia('(max-width: 768px)').matches;

  candidates.forEach((tabsWrap) => {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    tabsWrap.addEventListener(
      'touchstart',
      (e) => {
        if (!isMobile()) return;
        if (!e.touches || e.touches.length !== 1) return;
        tracking = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      },
      { passive: true }
    );

    tabsWrap.addEventListener(
      'touchend',
      (e) => {
        if (!tracking || !isMobile()) return;
        tracking = false;
        const t = e.changedTouches?.[0];
        if (!t) return;
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.2) return;

        const tabs = Array.from(tabsWrap.querySelectorAll('button, .tab')).filter((b) =>
          b.classList.contains('tab') || b.classList.contains('admin-tab') || b.tagName === 'BUTTON'
        );
        const activeIdx = Math.max(0, tabs.findIndex((b) => b.classList.contains('active')));
        const nextIdx = dx < 0 ? activeIdx + 1 : activeIdx - 1; // swipe izquierda -> siguiente
        const next = tabs[nextIdx];
        if (next) next.click();
      },
      { passive: true }
    );
  });
}

function initMobileSwipeNav() {
  const isMobile = () =>
    !!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);

  const nav = document.querySelector('.nav-bottom');
  if (!nav) return;

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function normalizePath(p) {
    const clean = (p || '').split('?')[0].split('#')[0];
    if (!clean) return '';
    if (clean.endsWith('/')) return 'index.html';
    return clean.split('/').pop() || clean;
  }

  function getNavLinks() {
    const links = Array.from(nav.querySelectorAll('a.nav-bottom-link'));
    return links.filter((a) => isVisible(a));
  }

  function getActiveIndex(links) {
    const current = normalizePath(window.location.pathname);
    const idx = links.findIndex((a) => normalizePath(a.getAttribute('href')) === current);
    return idx >= 0 ? idx : 0;
  }

  function updateActiveDot() {
    const links = Array.from(nav.querySelectorAll('a.nav-bottom-link'));
    const current = normalizePath(window.location.pathname);
    links.forEach((a) => {
      const isActive = normalizePath(a.getAttribute('href')) === current;
      a.classList.toggle('is-active', isActive);
      if (isActive) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function shouldIgnoreSwipeTarget(target) {
    if (!(target instanceof Element)) return false;
    // Evitar swipes cuando el usuario interactúa con controles o scroll horizontal interno
    return !!target.closest(
      'input, textarea, select, button, label, [role="button"], .category-scroll, .search-suggestions, .product-modal, .modal, .product-modal-content, .modal-content'
    );
  }

  let startX = 0;
  let startY = 0;
  let tracking = false;
  let startedOnIgnored = false;

  document.addEventListener(
    'touchstart',
    (e) => {
      if (!isMobile()) return;
      if (!e.touches || e.touches.length !== 1) return;
      tracking = true;
      startedOnIgnored = shouldIgnoreSwipeTarget(e.target);
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    },
    { passive: true }
  );

  document.addEventListener(
    'touchend',
    (e) => {
      if (!tracking || !isMobile()) return;
      tracking = false;
      if (startedOnIgnored) return;
      const t = e.changedTouches?.[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      // Umbrales: evitar que un scroll vertical dispare navegación
      if (Math.abs(dx) < 70) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.35) return;

      const links = getNavLinks();
      if (links.length < 2) return;
      const activeIdx = getActiveIndex(links);
      const nextIdx = dx < 0 ? activeIdx + 1 : activeIdx - 1; // swipe izq -> siguiente
      const next = links[nextIdx];
      const href = next?.getAttribute('href');
      if (!href) return;
      window.location.href = href;
    },
    { passive: true }
  );

  updateActiveDot();
  // Exponer un hook para cuando cambie login/perfil en el menú
  window.__updateMobileNavActiveDot = updateActiveDot;
}

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

  // Si no hay perfil completo, verificar metadatos del usuario
  const metaName = user.user_metadata?.full_name?.trim();
  const metaPhone = user.user_metadata?.phone?.trim();
  const metaAddress = user.user_metadata?.address?.trim();
  if (metaName && metaPhone) {
    // Crear perfil automáticamente con datos de metadatos
    await Auth.ensureProfile({ full_name: metaName, phone: metaPhone, address: metaAddress });
    return;
  }

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
    window.__updateMobileNavActiveDot?.();
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
  async getStock(productId) {
    if (!window.supabase) return null;
    if (!productId) return null;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();
      if (error) return null;
      return Number(data?.stock ?? 0);
    } catch (e) {
      console.error(e);
      return null;
    }
  },
  async addWithStock(product, quantity = 1, opts = {}) {
    const requested = Math.max(0, Number(quantity) || 0);
    if (!requested) return { ok: false, reason: 'invalid_quantity', added: 0 };
    if (!product?.id) return { ok: false, reason: 'missing_id', added: 0 };

    const notify = typeof opts.notify === 'function' ? opts.notify : null;
    const stock = await this.getStock(product.id);

    if (typeof stock === 'number') {
      if (stock <= 0) {
        notify?.('Este producto está agotado.', 'warning');
        return { ok: false, reason: 'out_of_stock', added: 0, stock };
      }
    }

    const cart = this.get();
    const idx = cart.findIndex((i) => i.id === product.id);
    const currentQty = idx >= 0 ? Number(cart[idx].quantity) || 0 : 0;
    const desired = currentQty + requested;

    const finalQty = typeof stock === 'number' ? Math.min(desired, stock) : desired;
    const added = Math.max(0, finalQty - currentQty);

    if (added <= 0) {
      if (typeof stock === 'number') {
        notify?.(`Solo quedan ${stock} en stock.`, 'warning');
      }
      return { ok: false, reason: 'capped', added: 0, stock, finalQty };
    }

    if (idx >= 0) cart[idx].quantity = finalQty;
    else cart.push({ ...product, quantity: finalQty });
    this.set(cart);

    if (typeof stock === 'number' && finalQty < desired) {
      notify?.(`Se ajustó la cantidad al stock disponible (${stock}).`, 'warning');
      return { ok: true, reason: 'added_capped', added, stock, finalQty };
    }
    return { ok: true, reason: 'added', added, stock, finalQty };
  },
  async setQuantityWithStock(productId, quantity, opts = {}) {
    const notify = typeof opts.notify === 'function' ? opts.notify : null;
    const q = Math.max(0, Math.floor(Number(quantity) || 0));
    const cart = this.get();
    const idx = cart.findIndex((i) => i.id === productId);
    if (idx < 0) return { ok: false, reason: 'not_found' };

    const stock = await this.getStock(productId);
    if (typeof stock === 'number' && stock <= 0) {
      // Si está agotado, lo sacamos del carrito
      const next = cart.filter((i) => i.id !== productId);
      this.set(next);
      notify?.('Se eliminó un producto del carrito por estar agotado.', 'warning');
      return { ok: true, reason: 'removed_out_of_stock', stock };
    }

    const finalQty = typeof stock === 'number' ? Math.min(q, stock) : q;
    if (finalQty <= 0) {
      const next = cart.filter((i) => i.id !== productId);
      this.set(next);
      return { ok: true, reason: 'removed', stock };
    }

    cart[idx].quantity = finalQty;
    this.set(cart);
    if (typeof stock === 'number' && finalQty < q) {
      notify?.(`Se ajustó la cantidad al stock disponible (${stock}).`, 'warning');
      return { ok: true, reason: 'set_capped', stock, finalQty };
    }
    return { ok: true, reason: 'set', stock, finalQty };
  },
  remove(productId) {
    this.set(this.get().filter(i => i.id !== productId));
  },
  clear() {
    this.set([]);
  }
};
