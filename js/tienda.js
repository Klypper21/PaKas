document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

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
    grid.innerHTML = available
      .map(
        (p) => `
      <div class="product-card product-card-clickable" data-id="${p.id}">
        <div class="img-wrap">
          <img src="${p.image_url || 'https://placehold.co/400x500/1a1a2e/eaeaea?text=Producto'}" alt="${escapeHtml(p.name)}">
        </div>
        <div class="info">
          <h3>${escapeHtml(p.name)}</h3>
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
    `
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

  let productsCache = [];
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

  loadProducts().then(async () => {
    if (supabase) {
      const { data } = await supabase.from('products').select('*');
      if (data) productsCache = data;
    }
  });
});
