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
  let activeProductId = null;

  const PRODUCT_QUERY_PARAM = 'producto';

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

  function getProductIdFromUrl() {
    const url = new URL(window.location.href);
    return (url.searchParams.get(PRODUCT_QUERY_PARAM) || '').trim();
  }

  function buildProductUrl(productId) {
    const url = new URL(window.location.href);
    url.searchParams.set(PRODUCT_QUERY_PARAM, productId);
    return url;
  }

  function clearProductUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete(PRODUCT_QUERY_PARAM);
    return url;
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', 'readonly');
    helper.style.position = 'fixed';
    helper.style.top = '-9999px';
    document.body.appendChild(helper);
    helper.select();
    document.execCommand('copy');
    document.body.removeChild(helper);
  }

  function formatProductDescription(product) {
    let desc = '';
    if (product.description) desc += product.description + ' ';
    if (product.talla) desc += `Talla: ${product.talla}. `;
    if (product.colores) desc += `Colores: ${product.colores}. `;
    if (product.material) desc += `Material: ${product.material}. `;
    if (product.recomendaciones) desc += `Recomendaciones: ${product.recomendaciones}. `;
    return desc.trim() || 'Sin descripcion.';
  }

  function hasRecicladoTag(product) {
    const categoryText = String(product?.category || '');
    return /\breciclado\b/i.test(categoryText);
  }

  function getCartIconMarkup() {
    return `
      <span class="btn-add-cart-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="20" r="1"></circle>
          <circle cx="18" cy="20" r="1"></circle>
          <path d="M3 4h2l2.2 10.2a1.8 1.8 0 0 0 1.76 1.4h8.94a1.8 1.8 0 0 0 1.76-1.4L22 7H7"></path>
        </svg>
      </span>
    `;
  }

  const updateCartButtons = () => {
    // Update grid buttons
    document.querySelectorAll('.btn-add-cart').forEach(btn => {
      const productId = btn.dataset.id;
      const inCart = Cart.get().some(item => item.id === productId);
      const outOfStock = btn.dataset.outOfStock === '1';
      const label = outOfStock ? 'Agotado' : inCart ? 'Ir al carrito' : 'Agregar al carrito';
      btn.className = `btn ${inCart ? 'btn-outline in-cart' : 'btn-primary'} btn-add-cart`;
      btn.dataset.inCart = inCart ? '1' : '0';
      btn.innerHTML = getCartIconMarkup();
      btn.setAttribute('aria-label', label);
      btn.title = label;
      btn.disabled = outOfStock;
    });

    // Update modal button if open
    const modalBtn = document.getElementById('modal-add-cart');
    if (modalBtn && modalBtn.dataset.id) {
      const inCart = Cart.get().some(item => item.id === modalBtn.dataset.id);
      modalBtn.className = `btn ${inCart ? 'btn-outline in-cart' : 'btn-primary'} btn-block`;
      modalBtn.dataset.inCart = inCart ? '1' : '0';
      modalBtn.textContent = inCart ? 'En el carrito' : 'Agregar al carrito';
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
      // Si falla, simplemente no anadimos rating a las tarjetas
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

    grid.innerHTML = filtered
      .map(
        (p) => {
          const inCart = Cart.get().some(item => item.id === p.id);
          const outOfStock = (p.stock ?? 0) <= 0;
          const hasOptions = (p.colores && p.colores.trim()) || (p.talla && p.talla.trim());
          const colorsPalette = window.ColorPalette?.renderColorsPaletteForProduct
            ? window.ColorPalette.renderColorsPaletteForProduct(p.colores || '')
            : '';
          const buttonLabel = outOfStock ? 'Agotado' : inCart ? 'Ir al carrito' : 'Agregar al carrito';
          return `
      <div class="product-card product-card-clickable" data-id="${p.id}">
        <div class="img-wrap">
          <img src="${p.image_url || 'https://placehold.co/400x500/1a1a2e/eaeaea?text=Producto'}" alt="${escapeHtml(p.name)}">
        </div>
        <div class="info">
          <h3>${escapeHtml(p.name)}</h3>
          <div class="product-card-rating">
            <span class="stars-display">${renderStars(p.avg_rating || 0)}</span>
            <span class="rating-count">${p.reviews_count || 0} ${p.reviews_count === 1 ? 'resena' : 'resenas'}</span>
          </div>
          <p>${escapeHtml(formatProductDescription(p))}</p>
          ${colorsPalette}
          <div class="product-card-footer">
            <span class="price">${parseFloat(p.price).toFixed(2)} CUP</span>
            <button
              type="button"
              class="btn ${inCart ? 'btn-outline in-cart' : 'btn-primary'} btn-add-cart"
              data-id="${p.id}"
              data-name="${escapeAttr(p.name || '')}"
              data-price="${p.price}"
              data-image="${escapeAttr(p.image_url || '')}"
              data-out-of-stock="${outOfStock ? '1' : '0'}"
              data-has-options="${hasOptions ? '1' : '0'}"
              aria-label="${buttonLabel}"
              title="${buttonLabel}"
              ${outOfStock ? 'disabled' : ''}>
              ${getCartIconMarkup()}
            </button>
          </div>
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
        if (res.ok) notify('Producto anadido al <span class="toast-carrito-link">carrito</span>', 'success', { allowHtml: true });
      })();
      return;
    }
    const card = e.target.closest('.product-card-clickable');
    if (card) openProductModal(card.dataset.id);
  });

  async function openProductModal(productId, options = {}) {
    const { syncHistory = true, historyMode = 'push' } = options;
    const modal = document.getElementById('product-modal');
    if (!modal) return;
    const modalContent = modal?.querySelector('.product-modal-content');
    const title = document.getElementById('modal-title');
    const category = document.getElementById('modal-category');
    const ratingEl = document.getElementById('modal-rating');
    const desc = document.getElementById('modal-description');
    const priceEl = document.getElementById('modal-price');
    const stockEl = document.getElementById('modal-stock');
    const addCartBtn = document.getElementById('modal-add-cart');
    const reviewLoginHint = document.getElementById('review-login-hint');
    const reviewFormFields = document.getElementById('review-form-fields');
    const reviewsList = document.getElementById('modal-reviews-list');
    const modalColor = document.getElementById('modal-color');
    const modalTalla = document.getElementById('modal-talla');
    const modalColorsPalette = document.getElementById('modal-colors-palette');
    const modalTallasPalette = document.getElementById('modal-tallas-palette');
    const modalMaterial = document.getElementById('modal-material');
    const modalRecomendaciones = document.getElementById('modal-recomendaciones');
    const shareBtn = document.getElementById('modal-share');
    const notify = (msg, type = 'info', opts = {}) => (window.UI?.toast ? UI.toast(msg, type, opts) : null);

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (modalContent) modalContent.scrollTop = 0;

    let product = productsCache.find((p) => p.id === productId);
    if (!product) {
      const { data } = await supabase.from('products').select('*').eq('id', productId).single();
      product = data;
      if (product && !productsCache.some((p) => p.id === product.id)) productsCache.push(product);
    }
    if (!product) {
      closeProductModal({ syncHistory: false });
      if (getProductIdFromUrl() === productId) {
        history.replaceState(history.state, '', clearProductUrl());
      }
      return;
    }

    activeProductId = product.id;
    modal.dataset.productId = product.id;
    modal.dataset.historyMode = syncHistory ? historyMode : 'route';
    if (syncHistory && getProductIdFromUrl() !== product.id) {
      const nextUrl = buildProductUrl(product.id);
      const historyMethod = historyMode === 'replace' ? 'replaceState' : 'pushState';
      history[historyMethod]({ productId: product.id }, '', nextUrl);
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
    const normalizeImageUrl = (value) => (typeof value === 'string' ? value.trim() : '');
    const seenImages = new Set();
    let allImages = [];
    const variationImageMap = {};

    [mainUrl, ...extraImages]
      .map(normalizeImageUrl)
      .filter(Boolean)
      .forEach((url) => {
        const normalized = url.toLowerCase();
        if (seenImages.has(normalized)) return;
        seenImages.add(normalized);
        allImages.push(url);
      });

    // Orden de galeria: principal + extras + variaciones (sin duplicados)
    try {
      const { data: variationsForGallery, error: variationsGalleryError } = await supabase
        .from('product_variations')
        .select('color,talla,image_url')
        .eq('parent_product_id', product.id);

      if (variationsGalleryError) {
        console.warn('[Galeria] No se pudieron cargar imagenes de variaciones:', variationsGalleryError.message);
      } else {
        (variationsForGallery || []).forEach((variation) => {
          const color = (variation.color || '').trim();
          const talla = (variation.talla || '').trim();
          const key = `${color}-${talla}`;
          const imageUrl = normalizeImageUrl(variation.image_url);

          if (!imageUrl) return;
          variationImageMap[key] = imageUrl;

          const normalized = imageUrl.toLowerCase();
          if (seenImages.has(normalized)) return;
          seenImages.add(normalized);
          allImages.push(imageUrl);
        });
      }
    } catch (variationGalleryError) {
      console.warn('[Galeria] Error al preparar imagenes de variaciones:', variationGalleryError);
    }

    if (!allImages.length) allImages = [mainUrl];
    const productUrl = buildProductUrl(product.id).toString();

    const carouselInner = document.getElementById('modal-carousel-inner');
    const indicators = document.getElementById('modal-carousel-indicators');
    carouselInner.innerHTML = allImages.map((url, i) => `<img src="${url}" alt="${escapeAttr(product.name)} - ${i + 1}">`).join('');
    indicators.innerHTML = allImages.map((_, i) => `<div class="indicator ${i === 0 ? 'active' : ''}" data-index="${i}"></div>`).join('');

    let currentIndex = 0;
    const totalImages = allImages.length;

    function updateCarousel() {
      carouselInner.style.transform = `translateX(-${currentIndex * 100}%)`;
      indicators.querySelectorAll('.indicator').forEach((ind, i) => {
        ind.classList.toggle('active', i === currentIndex);
      });
    }

    function switchToImage(imageUrl) {
      if (!imageUrl) {
        currentIndex = 0;
        updateCarousel();
        return;
      }

      const target = String(imageUrl).trim().toLowerCase();
      const imageIndex = allImages.findIndex((img) => String(img).trim().toLowerCase() === target);
      if (imageIndex === -1) {
        currentIndex = 0;
        updateCarousel();
        return;
      }

      currentIndex = imageIndex;
      updateCarousel();
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

    updateCarousel();

    carouselInner.ontouchstart = (e) => startDrag(e.touches[0].clientX);
    carouselInner.ontouchmove = (e) => moveDrag(e.touches[0].clientX);
    carouselInner.ontouchend = endDrag;

    carouselInner.onmousedown = (e) => {
      e.preventDefault();
      startDrag(e.clientX);
    };
    carouselInner.onmousemove = (e) => {
      if (isDragging) moveDrag(e.clientX);
    };
    carouselInner.onmouseup = endDrag;
    carouselInner.onmouseleave = endDrag;

    // Click on indicators
    indicators.onclick = (e) => {
      const indicator = e.target.closest('.indicator');
      if (indicator) {
        currentIndex = parseInt(indicator.dataset.index, 10);
        updateCarousel();
      }
    };

    title.textContent = product.name;
    if (category) {
      const showRecicladoTag = hasRecicladoTag(product);
      category.textContent = showRecicladoTag ? 'Reciclado' : '';
      category.hidden = !showRecicladoTag;
    }
    desc.textContent = product.description || 'Sin descripcion.';
    if (modalMaterial) modalMaterial.textContent = product.material ? `Material: ${product.material}` : '';
    if (modalRecomendaciones) modalRecomendaciones.textContent = product.recomendaciones ? `Recomendaciones: ${product.recomendaciones}` : '';
    if (shareBtn) {
      shareBtn.onclick = async () => {
        try {
          if (navigator.share) {
            await navigator.share({
              title: `${product.name} | PaKas`,
              text: 'Mira este producto en PaKas',
              url: productUrl,
            });
            return;
          }
          await copyToClipboard(productUrl);
          notify('Enlace copiado al portapapeles.', 'success');
        } catch (error) {
          if (error?.name === 'AbortError') return;
          try {
            await copyToClipboard(productUrl);
            notify('Enlace copiado al portapapeles.', 'success');
          } catch {
            window.prompt('Copia este enlace:', productUrl);
          }
        }
      };
    }

    function syncColorPaletteSelection() {
      if (!modalColorsPalette || !modalColor) return;
      const selectedColor = (modalColor.value || '').trim();
      modalColorsPalette.querySelectorAll('.modal-color-option').forEach((option) => {
        option.classList.toggle('selected', option.dataset.colorValue === selectedColor);
      });
    }

    function syncTallaPaletteSelection() {
      if (!modalTallasPalette || !modalTalla) return;
      const selectedTalla = (modalTalla.value || '').trim();
      modalTallasPalette.querySelectorAll('.modal-talla-option').forEach((option) => {
        option.classList.toggle('selected', option.dataset.tallaValue === selectedTalla);
      });
    }

    function setPaletteAvailability(container, optionSelector, datasetKey, availableValues = null) {
      if (!container) return;
      container.querySelectorAll(optionSelector).forEach((option) => {
        const optionValue = option.dataset[datasetKey];
        const isAvailable = !availableValues || availableValues.includes(optionValue);
        option.classList.toggle('disabled', !isAvailable);
        option.style.pointerEvents = isAvailable ? '' : 'none';
        option.style.cursor = isAvailable ? 'pointer' : 'not-allowed';
      });
    }

    // Funcion para actualizar tallas disponibles segun color seleccionado
    async function updateTallasForColor() {
      const color = modalColor ? (modalColor.value || '').trim() : '';
      if (!modalTalla) return;

      if (!color) {
        const allOptions = Array.from(modalTalla.querySelectorAll('option'));
        allOptions.forEach((option) => {
          option.disabled = false;
        });
        setPaletteAvailability(modalTallasPalette, '.modal-talla-option', 'tallaValue', null);
        syncTallaPaletteSelection();
        return;
      }

      const availableTallas = await Cart.getAvailableTallasForColor(product.id, color);
      const currentTalla = modalTalla.value;

      const allOptions = Array.from(modalTalla.querySelectorAll('option'));
      allOptions.forEach((option) => {
        option.disabled = !availableTallas.includes(option.value);
      });

      setPaletteAvailability(modalTallasPalette, '.modal-talla-option', 'tallaValue', availableTallas);

      if (currentTalla && !availableTallas.includes(currentTalla)) {
        modalTalla.value = '';
      }

      syncTallaPaletteSelection();
    }

    // Funcion para actualizar colores disponibles segun talla seleccionada
    async function updateColoresForTalla() {
      const talla = modalTalla ? (modalTalla.value || '').trim() : '';
      if (!modalColor) return;

      if (!talla) {
        const allOptions = Array.from(modalColor.querySelectorAll('option'));
        allOptions.forEach((option) => {
          option.disabled = false;
        });
        setPaletteAvailability(modalColorsPalette, '.modal-color-option', 'colorValue', null);
        syncColorPaletteSelection();
        return;
      }

      const availableColores = await Cart.getAvailableColoresForTalla(product.id, talla);
      const currentColor = modalColor.value;

      const allOptions = Array.from(modalColor.querySelectorAll('option'));
      allOptions.forEach((option) => {
        option.disabled = !availableColores.includes(option.value);
      });

      setPaletteAvailability(modalColorsPalette, '.modal-color-option', 'colorValue', availableColores);

      if (currentColor && !availableColores.includes(currentColor)) {
        modalColor.value = '';
      }

      syncColorPaletteSelection();
    }

    // Poblar colores
    if (modalColor) {
      modalColor.innerHTML = '';
      if (modalColorsPalette) modalColorsPalette.innerHTML = '';

      if (product.colores) {
        const DEFAULT_COLORS = [
          { name: 'Rojo', hex: '#EF4444' },
          { name: 'Naranja', hex: '#F97316' },
          { name: 'Amarillo', hex: '#FFD400' },
          { name: 'Verde', hex: '#22C55E' },
          { name: 'Azul', hex: '#3B82F6' },
          { name: 'Violeta', hex: '#A855F7' },
          { name: 'Rosa', hex: '#EC4899' },
          { name: 'Negro', hex: '#1F2937' },
          { name: 'Gris', hex: '#9CA3AF' },
          { name: 'Blanco', hex: '#FFFFFF' },
          { name: 'Beige', hex: '#D4AF9E' },
          { name: 'Marron', hex: '#92400E' },
        ];

        let colorsArray = [];
        try {
          const parsed = JSON.parse(product.colores);
          if (Array.isArray(parsed)) {
            colorsArray = parsed.map((item) => {
              if (typeof item === 'string') {
                const name = item.trim();
                const colorObj = DEFAULT_COLORS.find((c) => c.name.toLowerCase() === name.toLowerCase());
                return colorObj || { name, hex: '#999999' };
              }
              return item;
            });
          }
        } catch {
          const names = product.colores.split(',').map((c) => c.trim()).filter(Boolean);
          colorsArray = names.map((name) => {
            const colorObj = DEFAULT_COLORS.find((c) => c.name.toLowerCase() === name.toLowerCase());
            return colorObj || { name, hex: '#999999' };
          });
        }

        if (modalColorsPalette) {
          modalColorsPalette.innerHTML = colorsArray
            .map((color) => {
              const colorValue = color.name || color.hex;
              const colorName = color.name || color.hex;
              const colorHex = color.hex || '#999999';
              return `
                <div class="modal-color-option"
                     data-color-value="${colorValue}"
                     title="${colorName}">
                  <div class="modal-color-circle" style="background-color: ${colorHex};"></div>
                  <span>${colorName}</span>
                </div>
              `;
            })
            .join('');

          modalColorsPalette.querySelectorAll('.modal-color-option').forEach((option) => {
            option.onclick = async () => {
              if (option.classList.contains('disabled')) return;
              const colorValue = option.dataset.colorValue || '';
              modalColor.value = colorValue;
              syncColorPaletteSelection();
              await updateTallasForColor();
              await updateVariationPriceAndStock();
            };
          });
        }

        colorsArray.forEach((color) => {
          const option = document.createElement('option');
          option.value = color.name || color.hex;
          option.textContent = (color.name || color.hex || '').toUpperCase();
          modalColor.appendChild(option);
        });
      }

      syncColorPaletteSelection();
    }

    // Poblar tallas (paleta visual en mayusculas)
    if (modalTalla) {
      modalTalla.innerHTML = '';
      if (modalTallasPalette) modalTallasPalette.innerHTML = '';

      if (product.talla) {
        const tallas = product.talla.split(',').map((t) => t.trim()).filter(Boolean);

        tallas.forEach((talla) => {
          const option = document.createElement('option');
          option.value = talla;
          option.textContent = talla.toUpperCase();
          modalTalla.appendChild(option);
        });

        if (modalTallasPalette) {
          modalTallasPalette.innerHTML = tallas
            .map(
              (talla) => `
                <div class="modal-talla-option"
                     data-talla-value="${talla}"
                     title="${talla.toUpperCase()}">
                  <span>${talla.toUpperCase()}</span>
                </div>
              `
            )
            .join('');

          modalTallasPalette.querySelectorAll('.modal-talla-option').forEach((option) => {
            option.onclick = async () => {
              if (option.classList.contains('disabled')) return;
              const tallaValue = option.dataset.tallaValue || '';
              modalTalla.value = tallaValue;
              syncTallaPaletteSelection();
              await updateColoresForTalla();
              await updateVariationPriceAndStock();
            };
          });
        }
      }

      syncTallaPaletteSelection();
    }

    // Inicializar mostrando todas las opciones (sin filtrar)
    await updateTallasForColor();
    await updateColoresForTalla();

    // Funcion para marcar variaciones sin stock como deshabilitadas
    async function markOutOfStockVariations() {
      const outOfStock = await Cart.getOutOfStockVariations(product.id);

      if (outOfStock.colors && outOfStock.colors.length > 0) {
        const colorOptions = Array.from(modalColor?.querySelectorAll('option') || []);
        colorOptions.forEach((option) => {
          if (option.value && outOfStock.colors.includes(option.value)) {
            option.disabled = true;
          }
        });

        if (modalColorsPalette) {
          modalColorsPalette.querySelectorAll('.modal-color-option').forEach((option) => {
            if (outOfStock.colors.includes(option.dataset.colorValue)) {
              option.classList.add('disabled');
              option.style.pointerEvents = 'none';
              option.style.cursor = 'not-allowed';
            }
          });
        }
      }

      if (outOfStock.tallas && outOfStock.tallas.length > 0) {
        const tallaOptions = Array.from(modalTalla?.querySelectorAll('option') || []);
        tallaOptions.forEach((option) => {
          if (option.value && outOfStock.tallas.includes(option.value)) {
            option.disabled = true;
          }
        });

        if (modalTallasPalette) {
          modalTallasPalette.querySelectorAll('.modal-talla-option').forEach((option) => {
            if (outOfStock.tallas.includes(option.dataset.tallaValue)) {
              option.classList.add('disabled');
              option.style.pointerEvents = 'none';
              option.style.cursor = 'not-allowed';
            }
          });
        }
      }

      syncColorPaletteSelection();
      syncTallaPaletteSelection();
    }

    // Marcar variaciones sin stock
    await markOutOfStockVariations();

    // Funcion para actualizar precio y stock cuando cambia variacion
    async function updateVariationPriceAndStock() {
      const color = modalColor ? (modalColor.value || '').trim() : '';
      const talla = modalTalla ? (modalTalla.value || '').trim() : '';
      const hasOptions = (product.colores && product.colores.trim()) || (product.talla && product.talla.trim());
      
      // Validar que tanto color como talla esten seleccionados y tengan valor
      if (hasOptions && color && talla) {
        try {
          // Buscar la variacion especifica
          const variation = await Cart.getVariation(product.id, color, talla);
          if (variation) {
            priceEl.textContent = parseFloat(variation.price).toFixed(2) + ' CUP';
            const colorDisplay = color ? ` (${color}` : '';
            const tallaDisplay = talla ? `, ${talla})` : ')';
            stockEl.textContent = (variation.stock ?? 0) > 0 ? `En stock: ${variation.stock}${colorDisplay}${tallaDisplay}` : `Agotado${colorDisplay}${tallaDisplay}`;
            stockEl.className = 'product-modal-stock ' + ((variation.stock ?? 0) > 0 ? '' : 'out-of-stock');
            addCartBtn.disabled = (variation.stock ?? 0) <= 0;
            const variationKey = `${color}-${talla}`;
            switchToImage(variation.image_url || variationImageMap[variationKey] || null);
          } else {
            // Variacion no encontrada, volver a valores del producto
            priceEl.textContent = parseFloat(product.price).toFixed(2) + ' CUP';
            const colorDisplay = color ? ` (${color}` : '';
            const tallaDisplay = talla ? `, ${talla})` : ')';
            stockEl.textContent = (product.stock ?? 10) > 0 ? `En stock: ${product.stock}${colorDisplay}${tallaDisplay}` : `Agotado${colorDisplay}${tallaDisplay}`;
            stockEl.className = 'product-modal-stock ' + ((product.stock ?? 10) > 0 ? '' : 'out-of-stock');
            addCartBtn.disabled = (product.stock ?? 10) <= 0;
            switchToImage(null);
          }
        } catch (e) {
          console.error('Error fetching variation:', e);
          // En caso de error, mostrar valores del producto
          priceEl.textContent = parseFloat(product.price).toFixed(2) + ' CUP';
          const colorDisplay = color ? ` (${color}` : '';
          const tallaDisplay = talla ? `, ${talla})` : ')';
          stockEl.textContent = (product.stock ?? 10) > 0 ? `En stock: ${product.stock}${colorDisplay}${tallaDisplay}` : `Agotado${colorDisplay}${tallaDisplay}`;
          stockEl.className = 'product-modal-stock ' + ((product.stock ?? 10) > 0 ? '' : 'out-of-stock');
          addCartBtn.disabled = (product.stock ?? 10) <= 0;
          switchToImage(null);
        }
      } else {
        // Si no hay opciones o no estan seleccionadas, volver a los valores del producto
        priceEl.textContent = parseFloat(product.price).toFixed(2) + ' CUP';
        stockEl.textContent = (product.stock ?? 10) > 0 ? `En stock: ${product.stock}` : 'Agotado - Selecciona color y talla';
        stockEl.className = 'product-modal-stock ' + ((product.stock ?? 10) > 0 ? '' : 'out-of-stock');
        addCartBtn.disabled = (product.stock ?? 10) <= 0;
        switchToImage(null);
      }
    }

    priceEl.textContent = parseFloat(product.price).toFixed(2) + ' CUP';
    stockEl.textContent =
      (product.stock ?? 10) > 0 ? `En stock (${product.stock})` : 'Agotado';
    stockEl.className = 'product-modal-stock ' + ((product.stock ?? 10) > 0 ? '' : 'out-of-stock');

    // Agregar event listeners para fallback en los selects internos
    if (modalColor) {
      modalColor.onchange = async () => {
        await updateTallasForColor();
        syncColorPaletteSelection();
        await updateVariationPriceAndStock();
      };
    }
    if (modalTalla) {
      modalTalla.onchange = async () => {
        await updateColoresForTalla();
        syncTallaPaletteSelection();
        await updateVariationPriceAndStock();
      };
    }

    addCartBtn.dataset.id = product.id;
    addCartBtn.dataset.name = product.name;
    addCartBtn.dataset.price = product.price;
    addCartBtn.dataset.image = mainUrl;
    const inCart = Cart.get().some(item => item.id === product.id);
    addCartBtn.dataset.inCart = inCart ? '1' : '0';
    addCartBtn.className = `btn ${inCart ? 'btn-outline in-cart' : 'btn-primary'} btn-block`;
    const outOfStock = (product.stock ?? 10) <= 0;
    addCartBtn.disabled = outOfStock;
    addCartBtn.textContent = inCart ? 'En el carrito' : 'Agregar al carrito';
    addCartBtn.title = inCart ? 'Ir al carrito' : '';
    addCartBtn.onclick = (ev) => {
      ev.preventDefault();
      const inCartNow = Cart.get().some(item => item.id === product.id);
      if (inCartNow) {
        location.href = 'carrito.html';
        return;
      }
      const selectedColor = modalColor ? (modalColor.value || '').trim() : '';
      const selectedTalla = modalTalla ? (modalTalla.value || '').trim() : '';
      const hasOptions = (product.colores && product.colores.trim()) || (product.talla && product.talla.trim());
      if (hasOptions && (!selectedColor || !selectedTalla)) {
        const notify = (msg, type = 'info', opts = {}) => (window.UI?.toast ? UI.toast(msg, type, opts) : null);
        notify('Por favor selecciona color y talla.', 'error');
        return;
      }
      (async () => {
        const notify = (msg, type = 'info', opts = {}) => (window.UI?.toast ? UI.toast(msg, type, opts) : null);
        
        // Obtener datos de la variacion si existen
        let price = parseFloat(product.price);
        let sku = null;
        let variationStock = null;
        
        if (hasOptions && selectedColor && selectedTalla) {
          try {
            // Buscar la variacion especifica
            const variation = await Cart.getVariation(product.id, selectedColor, selectedTalla);
            if (variation) {
              price = parseFloat(variation.price) || price;
              sku = variation.sku;
              variationStock = Number(variation.stock) || 0;
            }
          } catch (e) {
            console.error('Error getting variation:', e);
          }
        }
        
        const item = {
          id: product.id,
          name: product.name,
          price: price,
          image_url: mainUrl,
          options: hasOptions ? { color: selectedColor, talla: selectedTalla } : null,
          sku: sku,
          variationStock: variationStock
        };
        const res = await Cart.addWithStock(item, 1, { notify });
        if (res.ok) notify('Producto anadido al <span class="toast-carrito-link">carrito</span>', 'success', { allowHtml: true });
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
      <span class="rating-count">${reviews?.length || 0} ${reviews?.length === 1 ? 'resena' : 'resenas'}</span>
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
      reviewsList.innerHTML = '<p class="no-reviews">Aun no hay resenas. Se el primero en opinar!</p>';
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

    recommendationsEl.onclick = (e) => {
      const card = e.target.closest('.recommendation-card');
      if (card) openProductModal(card.dataset.id);
    };
  }

  function renderStars(avg) {
    const n = Math.round(avg);
    return '<span class="star filled">&#9733;</span>'.repeat(n) +
      '<span class="star">&#9734;</span>'.repeat(5 - n);
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
      if (window.UI?.toast) UI.toast('Selecciona una calificacion de 1 a 5 estrellas.', 'warning');
      return;
    }
    const user = await Auth.getUser();
    if (!user) {
      if (window.UI?.toast) UI.toast('Debes iniciar sesion para enviar una resena.', 'warning');
      return;
    }
    const profile = await Auth.getProfile(user.id);
    if (!profile?.full_name?.trim() || !profile?.phone?.trim()) {
      if (window.UI?.toast) UI.toast('Completa tu perfil (nombre y telefono) para poder publicar resenas.', 'warning');
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
      if (window.UI?.toast) UI.toast('Error al enviar la resena: ' + error.message, 'error');
      return;
    }
    resetReviewForm();
    const card = document.querySelector(`.product-card-clickable[data-id="${productId}"]`);
    if (card) openProductModal(productId);
  }

  function closeProductModal(options = {}) {
    const { syncHistory = true } = options;
    const modal = document.getElementById('product-modal');
    if (!modal || modal.classList.contains('hidden')) return;

    const modalProductId = modal.dataset.productId || activeProductId || '';
    const historyMode = modal.dataset.historyMode || 'none';

    modal.classList.add('hidden');
    document.body.style.overflow = '';
    modal.dataset.productId = '';
    modal.dataset.historyMode = 'none';
    activeProductId = null;

    if (!syncHistory) return;

    const currentProductId = getProductIdFromUrl();
    if (!currentProductId) return;

    if (historyMode === 'push' && currentProductId === modalProductId) {
      history.back();
      return;
    }

    history.replaceState(history.state, '', clearProductUrl());
  }

  async function syncProductModalWithUrl() {
    const productId = getProductIdFromUrl();
    const modal = document.getElementById('product-modal');
    const isOpen = modal && !modal.classList.contains('hidden');

    if (productId) {
      if (!isOpen || activeProductId !== productId) {
        await openProductModal(productId, { syncHistory: false });
      }
      return;
    }

    if (isOpen) closeProductModal({ syncHistory: false });
  }

  document.querySelector('.product-modal-backdrop').onclick = closeProductModal;
  document.querySelector('.product-modal-close').onclick = closeProductModal;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProductModal();
  });
  window.addEventListener('popstate', () => {
    syncProductModalWithUrl();
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
          `<li role="option" class="search-suggestions__item ${m.type === 'category' ? 'search-suggestions__item--category' : ''}" data-suggestion="${escapeAttr(m.text)}">${escapeHtml(m.text)}${m.type === 'category' ? '<span class="search-suggestions__label">Categoria</span>' : ''}</li>`
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
  await loadProducts();
  await syncProductModalWithUrl();
  setTimeout(updatePlecasVisibility, 100);

  // PATCH para soporte de Variaciones: Exponer funciones globalmente
  window.openProductModal = openProductModal;
  window.closeProductModal = closeProductModal;
  window.productsCache = productsCache;
});


