document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-order');
  const tagsContainer = document.getElementById('search-tags');

  let allProducts = [];
  let productsCache = [];
  let purchasedProductIds = [];
  let currentSearch = '';
  let currentCategory = '';
  let currentSort = 'relevance';

  const loadPurchasedIds = () => {
    try {
      const raw = localStorage.getItem('purchasedProductIds');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        purchasedProductIds = parsed;
      }
    } catch {
      purchasedProductIds = [];
    }
  };

  loadPurchasedIds();

  const loadProducts = async () => {
    if (!window.supabase) {
      grid.innerHTML = '<p class="error">Configura Supabase en js/config.js</p>';
      return;
    }
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      grid.innerHTML = `<p class="error">Error: ${error.message}</p>`;
      return;
    }
    if (!data?.length) {
      grid.innerHTML = '<p>No hay productos. Ejecuta el script SQL en Supabase.</p>';
      return;
    }
    const available = data.filter((p) => (p.stock ?? 0) > 0);
    if (!available.length) {
      grid.innerHTML = '<p>No hay productos disponibles actualmente.</p>';
      return;
    }

    // Cargar valoraciones para mostrar rating medio en las tarjetas
    try {
      const { data: reviewsData } = await supabase
        .from('product_reviews')
        .select('product_id,rating');

      const ratingMap = {};
      (reviewsData || []).forEach((r) => {
        if (!r.product_id) return;
        if (!ratingMap[r.product_id]) {
          ratingMap[r.product_id] = { sum: 0, count: 0 };
        }
        ratingMap[r.product_id].sum += r.rating || 0;
        ratingMap[r.product_id].count += 1;
      });

      available.forEach((p) => {
        const stats = ratingMap[p.id] || { sum: 0, count: 0 };
        p.reviews_count = stats.count;
        p.avg_rating = stats.count ? stats.sum / stats.count : 0;
      });
    } catch {
      // Si falla, simplemente no añadimos rating a las tarjetas
    }

    allProducts = available;
    productsCache = data;
    applyFiltersAndRender();
  };

  const applyFiltersAndRender = () => {
    if (!allProducts.length) {
      grid.innerHTML = '<p>No hay productos para mostrar.</p>';
      return;
    }

    const term = currentSearch.trim().toLowerCase();
    const category = currentCategory.trim().toLowerCase();

    let filtered = allProducts.filter((p) => {
      if (category) {
        const productCategories = (p.category || '')
          .toLowerCase()
          .split(/[\s,]+/)
          .filter(Boolean);
        if (!productCategories.length || !productCategories.includes(category)) return false;
      }
      if (!term) return true;
      const haystack = `${p.name || ''} ${p.description || ''} ${p.category || ''}`.toLowerCase();
      return haystack.includes(term);
    });

    const purchasedSet = new Set(purchasedProductIds || []);

    const computeRelevanceScore = (p) => {
      let score = 0;
      if (purchasedSet.has(p.id)) score += 5;

      if (term) {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const category = (p.category || '').toLowerCase();
        if (name.includes(term)) score += 4;
        if (name.startsWith(term)) score += 1;
        if (category.includes(term)) score += 2;
        if (desc.includes(term)) score += 1;
      }

      return score;
    };

    const byCreatedDesc = (a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    };

    if (currentSort === 'relevance') {
      filtered = filtered
        .map((p) => ({ p, score: computeRelevanceScore(p) }))
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return byCreatedDesc(a.p, b.p);
        })
        .map((x) => x.p);
    } else if (currentSort === 'price_asc') {
      filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (currentSort === 'price_desc') {
      filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    } else if (currentSort === 'rating_desc') {
      filtered.sort((a, b) => {
        const ra = typeof a.avg_rating === 'number' ? a.avg_rating : 0;
        const rb = typeof b.avg_rating === 'number' ? b.avg_rating : 0;
        if (rb !== ra) return rb - ra;
        return byCreatedDesc(a, b);
      });
    } else if (currentSort === 'newest') {
      filtered.sort(byCreatedDesc);
    }

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    grid.innerHTML = filtered
      .map(
        (p) => {
          const created = p.created_at ? new Date(p.created_at).getTime() : 0;
          const isNew = created >= oneWeekAgo;
          return `
      <div class="product-card product-card-clickable" data-id="${p.id}">
        <div class="img-wrap">
          ${isNew ? '<span class="product-badge product-badge--new">New</span>' : ''}
          <img src="${p.image_url || 'https://placehold.co/400x500/1a1a2e/eaeaea?text=Producto'}" alt="${escapeHtml(p.name)}">
        </div>
        <div class="info">
          <h3>${escapeHtml(p.name)}</h3>
          <div class="product-card-rating">
            <span class="stars-display">${renderStars(p.avg_rating || 0)}</span>
            <span class="rating-count">${p.reviews_count || 0} ${p.reviews_count === 1 ? 'reseña' : 'reseñas'}</span>
          </div>
          <p>${escapeHtml(p.description || '')}</p>
          <span class="price">${parseFloat(p.price).toFixed(2)} CUP</span>
          <button class="btn btn-primary btn-add-cart" style="margin-top:0.75rem;width:100%"
            data-id="${p.id}"
            data-name="${escapeAttr(p.name || '')}"
            data-price="${p.price}"
            data-image="${escapeAttr(p.image_url || '')}">
            Añadir al carrito
          </button>
        </div>
      </div>
    `;
        }
      )
      .join('');
  };

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  function escapeAttr(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-add-cart');
    if (btn) {
      e.stopPropagation();
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      const price = parseFloat(btn.dataset.price);
      const image = btn.dataset.image || '';
      Cart.add({ id, name, price, image_url: image }, 1);
      if (typeof updateCartCount === 'function') updateCartCount();
      alert('Producto añadido al carrito');
      return;
    }
    const card = e.target.closest('.product-card-clickable');
    if (card) openProductModal(card.dataset.id);
  });

  async function openProductModal(productId) {
    const modal = document.getElementById('product-modal');
    const mainImg = document.getElementById('modal-main-img');
    const thumbs = document.getElementById('modal-thumbs');
    const title = document.getElementById('modal-title');
    const category = document.getElementById('modal-category');
    const ratingEl = document.getElementById('modal-rating');
    const desc = document.getElementById('modal-description');
    const priceEl = document.getElementById('modal-price');
    const stockEl = document.getElementById('modal-stock');
    const addCartBtn = document.getElementById('modal-add-cart');
    const reviewForm = document.getElementById('modal-review-form');
    const reviewLoginHint = document.getElementById('review-login-hint');
    const reviewFormFields = document.getElementById('review-form-fields');
    const reviewsList = document.getElementById('modal-reviews-list');

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    let product = productsCache.find((p) => p.id === productId);
    if (!product) {
      const { data } = await supabase.from('products').select('*').eq('id', productId).single();
      product = data;
      if (product) productsCache.push(product);
    }
    if (!product) {
      closeProductModal();
      return;
    }

    const mainUrl = product.image_url || 'https://placehold.co/400x500/1a1a2e/eaeaea?text=Producto';
    const extraImages = Array.isArray(product.extra_images)
      ? product.extra_images
      : typeof product.extra_images === 'string'
      ? (() => {
          try {
            return JSON.parse(product.extra_images) || [];
          } catch {
            return [];
          }
        })()
      : [];
    const allImages = [mainUrl, ...extraImages.filter((u) => u && u !== mainUrl)];

    mainImg.src = allImages[0];
    mainImg.alt = product.name;
    thumbs.innerHTML = allImages
      .map(
        (url, i) =>
          `<button class="thumb ${i === 0 ? 'active' : ''}" type="button" data-index="${i}"><img src="${url}" alt=""></button>`
      )
      .join('');
    thumbs.querySelectorAll('.thumb').forEach((t) => {
      t.onclick = () => {
        thumbs.querySelectorAll('.thumb').forEach((x) => x.classList.remove('active'));
        t.classList.add('active');
        mainImg.src = t.querySelector('img').src;
      };
    });

    title.textContent = product.name;
    category.textContent = product.category || '';
    desc.textContent = product.description || 'Sin descripción.';
    priceEl.textContent = parseFloat(product.price).toFixed(2) + ' CUP';
    stockEl.textContent =
      (product.stock ?? 10) > 0 ? `En stock (${product.stock})` : 'Agotado';
    stockEl.className = 'product-modal-stock ' + ((product.stock ?? 10) > 0 ? '' : 'out-of-stock');

    addCartBtn.dataset.id = product.id;
    addCartBtn.dataset.name = product.name;
    addCartBtn.dataset.price = product.price;
    addCartBtn.dataset.image = mainUrl;
    addCartBtn.disabled = (product.stock ?? 10) <= 0;
    addCartBtn.onclick = (ev) => {
      ev.preventDefault();
      Cart.add(
        { id: product.id, name: product.name, price: parseFloat(product.price), image_url: mainUrl },
        1
      );
      if (typeof updateCartCount === 'function') updateCartCount();
      alert('Producto añadido al carrito');
    };

    const { data: reviews } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    const avg =
      reviews?.length > 0
        ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length
        : 0;
    const rounded = Math.round(avg * 10) / 10;
    ratingEl.innerHTML = `
      <span class="stars-display" title="${rounded} de 5">
        ${renderStars(rounded)}
      </span>
      <span class="rating-count">${reviews?.length || 0} ${reviews?.length === 1 ? 'reseña' : 'reseñas'}</span>
    `;

    const user = Auth.supabase ? (await Auth.getUser()) : null;
    if (user) {
      reviewLoginHint.classList.add('hidden');
      reviewFormFields.classList.remove('hidden');
    } else {
      reviewLoginHint.classList.remove('hidden');
      reviewFormFields.classList.add('hidden');
    }

    resetReviewForm();
    const starsInput = document.getElementById('review-stars-input');
    if (starsInput) starsInput.onclick = handleStarClick;
    document.getElementById('review-submit').onclick = () => submitReview(productId);

    reviewsList.innerHTML = (reviews || [])
      .map(
        (r) => `
      <div class="review-item">
        <div class="review-header">
          <span class="review-author">${escapeHtml(r.user_name || 'Usuario')}</span>
          <span class="stars-display">${renderStars(r.rating)}</span>
          <span class="review-date">${formatDate(r.created_at)}</span>
        </div>
        ${r.comment ? `<p class="review-comment">${escapeHtml(r.comment)}</p>` : ''}
      </div>
    `
      )
      .join('');

    if (!reviews?.length) {
      reviewsList.innerHTML = '<p class="no-reviews">Aún no hay reseñas. ¡Sé el primero en opinar!</p>';
    }
  }

  function renderStars(avg) {
    const n = Math.round(avg);
    return '<span class="star filled">★</span>'.repeat(n) +
      '<span class="star">☆</span>'.repeat(5 - n);
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }

  let selectedRating = 0;
  function handleStarClick(e) {
    const span = e.target.closest('span[data-value]');
    if (!span) return;
    selectedRating = parseInt(span.dataset.value, 10);
    const container = document.getElementById('review-stars-input');
    container
      .querySelectorAll('span[data-value]')
      .forEach((s) =>
        s.classList.toggle('active', parseInt(s.dataset.value, 10) <= selectedRating)
      );
  }

  function resetReviewForm() {
    selectedRating = 0;
    const container = document.getElementById('review-stars-input');
    if (container) {
      container.querySelectorAll('span[data-value]').forEach((s) => s.classList.remove('active'));
    }
    const ta = document.getElementById('review-comment');
    if (ta) ta.value = '';
  }

  async function submitReview(productId) {
    if (!selectedRating) {
      alert('Selecciona una calificación de 1 a 5 estrellas.');
      return;
    }
    const user = await Auth.getUser();
    if (!user) {
      alert('Debes iniciar sesión para enviar una reseña.');
      return;
    }
    const profile = await Auth.getProfile(user.id);
    if (!profile?.full_name?.trim() || !profile?.phone?.trim()) {
      alert('Completa tu perfil (nombre y teléfono) para poder publicar reseñas.');
      return;
    }
    const user_name = profile.full_name.trim();
    const comment = (document.getElementById('review-comment').value || '').trim();
    const { error } = await supabase.from('product_reviews').upsert(
      {
        product_id: productId,
        user_id: user.id,
        user_name,
        rating: selectedRating,
        comment: comment || null,
      },
      { onConflict: 'product_id,user_id' }
    );
    if (error) {
      alert('Error al enviar la reseña: ' + error.message);
      return;
    }
    resetReviewForm();
    const card = document.querySelector(`.product-card-clickable[data-id="${productId}"]`);
    if (card) openProductModal(productId);
  }

  function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
    document.body.style.overflow = '';
  }

  document.querySelector('.product-modal-backdrop').onclick = closeProductModal;
  document.querySelector('.product-modal-close').onclick = closeProductModal;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProductModal();
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value || '';
      applyFiltersAndRender();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value || 'relevance';
      applyFiltersAndRender();
    });
  }

  if (tagsContainer) {
    tagsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.category-chip[data-category]');
      if (!btn) return;
      currentCategory = (btn.dataset.category || '').trim();
      tagsContainer.querySelectorAll('.category-chip').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      applyFiltersAndRender();
    });
  }

  loadProducts();
});
