const DELIVERY_COST_CUP = 150;

document.addEventListener('DOMContentLoaded', async () => {
  const cartItems = document.getElementById('cart-items');
  const cartEmpty = document.getElementById('cart-empty');
  const cartSummary = document.getElementById('cart-summary');
  const btnCheckout = document.getElementById('btn-checkout');
  const modal = document.getElementById('checkout-modal');
  const modalSubtotal = document.getElementById('modal-subtotal');
  const modalTotal = document.getElementById('modal-total');
  const orderRef = document.getElementById('order-ref');
  const transferRef = document.getElementById('transfer-reference');
  const btnConfirm = document.getElementById('btn-confirm-order');
  const btnCancel = document.getElementById('btn-cancel-order');
  const deliveryCheckbox = document.getElementById('delivery-checkbox');
  const deliveryAddressWrap = document.getElementById('delivery-address-wrap');
  const deliveryAddress = document.getElementById('delivery-address');
  const pickupInfo = document.getElementById('pickup-info');

  const notify = (msg, type = 'info') => {
    if (window.UI?.toast) UI.toast(msg, type);
    else console.log(type.toUpperCase() + ':', msg);
  };

  async function pruneOutOfStockCartItems() {
    const cart = Cart.get();
    if (!cart.length) return { removedCount: 0 };
    if (!window.supabase) return { removedCount: 0 };

    const ids = Array.from(new Set(cart.map((i) => i.id).filter(Boolean)));
    if (!ids.length) return { removedCount: 0 };

    const { data, error } = await supabase
      .from('products')
      .select('id,name,stock')
      .in('id', ids);

    if (error) {
      console.error(error);
      return { removedCount: 0 };
    }

    const map = new Map((data || []).map((p) => [String(p.id), p]));
    const keep = [];
    const removed = [];

    for (const item of cart) {
      const p = map.get(String(item.id));
      const stock = Number(p?.stock ?? 0);
      if (!p || stock <= 0) removed.push(item);
      else keep.push(item);
    }

    if (removed.length) {
      Cart.set(keep);
      const names = removed
        .map((r) => (r?.name || '').trim())
        .filter(Boolean)
        .slice(0, 3);
      const suffix = removed.length > names.length ? ` y ${removed.length - names.length} más` : '';
      const label = names.length ? `: ${names.join(', ')}${suffix}` : '';
      notify(`Se eliminaron ${removed.length} producto(s) del carrito por estar agotados${label}.`, 'warning');
    }

    return { removedCount: removed.length };
  }

  function getSubtotal() {
    const cart = Cart.get();
    return cart.reduce((acc, i) => acc + parseFloat(i.price) * i.quantity, 0);
  }

  function updateModalTotals() {
    const subtotal = getSubtotal();
    const withDelivery = deliveryCheckbox?.checked === true;
    const total = subtotal + (withDelivery ? DELIVERY_COST_CUP : 0);
    if (modalSubtotal) modalSubtotal.textContent = subtotal.toFixed(2);
    if (modalTotal) modalTotal.textContent = total.toFixed(2);
  }

  function renderCart() {
    const cart = Cart.get();
    if (!cart.length) {
      cartEmpty.classList.remove('hidden');
      cartSummary.classList.add('hidden');
      if (cartItems) cartItems.innerHTML = '';
      return;
    }
    cartEmpty.classList.add('hidden');
    cartSummary.classList.remove('hidden');

    const total = getSubtotal();
    document.getElementById('cart-total').textContent = total.toFixed(2);

    cartItems.innerHTML = cart
      .map((item) => {
        const unit = parseFloat(item.price) || 0;
        const qty = Number(item.quantity) || 0;
        const img = item.image_url || 'https://placehold.co/80x100/1a1a2e/eaeaea?text=Img';
        return `
          <div class="order-product cart-product" data-product-id="${item.id}">
            <img src="${img}" alt="">
            <div class="details">
              <h3>${item.name}</h3>
              <p>${unit.toFixed(2)} CUP x ${qty}</p>
            </div>
            <div class="cart-product__right">
              <p>${(unit * qty).toFixed(2)} CUP</p>
              <button class="remove" type="button" data-remove-id="${item.id}">Eliminar</button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  cartItems?.addEventListener('click', (e) => {
    const rm = e.target.closest('button.remove');
    if (rm) {
      const id = rm.dataset.removeId;
      if (!id) return;
      Cart.remove(id);
      renderCart();
      notify('Producto eliminado del carrito', 'info');
      return;
    }
    const row = e.target.closest('.cart-product');
    if (row) {
      const id = row.dataset.productId;
      if (id) openProductModal(id);
    }
  });

  async function prefillAddressIfPossible() {
    try {
      const user = await Auth.getUser();
      if (!user) return;
      const metaAddr = (user.user_metadata?.address || '').trim();
      if (deliveryAddress && !deliveryAddress.value.trim() && metaAddr) {
        deliveryAddress.value = metaAddr;
      }
    } catch (e) {
      console.error(e);
    }
  }

  deliveryCheckbox?.addEventListener('change', async () => {
    if (deliveryCheckbox.checked) {
      pickupInfo?.classList.add('hidden');
      deliveryAddressWrap?.classList.remove('hidden');
      await prefillAddressIfPossible();
    } else {
      deliveryAddressWrap?.classList.add('hidden');
      pickupInfo?.classList.remove('hidden');
    }
    updateModalTotals();
  });

  btnCheckout?.addEventListener('click', async () => {
    const user = await Auth.getUser();
    if (!user) {
      location.href = 'login.html?redirect=carrito.html';
      return;
    }
    await pruneOutOfStockCartItems();
    renderCart();
    const cart = Cart.get();
    if (!cart.length) return;
    orderRef.textContent = 'EMP-' + Date.now().toString(36).toUpperCase();
    transferRef.value = '';
    if (deliveryCheckbox) deliveryCheckbox.checked = false;
    if (deliveryAddressWrap) deliveryAddressWrap.classList.add('hidden');
    if (pickupInfo) pickupInfo.classList.remove('hidden');
    // Mantener la última dirección escrita, pero autollenar si está vacío
    if (deliveryAddress && !deliveryAddress.value.trim()) await prefillAddressIfPossible();
    updateModalTotals();
    modal.classList.remove('hidden');
  });

  btnCancel?.addEventListener('click', () => modal.classList.add('hidden'));

  btnConfirm?.addEventListener('click', async () => {
    const user = await Auth.getUser();
    if (!user || !supabase) return;
    const profile = await Auth.getProfile(user.id);
    if (!profile?.full_name?.trim() || !profile?.phone?.trim()) {
      notify('Completa tu perfil (nombre y teléfono) antes de realizar el pedido.', 'warning');
      return;
    }
    await pruneOutOfStockCartItems();
    renderCart();
    const cart = Cart.get();
    if (!cart.length) return;
    const subtotal = getSubtotal();
    const withDelivery = deliveryCheckbox?.checked === true;
    const address = (deliveryAddress?.value || '').trim();
    if (withDelivery && !address) {
      notify('Indica la dirección de entrega para el envío a domicilio.', 'warning');
      return;
    }
    const total = subtotal + (withDelivery ? DELIVERY_COST_CUP : 0);
    const ref = 'EMP-' + Date.now().toString(36).toUpperCase();

    const orderPayload = {
      user_id: user.id,
      user_name: profile.full_name.trim(),
      user_phone: profile.phone.trim(),
      total,
      status: 'pendiente',
      transfer_reference: transferRef.value.trim() || null,
      bank_details: 'IBAN: ES00 0000 0000 0000 0000 0000',
      delivery_requested: !!withDelivery,
      delivery_address: withDelivery ? address : null
    };

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select('id')
      .single();

    if (orderErr) {
      notify('Error al crear pedido: ' + orderErr.message, 'error');
      return;
    }

    const items = cart.map(i => ({
      order_id: order.id,
      product_id: i.id,
      quantity: i.quantity,
      price: parseFloat(i.price)
    }));

    const { error: itemsErr } = await supabase.from('order_items').insert(items);
    if (itemsErr) {
      notify('Error al guardar items: ' + itemsErr.message, 'error');
      return;
    }

    // Reservar stock inmediatamente para este pedido (estado pendiente)
    const { data: stockItems, error: stockErr } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', order.id);
    if (stockErr) {
      notify('Pedido creado pero hubo un error reservando el stock: ' + stockErr.message, 'warning');
    } else if (stockItems?.length) {
      const byProduct = {};
      for (const i of stockItems) {
        const qty = Number(i.quantity) || 0;
        if (qty > 0) {
          byProduct[i.product_id] = (byProduct[i.product_id] || 0) + qty;
        }
      }
      for (const productId of Object.keys(byProduct)) {
        const qty = byProduct[productId];
        const { data: product, error: fetchErr } = await supabase
          .from('products')
          .select('stock')
          .eq('id', productId)
          .single();
        if (fetchErr || !product) continue;
        const current = Number(product.stock) || 0;
        const newStock = Math.max(0, current - qty);
        await supabase.from('products').update({ stock: newStock }).eq('id', productId);
      }
    }

    Cart.clear();
    modal.classList.add('hidden');
    if (window.UI?.openModal) {
      UI.openModal({
        title: 'Pedido creado',
        html: `<p class="ui-modal__text">Estado: <strong>Pago pendiente</strong>. Realiza la transferencia y espera la confirmación.</p>`,
        actions: [
          { label: 'Ver mis pedidos', variant: 'primary', onClick: () => (location.href = 'pedidos.html') },
        ],
      });
    } else {
      notify('Pedido creado. Estado: Pago pendiente.', 'success');
      location.href = 'pedidos.html';
    }
  });

  await pruneOutOfStockCartItems();
  renderCart();

  // -------- Modal de producto (detalle) en carrito --------
  async function openProductModal(productId) {
    const modalEl = document.getElementById('product-modal');
    if (!modalEl || !supabase) return;
    const mainImg = document.getElementById('modal-main-img');
    const thumbs = document.getElementById('modal-thumbs');
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

    modalEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const { data: product } = await supabase.from('products').select('*').eq('id', productId).single();
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

    if (mainImg) {
      mainImg.src = allImages[0];
      mainImg.alt = product.name;
    }
    if (thumbs) {
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
          if (mainImg) mainImg.src = t.querySelector('img').src;
        };
      });
    }

    if (title) title.textContent = product.name;
    if (category) category.textContent = product.category || '';
    if (desc) desc.textContent = product.description || 'Sin descripción.';
    if (priceEl) priceEl.textContent = (parseFloat(product.price) || 0).toFixed(2) + ' CUP';
    if (stockEl) {
      const inStock = (product.stock ?? 10) > 0;
      stockEl.textContent = inStock ? `En stock (${product.stock})` : 'Agotado';
      stockEl.className = 'product-modal-stock ' + (inStock ? '' : 'out-of-stock');
    }

    if (addCartBtn) {
      addCartBtn.disabled = (product.stock ?? 10) <= 0;
      addCartBtn.onclick = (ev) => {
        ev.preventDefault();
        Cart.add({ id: product.id, name: product.name, price: parseFloat(product.price) || 0, image_url: mainUrl }, 1);
        if (typeof updateCartCount === 'function') updateCartCount();
        notify('Producto añadido al carrito', 'success');
      };
    }

    const { data: reviews } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    const avg =
      reviews?.length > 0 ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0;
    const rounded = Math.round(avg * 10) / 10;
    if (ratingEl) {
      ratingEl.innerHTML = `
        <span class="stars-display" title="${rounded} de 5">
          ${renderStars(rounded)}
        </span>
        <span class="rating-count">${reviews?.length || 0} ${reviews?.length === 1 ? 'reseña' : 'reseñas'}</span>
      `;
    }

    const user = Auth.supabase ? await Auth.getUser() : null;
    if (user) {
      reviewLoginHint?.classList.add('hidden');
      reviewFormFields?.classList.remove('hidden');
    } else {
      reviewLoginHint?.classList.remove('hidden');
      reviewFormFields?.classList.add('hidden');
    }

    // Reutiliza el envío de reseñas de tienda (simple) si existe UI
    initReviewForm(productId);

    if (reviewsList) {
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
      if (!reviews?.length) reviewsList.innerHTML = '<p class="no-reviews">Aún no hay reseñas.</p>';
    }
  }

  function closeProductModal() {
    const modalEl = document.getElementById('product-modal');
    if (modalEl) modalEl.classList.add('hidden');
    document.body.style.overflow = '';
  }

  document.querySelector('#product-modal .product-modal-backdrop')?.addEventListener('click', closeProductModal);
  document.querySelector('#product-modal .product-modal-close')?.addEventListener('click', closeProductModal);
  document.addEventListener('keydown', (e) => {
    const modalEl = document.getElementById('product-modal');
    if (e.key === 'Escape' && modalEl && !modalEl.classList.contains('hidden')) closeProductModal();
  });

  function renderStars(avg) {
    const n = Math.round(Number(avg) || 0);
    return '<span class="star filled">★</span>'.repeat(n) + '<span class="star">☆</span>'.repeat(5 - n);
  }
  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  }
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  let selectedRating = 0;
  function initReviewForm(productId) {
    selectedRating = 0;
    const starsInput = document.getElementById('review-stars-input');
    const ta = document.getElementById('review-comment');
    const btn = document.getElementById('review-submit');
    if (ta) ta.value = '';
    starsInput?.querySelectorAll('span[data-value]')?.forEach((s) => s.classList.remove('active'));

    if (starsInput) {
      starsInput.onclick = (e) => {
        const span = e.target.closest('span[data-value]');
        if (!span) return;
        selectedRating = parseInt(span.dataset.value, 10);
        starsInput
          .querySelectorAll('span[data-value]')
          .forEach((s) => s.classList.toggle('active', parseInt(s.dataset.value, 10) <= selectedRating));
      };
    }
    if (btn) {
      btn.onclick = async () => {
        if (!selectedRating) return notify('Selecciona una calificación de 1 a 5 estrellas.', 'warning');
        const user = await Auth.getUser();
        if (!user) return notify('Debes iniciar sesión para enviar una reseña.', 'warning');
        const profile = await Auth.getProfile(user.id);
        if (!profile?.full_name?.trim() || !profile?.phone?.trim()) {
          return notify('Completa tu perfil (nombre y teléfono) para poder publicar reseñas.', 'warning');
        }
        const user_name = profile.full_name.trim();
        const comment = (ta?.value || '').trim();
        const { error } = await supabase.from('product_reviews').upsert(
          { product_id: productId, user_id: user.id, user_name, rating: selectedRating, comment: comment || null },
          { onConflict: 'product_id,user_id' }
        );
        if (error) return notify('Error al enviar la reseña: ' + error.message, 'error');
        notify('Reseña enviada.', 'success');
        openProductModal(productId);
      };
    }
  }
});
