document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const searchInput = document.getElementById('search-input');
  const categorySortWrap = document.getElementById('category-sort-wrap');
  const sortTrigger = document.getElementById('sort-trigger');
  const sortDropdown = document.getElementById('sort-dropdown');
  const tagsContainer = document.getElementById('search-tags');
  const categoryScroll = document.getElementById('search-tags');
  const plecaLeft = document.querySelector('.category-bar-pleca--left');
  const plecaRight = document.querySelector('.category-bar-pleca--right');

  function positionSortDropdown() {
    if (!sortTrigger || !sortDropdown || !categorySortWrap || !categorySortWrap.classList.contains('dropdown-open')) return;
    const rect = sortTrigger.getBoundingClientRect();
    sortDropdown.style.left = rect.left + 'px';
    sortDropdown.style.top = (rect.bottom + 4) + 'px';
  }

  function closeSortDropdown() {
    if (categorySortWrap) categorySortWrap.classList.remove('dropdown-open');
    if (sortTrigger) sortTrigger.setAttribute('aria-expanded', 'false');
    window.removeEventListener('scroll', positionSortDropdown, true);
    window.removeEventListener('resize', positionSortDropdown);
  }

  function syncSortUI() {
    const isSearching = (currentSearch || '').trim().length > 0;
    if (categorySortWrap) {
      if (isSearching) {
        categorySortWrap.classList.add('visible');
        categorySortWrap.setAttribute('aria-hidden', 'false');
      } else {
        categorySortWrap.classList.remove('visible');
        categorySortWrap.setAttribute('aria-hidden', 'true');
        categorySortWrap.classList.remove('dropdown-open');
        if (sortTrigger) sortTrigger.setAttribute('aria-expanded', 'false');
      }
    }
    const value = currentSort || 'relevance';
    if (sortDropdown) {
      sortDropdown.querySelectorAll('.category-sort-option').forEach((opt) => {
        opt.setAttribute('aria-checked', opt.dataset.sort === value ? 'true' : 'false');
      });
    }
  }

  function updatePlecasVisibility() {
    if (!categoryScroll || !plecaLeft || !plecaRight) return;
    const hasOverflow = categoryScroll.scrollWidth > categoryScroll.clientWidth + 1;
    const canScrollLeft = categoryScroll.scrollLeft > 0;
    const canScrollRight = categoryScroll.scrollLeft < categoryScroll.scrollWidth - categoryScroll.clientWidth - 1;
    plecaLeft.classList.toggle('hidden', !hasOverflow || !canScrollLeft);
    plecaRight.classList.toggle('hidden', !hasOverflow || !canScrollRight);
  }

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

  function formatProductDescription(product) {
    let desc = '';
    if (product.description) desc += product.description + ' ';
    if (product.talla) desc += `Talla: ${product.talla}. `;
    if (product.colores) desc += `Colores: ${product.colores}. `;
    if (product.material) desc += `Material: ${product.material}. `;
    if (product.recomendaciones) desc += `Recomendaciones: ${product.recomendaciones}. `;
    return desc.trim() || 'Sin descripción.';
  }

  const updateCartButtons = () => {
    // Update grid buttons
    document.querySelectorAll('.btn-add-cart').forEach(btn => {
      const productId = btn.dataset.id;
      const inCart = Cart.get().some(item => item.id === productId);
      const outOfStock = btn.dataset.outOfStock === '1';
      btn.className = `btn ${inCart ? 'btn-outline in-cart' : 'btn-primary'} btn-add-cart`;
      if (btn.style.width) btn.style.width = '100%'; // for grid
      btn.dataset.inCart = inCart ? '1' : '0';
      btn.textContent = inCart ? 'En el carrito' : 'Añadir al carrito';
      btn.title = inCart ? 'Ir al carrito' : '';
      btn.disabled = outOfStock;
    });

    // Update modal button if open
    const modalBtn = document.getElementById('modal-add-cart');
    if (modalBtn && modalBtn.dataset.id) {
      const inCart = Cart.get().some(item => item.id === modalBtn.dataset.id);
      modalBtn.className = `btn ${inCart ? 'btn-outline in-cart' : 'btn-primary'} btn-block`;
      modalBtn.dataset.inCart = inCart ? '1' : '0';
      modalBtn.textContent = inCart ? 'En el carrito' : 'Añadir al carrito';
      modalBtn.title = inCart ? 'Ir al carrito' : '';
      // keep disabled only if out of stock
      modalBtn.disabled = modalBtn.dataset.outOfStock === '1';
    }
  };

  const loadProducts = async () => {
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
      const haystack = `${p.name || ''} ${formatProductDescription(p)} ${p.category || ''}`.toLowerCase();
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
          const inCart = Cart.get().some(item => item.id === p.id);
          const hasOptions = (p.colores && p.colores.trim()) || (p.talla && p.talla.trim());
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
          <p>${escapeHtml(formatProductDescription(p))}</p>
          <span class="price">${parseFloat(p.price).toFixed(2)} CUP</span>
          <button class="btn ${inCart ? 'btn-outline in-cart' : 'btn-primary'} btn-add-cart" style="margin-top:0.75rem;width:100%"
            data-id="${p.id}"
            data-name="${escapeAttr(p.name || '')}"
            data-price="${p.price}"
            data-image="${escapeAttr(p.image_url || '')}"
            data-out-of-stock="${(p.stock ?? 0) <= 0 ? '1' : '0'}"
            data-has-options="${hasOptions ? '1' : '0'}">
            ${inCart ? 'En el carrito' : 'Añadir al carrito'}
          </button>
        </div>
      </div>
    `;
        }
      )
      .join('');

    updateCartButtons();
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
      const inCart = Cart.get().some(item => item.id === id);
      if (inCart) {
        location.href = 'carrito.html';
        return;
      }
      if (btn.dataset.hasOptions === '1') {
        openProductModal(id);
        return;
      }
      const name = btn.dataset.name;
      const price = parseFloat(btn.dataset.price);
      const image = btn.dataset.image || '';
      (async () => {
        const notify = (msg, type = 'info', opts = {}) => (window.UI?.toast ? UI.toast(msg, type, opts) : null);
        const res = await Cart.addWithStock({ id, name, price, image_url: image }, 1, { notify });
        if (res.ok) notify('Producto añadido al <span class="toast-carrito-link">carrito</span>', 'success', { allowHtml: true });
      })();
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
    const modalColor = document.getElementById('modal-color');
    const modalTalla = document.getElementById('modal-talla');
    const modalMaterial = document.getElementById('modal-material');
    const modalRecomendaciones = document.getElementById('modal-recomendaciones');

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

    const carouselInner = document.getElementById('modal-carousel-inner');
    const indicators = document.getElementById('modal-carousel-indicators');
    carouselInner.innerHTML = allImages.map((url, i) => `<img src="${url}" alt="${product.name} - ${i + 1}">`).join('');
    indicators.innerHTML = allImages.map((_, i) => `<div class="indicator ${i === 0 ? 'active' : ''}" data-index="${i}"></div>`).join('');

    let currentIndex = 0;
    const totalImages = allImages.length;

    function updateCarousel() {
      carouselInner.style.transform = `translateX(-${currentIndex * 100}%)`;
      indicators.querySelectorAll('.indicator').forEach((ind, i) => {
        ind.classList.toggle('active', i === currentIndex);
      });
    }

    // Touch and mouse events for swipe
    let startX = 0;
    let isDragging = false;

    function startDrag(clientX) {
      startX = clientX;
      isDragging = true;
    }

    function moveDrag(clientX) {
      if (!isDragging) return;
      const diff = startX - clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0 && currentIndex < totalImages - 1) {
          currentIndex++;
        } else if (diff < 0 && currentIndex > 0) {
          currentIndex--;
        }
        updateCarousel();
        isDragging = false;
      }
    }

    function endDrag() {
      isDragging = false;
    }

    carouselInner.addEventListener('touchstart', (e) => startDrag(e.touches[0].clientX));
    carouselInner.addEventListener('touchmove', (e) => moveDrag(e.touches[0].clientX));
    carouselInner.addEventListener('touchend', endDrag);

    carouselInner.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startDrag(e.clientX);
    });
    carouselInner.addEventListener('mousemove', (e) => {
      if (isDragging) moveDrag(e.clientX);
    });
    carouselInner.addEventListener('mouseup', endDrag);
    carouselInner.addEventListener('mouseleave', endDrag);

    // Click on indicators
    indicators.addEventListener('click', (e) => {
      if (e.target.classList.contains('indicator')) {
        currentIndex = parseInt(e.target.dataset.index);
        updateCarousel();
      }
    });

    title.textContent = product.name;
    category.textContent = product.category || '';
    desc.textContent = product.description || 'Sin descripción.';
    if (modalMaterial) modalMaterial.textContent = product.material ? `Material: ${product.material}` : '';
    if (modalRecomendaciones) modalRecomendaciones.textContent = product.recomendaciones ? `Recomendaciones: ${product.recomendaciones}` : '';

    // Poblar colores
    if (modalColor) {
      modalColor.innerHTML = '<option value="">Seleccionar</option>';
      if (product.colores) {
        const colores = product.colores.split(',').map(c => c.trim()).filter(Boolean);
        colores.forEach(color => {
          const option = document.createElement('option');
          option.value = color;
          option.textContent = color;
          modalColor.appendChild(option);
        });
      }
    }

    // Poblar tallas
    if (modalTalla) {
      modalTalla.innerHTML = '<option value="">Seleccionar</option>';
      if (product.talla) {
        const tallas = product.talla.split(',').map(t => t.trim()).filter(Boolean);
        tallas.forEach(talla => {
          const option = document.createElement('option');
          option.value = talla;
          option.textContent = talla;
          modalTalla.appendChild(option);
        });
      }
    }

    priceEl.textContent = parseFloat(product.price).toFixed(2) + ' CUP';
    stockEl.textContent =
      (product.stock ?? 10) > 0 ? `En stock (${product.stock})` : 'Agotado';
    stockEl.className = 'product-modal-stock ' + ((product.stock ?? 10) > 0 ? '' : 'out-of-stock');

    addCartBtn.dataset.id = product.id;
    addCartBtn.dataset.name = product.name;
    addCartBtn.dataset.price = product.price;
    addCartBtn.dataset.image = mainUrl;
    const inCart = Cart.get().some(item => item.id === product.id);
    addCartBtn.dataset.inCart = inCart ? '1' : '0';
    addCartBtn.className = `btn ${inCart ? 'btn-outline in-cart' : 'btn-primary'} btn-block`;
    const outOfStock = (product.stock ?? 10) <= 0;
    addCartBtn.disabled = outOfStock;
    addCartBtn.textContent = inCart ? 'En el carrito' : 'Añadir al carrito';
    addCartBtn.title = inCart ? 'Ir al carrito' : '';
    addCartBtn.onclick = (ev) => {
      ev.preventDefault();
      const inCartNow = Cart.get().some(item => item.id === product.id);
      if (inCartNow) {
        location.href = 'carrito.html';
        return;
      }
      const selectedColor = modalColor ? modalColor.value : '';
      const selectedTalla = modalTalla ? modalTalla.value : '';
      const hasOptions = (product.colores && product.colores.trim()) || (product.talla && product.talla.trim());
      if (hasOptions && (!selectedColor || !selectedTalla)) {
        const notify = (msg, type = 'info', opts = {}) => (window.UI?.toast ? UI.toast(msg, type, opts) : null);
        notify('Por favor selecciona color y talla.', 'error');
        return;
      }
      (async () => {
        const notify = (msg, type = 'info', opts = {}) => (window.UI?.toast ? UI.toast(msg, type, opts) : null);
        const item = {
          id: product.id,
          name: product.name,
          price: parseFloat(product.price),
          image_url: mainUrl,
          options: hasOptions ? { color: selectedColor, talla: selectedTalla } : null
        };
        const res = await Cart.addWithStock(item, 1, { notify });
        if (res.ok) notify('Producto añadido al <span class="toast-carrito-link">carrito</span>', 'success', { allowHtml: true });
      })();
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

    // Recommendations
    const recommendationsEl = document.getElementById('modal-recommendations');
    const relatedProducts = allProducts
      .filter(p => p.id !== productId)
      .map(p => {
        let score = 0;
        if (p.category === product.category) score += 10;
        const nameWords = (p.name || '').toLowerCase().split(/\s+/);
        const productNameWords = (product.name || '').toLowerCase().split(/\s+/);
        const commonWords = nameWords.filter(w => productNameWords.includes(w)).length;
        score += commonWords * 2;
        return { ...p, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    recommendationsEl.innerHTML = relatedProducts
      .map(p => `
        <div class="recommendation-card" data-id="${p.id}">
          <img src="${p.image_url || 'https://placehold.co/400x500/1a1a2e/eaeaea?text=Producto'}" alt="${escapeHtml(p.name)}">
          <div class="info">
            <h4>${escapeHtml(p.name)}</h4>
            <span class="price">${parseFloat(p.price).toFixed(2)} CUP</span>
          </div>
        </div>
      `).join('');

    recommendationsEl.addEventListener('click', (e) => {
      const card = e.target.closest('.recommendation-card');
      if (card) openProductModal(card.dataset.id);
    });
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
      if (window.UI?.toast) UI.toast('Selecciona una calificación de 1 a 5 estrellas.', 'warning');
      return;
    }
    const user = await Auth.getUser();
    if (!user) {
      if (window.UI?.toast) UI.toast('Debes iniciar sesión para enviar una reseña.', 'warning');
      return;
    }
    const profile = await Auth.getProfile(user.id);
    if (!profile?.full_name?.trim() || !profile?.phone?.trim()) {
      if (window.UI?.toast) UI.toast('Completa tu perfil (nombre y teléfono) para poder publicar reseñas.', 'warning');
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
      if (window.UI?.toast) UI.toast('Error al enviar la reseña: ' + error.message, 'error');
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

  // Update buttons when cart changes
  window.addEventListener('cartUpdated', updateCartButtons);

  const suggestionsEl = document.getElementById('search-suggestions');

  function buildSuggestionCandidates() {
    const names = new Set();
    const categories = new Set();
    (allProducts || []).forEach((p) => {
      if (p.name && p.name.trim()) names.add(p.name.trim());
      const cat = (p.category || '').trim();
      if (cat) {
        cat.split(/[\s,]+/).filter(Boolean).forEach((c) => categories.add(c.trim()));
      }
    });
    return {
      names: Array.from(names),
      categories: Array.from(categories),
    };
  }

  function showSuggestions(query) {
    const q = (query || '').trim().toLowerCase();
    if (!suggestionsEl || !searchInput) return;
    if (q.length === 0) {
      suggestionsEl.innerHTML = '';
      suggestionsEl.setAttribute('aria-hidden', 'true');
      searchInput.setAttribute('aria-expanded', 'false');
      return;
    }
    const { names, categories } = buildSuggestionCandidates();
    const matches = [];
    names.forEach((name) => {
      if (name.toLowerCase().includes(q)) matches.push({ text: name, type: 'product' });
    });
    categories.forEach((cat) => {
      if (cat.toLowerCase().includes(q) && !matches.some((m) => m.text === cat && m.type === 'category')) {
        matches.push({ text: cat, type: 'category' });
      }
    });
    matches.sort((a, b) => {
      const aStarts = a.text.toLowerCase().startsWith(q) ? 1 : 0;
      const bStarts = b.text.toLowerCase().startsWith(q) ? 1 : 0;
      if (bStarts !== aStarts) return bStarts - aStarts;
      return a.text.localeCompare(b.text);
    });
    const limit = 8;
    const slice = matches.slice(0, limit);
    suggestionsEl.innerHTML = slice
      .map(
        (m) =>
          `<li role="option" class="search-suggestions__item ${m.type === 'category' ? 'search-suggestions__item--category' : ''}" data-suggestion="${escapeAttr(m.text)}">${escapeHtml(m.text)}${m.type === 'category' ? '<span class="search-suggestions__label">Categoría</span>' : ''}</li>`
      )
      .join('');
    suggestionsEl.setAttribute('aria-hidden', slice.length ? 'false' : 'true');
    searchInput.setAttribute('aria-expanded', slice.length ? 'true' : 'false');
  }

  function hideSuggestions() {
    if (suggestionsEl) {
      suggestionsEl.innerHTML = '';
      suggestionsEl.setAttribute('aria-hidden', 'true');
    }
    if (searchInput) searchInput.setAttribute('aria-expanded', 'false');
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value || '';
      syncSortUI();
      applyFiltersAndRender();
      showSuggestions(currentSearch);
    });
    searchInput.addEventListener('focus', () => showSuggestions(searchInput.value || ''));
    searchInput.addEventListener('blur', () => {
      setTimeout(hideSuggestions, 200);
    });
  }

  if (suggestionsEl && searchInput) {
    suggestionsEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const item = e.target.closest('[data-suggestion]');
      if (!item) return;
      const text = item.getAttribute('data-suggestion') || '';
      searchInput.value = text;
      searchInput.focus();
      currentSearch = text;
      syncSortUI();
      applyFiltersAndRender();
      hideSuggestions();
    });
  }

  if (sortTrigger) {
    sortTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const wrap = document.getElementById('category-sort-wrap');
      const wasOpen = wrap && wrap.classList.contains('dropdown-open');
      if (wrap) wrap.classList.toggle('dropdown-open');
      const open = wrap && wrap.classList.contains('dropdown-open');
      sortTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        positionSortDropdown();
        window.addEventListener('scroll', positionSortDropdown, true);
        window.addEventListener('resize', positionSortDropdown);
      } else {
        window.removeEventListener('scroll', positionSortDropdown, true);
        window.removeEventListener('resize', positionSortDropdown);
      }
    });
  }
  if (sortDropdown) {
    sortDropdown.addEventListener('click', (e) => e.stopPropagation());
    sortDropdown.querySelectorAll('.category-sort-option').forEach((opt) => {
      opt.addEventListener('click', (e) => {
        e.preventDefault();
        const value = opt.dataset.sort || 'relevance';
        currentSort = value;
        closeSortDropdown();
        window.removeEventListener('scroll', positionSortDropdown, true);
        window.removeEventListener('resize', positionSortDropdown);
        syncSortUI();
        applyFiltersAndRender();
      });
    });
  }
  document.addEventListener('click', (e) => {
    if (sortDropdown && sortDropdown.contains(e.target)) return;
    if (sortTrigger && sortTrigger.contains(e.target)) return;
    closeSortDropdown();
    window.removeEventListener('scroll', positionSortDropdown, true);
    window.removeEventListener('resize', positionSortDropdown);
  });
  if (categorySortWrap) {
    categorySortWrap.addEventListener('click', (e) => e.stopPropagation());
  }

  if (tagsContainer) {
    tagsContainer.addEventListener('click', (e) => {
      if (e.target.closest('.category-sort-wrap')) return;
      const btn = e.target.closest('.category-chip[data-category]');
      if (!btn) return;
      currentCategory = (btn.dataset.category || '').trim();
      tagsContainer.querySelectorAll('.category-chip[data-category]').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      applyFiltersAndRender();
    });
  }

  if (plecaLeft) {
    plecaLeft.addEventListener('click', () => {
      if (!categoryScroll) return;
      categoryScroll.scrollBy({ left: -200, behavior: 'smooth' });
    });
  }
  if (plecaRight) {
    plecaRight.addEventListener('click', () => {
      if (!categoryScroll) return;
      categoryScroll.scrollBy({ left: 200, behavior: 'smooth' });
    });
  }
  if (categoryScroll) {
    categoryScroll.addEventListener('scroll', updatePlecasVisibility);
    new ResizeObserver(updatePlecasVisibility).observe(categoryScroll);
  }

  syncSortUI();
  loadProducts();
  setTimeout(updatePlecasVisibility, 100);
});
