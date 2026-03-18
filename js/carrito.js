const DELIVERY_COST_CUP = 150;

document.addEventListener('DOMContentLoaded', async () => {
  const cartItems = document.getElementById('cart-items');
  const cartEmpty = document.getElementById('cart-empty');
  const cartSummary = document.getElementById('cart-summary');
  const btnCheckout = document.getElementById('btn-checkout');
  const modal = document.getElementById('checkout-modal');
  const modalSubtotal = document.getElementById('modal-subtotal');
  const modalDelivery = document.getElementById('modal-delivery');
  const modalTotal = document.getElementById('modal-total');
  const orderRef = document.getElementById('order-ref');
  const transferRef = document.getElementById('transfer-reference');
  const btnConfirm = document.getElementById('btn-confirm-order');
  const btnCancel = document.getElementById('btn-cancel-order');
  const deliveryAddressWrap = document.getElementById('delivery-address-wrap');
  const deliveryAddress = document.getElementById('delivery-address');
  const pickupInfo = document.getElementById('pickup-info');
  const cashSection = document.getElementById('cash-section');
  const transferSection = document.getElementById('transfer-section');
  const checkoutError = document.getElementById('checkout-error');
  const qrImg = document.getElementById('transfer-qr');
  const bankAccount = document.getElementById('bank-account');

  const payCash = document.getElementById('pay-cash');
  const payTransfer = document.getElementById('pay-transfer');
  const deliveryPickup = document.getElementById('delivery-pickup');
  const deliveryDelivery = document.getElementById('delivery-delivery');

  // Modal de confirmación de cancelación
  const cancelConfirmationModal = document.getElementById('cancel-confirmation-modal');
  const btnCancelConfirmationNo = document.getElementById('btn-cancel-confirmation-no');
  const btnCancelConfirmationYes = document.getElementById('btn-cancel-confirmation-yes');

  const notify = (msg, type = 'info') => {
    if (window.UI?.toast) UI.toast(msg, type);
    else console.log(type.toUpperCase() + ':', msg);
  };

  let lastStockMap = new Map(); // productId -> { stock, name }
  let reservedStock = null; // { byProduct: { [productId]: qty } }
  let modalStates = new Map(); // Para rastrear estados de modales

  async function rollbackReservedStock(byProduct) {
    if (!byProduct || !window.supabase) return;
    try {
      for (const [productId, qty] of Object.entries(byProduct)) {
        const n = Number(qty) || 0;
        if (!n) continue;
        const { data: product, error: fetchErr } = await supabase
          .from('products')
          .select('stock')
          .eq('id', productId)
          .single();
        if (fetchErr || !product) continue;
        const current = Number(product.stock) || 0;
        await supabase.from('products').update({ stock: current + n }).eq('id', productId).eq('stock', current);
      }
    } catch (e) {
      console.error('Error devolviendo stock reservado', e);
    }
  }

  async function reserveStockCAS(byProduct) {
    // Reserva stock con compare-and-set para detectar concurrencia.
    // Devuelve { ok, conflict, insufficient, stockNow }
    const productIds = Object.keys(byProduct || {});
    if (!productIds.length) return { ok: false, conflict: false, insufficient: false, stockNow: new Map() };

    const { data: currentProducts, error: stockErr } = await supabase
      .from('products')
      .select('id,name,stock')
      .in('id', productIds);

    if (stockErr) return { ok: false, conflict: false, insufficient: false, stockNow: new Map() };

    const stockNow = new Map(
      (currentProducts || []).map((p) => [String(p.id), { stock: Number(p.stock ?? 0), name: p.name }])
    );

    // 1) validar suficiente stock con el snapshot
    for (const pid of productIds) {
      const meta = stockNow.get(String(pid));
      const available = Number(meta?.stock ?? 0);
      const required = Number(byProduct[pid] || 0);
      if (required > available) {
        return { ok: false, conflict: false, insufficient: true, stockNow };
      }
    }

    // 2) aplicar CAS: update donde stock == available (snapshot)
    const reserved = {};
    for (const pid of productIds) {
      const meta = stockNow.get(String(pid));
      const available = Number(meta?.stock ?? 0);
      const required = Number(byProduct[pid] || 0);
      const newStock = Math.max(0, available - required);
      const { data: updated, error: updErr } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', pid)
        .eq('stock', available)
        .select('id')
        .maybeSingle();

      if (updErr || !updated) {
        // Conflicto: alguien más cambió el stock entre lectura y update
        await rollbackReservedStock(reserved);
        return { ok: false, conflict: true, insufficient: false, stockNow };
      }

      reserved[pid] = required;
    }

    return { ok: true, conflict: false, insufficient: false, stockNow };
  }

  async function syncCartWithStock() {
    const cart = Cart.get();
    if (!cart.length) {
      lastStockMap = new Map();
      return { removedCount: 0, cappedCount: 0, stockMap: lastStockMap };
    }
    if (!window.supabase) return { removedCount: 0, cappedCount: 0, stockMap: lastStockMap };

    const ids = Array.from(new Set(cart.map((i) => i.id).filter(Boolean)));
    if (!ids.length) return { removedCount: 0, cappedCount: 0, stockMap: lastStockMap };

    const { data, error } = await supabase
      .from('products')
      .select('id,name,stock')
      .in('id', ids);

    if (error) {
      console.error(error);
      return { removedCount: 0, cappedCount: 0, stockMap: lastStockMap };
    }

    const map = new Map((data || []).map((p) => [String(p.id), p]));
    const keep = [];
    const removed = [];
    const capped = [];

    for (const item of cart) {
      const p = map.get(String(item.id));
      const stock = Number(p?.stock ?? 0);
      if (!p || stock <= 0) {
        removed.push(item);
        continue;
      }
      const qty = Number(item.quantity) || 0;
      if (qty > stock) {
        capped.push({ ...item, prevQty: qty, newQty: stock, stock, name: p?.name || item?.name });
        keep.push({ ...item, quantity: stock });
      } else {
        keep.push(item);
      }
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

    if (capped.length) {
      const names = capped
        .map((r) => (r?.name || '').trim())
        .filter(Boolean)
        .slice(0, 3);
      const suffix = capped.length > names.length ? ` y ${capped.length - names.length} más` : '';
      const label = names.length ? `: ${names.join(', ')}${suffix}` : '';
      notify(`Se ajustaron cantidades al stock disponible${label}.`, 'warning');
      // ya quedó guardado en Cart.set(keep) si hubo removed; si no, aseguramos set
      if (!removed.length) Cart.set(keep);
    }

    lastStockMap = new Map(
      (data || []).map((p) => [
        String(p.id),
        { stock: Number(p.stock ?? 0), name: (p.name || '').trim() || null },
      ])
    );

    return { removedCount: removed.length, cappedCount: capped.length, stockMap: lastStockMap };
  }

  function getSubtotal() {
    const cart = Cart.get();
    return cart.reduce((acc, i) => acc + parseFloat(i.price) * i.quantity, 0);
  }

  function getSelectedPaymentMethod() {
    const el = document.querySelector('input[name="payment-method"]:checked');
    return el?.value || null; // 'cash' | 'transfer' | null
  }

  function getSelectedDeliveryMethod() {
    const el = document.querySelector('input[name="delivery-method"]:checked');
    return el?.value || null; // 'pickup' | 'delivery' | null
  }

  function updateModalTotals() {
    const subtotal = getSubtotal();
    const withDelivery = getSelectedDeliveryMethod() === 'delivery';
    const total = subtotal + (withDelivery ? DELIVERY_COST_CUP : 0);
    if (modalSubtotal) modalSubtotal.textContent = subtotal.toFixed(2);
    if (modalDelivery) modalDelivery.textContent = (withDelivery ? DELIVERY_COST_CUP : 0).toFixed(2);
    if (modalTotal) modalTotal.textContent = total.toFixed(2);

    // QR: incluye cuenta, monto y concepto
    const payment = getSelectedPaymentMethod();
    if (payment === 'transfer' && qrImg) {
      const acc = (bankAccount?.textContent || '').trim() || '0000 0000 0000 0000';
      const concept = (orderRef?.textContent || '').trim() || 'EMP';
      const data = `Cuenta: ${acc}\nMonto: ${total.toFixed(2)} CUP\nConcepto: ${concept}`;
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data)}`;
    }
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
        const meta = lastStockMap.get(String(item.id));
        const maxStock = Number(meta?.stock);
        const stockLabel = Number.isFinite(maxStock) ? `Stock: ${maxStock}` : '';
        const img = item.image_url || 'https://placehold.co/80x100/1a1a2e/eaeaea?text=Img';
        return `
          <div class="order-product cart-product" data-product-id="${item.id}">
            <img src="${img}" alt="">
            <div class="details">
              <h3>${item.name}</h3>
              <p>${unit.toFixed(2)} CUP x ${qty}</p>
              ${stockLabel ? `<p class="cart-stock-hint">${stockLabel}</p>` : ''}
            </div>
            <div class="cart-product__right">
              <p>${(unit * qty).toFixed(2)} CUP</p>
              <div class="qty-controls" aria-label="Cantidad">
                <button type="button" class="qty-btn qty-btn--minus" data-qty-action="minus" data-product-id="${item.id}" aria-label="Disminuir cantidad">−</button>
                <span class="qty-value" aria-label="Cantidad actual">${qty}</span>
                <button type="button" class="qty-btn qty-btn--plus" data-qty-action="plus" data-product-id="${item.id}" aria-label="Aumentar cantidad">+</button>
              </div>
              <button class="remove" type="button" data-remove-id="${item.id}">Eliminar</button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  cartItems?.addEventListener('click', (e) => {
    const qtyBtn = e.target.closest('button.qty-btn');
    if (qtyBtn) {
      const id = qtyBtn.dataset.productId;
      const action = qtyBtn.dataset.qtyAction;
      if (!id || !action) return;
      const cart = Cart.get();
      const item = cart.find((i) => String(i.id) === String(id));
      const current = Number(item?.quantity) || 0;
      const maxStock = Number(lastStockMap.get(String(id))?.stock);

      if (action === 'minus') {
        const next = current - 1;
        Cart.setQuantityWithStock(id, next, { notify }).then(() => renderCart());
        return;
      }
      if (action === 'plus') {
        if (Number.isFinite(maxStock) && current >= maxStock) {
          notify(`No puedes añadir más. Solo quedan ${maxStock} en stock.`, 'warning');
          return;
        }
        Cart.setQuantityWithStock(id, current + 1, { notify }).then(() => renderCart());
        return;
      }
    }

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
      const profile = await Auth.getProfile(user.id);
      const addr = (profile?.address || user.user_metadata?.address || '').trim();
      if (deliveryAddress) {
        // Guardamos la dirección sugerida del perfil, pero sin forzarla.
        deliveryAddress.dataset.profileAddress = addr;
        // Autollenar solo si el usuario no ha escrito nada aún.
        if (!deliveryAddress.value.trim() && addr) {
          deliveryAddress.value = addr;
        }
        // Debe ser editable en el modal.
        deliveryAddress.readOnly = false;
      }
    } catch (e) {
      console.error(e);
    }
  }

  function setCheckoutError(msg = '') {
    if (checkoutError) checkoutError.textContent = msg || '';
  }

  async function syncModalVisibility() {
    const payment = getSelectedPaymentMethod();
    const del = getSelectedDeliveryMethod();

    // Secciones por método de pago
    cashSection?.classList.toggle('hidden', payment !== 'cash');
    transferSection?.classList.toggle('hidden', payment !== 'transfer');

    // Dirección / pickup
    pickupInfo?.classList.toggle('hidden', del !== 'pickup');
    deliveryAddressWrap?.classList.toggle('hidden', del !== 'delivery');
    if (del === 'delivery') await prefillAddressIfPossible();

    updateModalTotals();
    updateConfirmEnabled();
  }

  function updateConfirmEnabled() {
    const payment = getSelectedPaymentMethod();
    const del = getSelectedDeliveryMethod();
    const withDelivery = del === 'delivery';
    const address = (deliveryAddress?.value || '').trim();
    const transferCode = (transferRef?.value || '').trim();

    let ok = true;
    let msg = '';

    if (!payment) {
      ok = false;
      msg = 'Selecciona el método de pago.';
    } else if (!del) {
      ok = false;
      msg = 'Selecciona si quieres domicilio o recogida en tienda.';
    } else if (withDelivery && !address) {
      ok = false;
      msg = 'Tu dirección está vacía. Ve a tu perfil y guárdala para poder pedir a domicilio.';
    } else if (payment === 'transfer' && !transferCode) {
      ok = false;
      msg = 'Indica el código de confirmación de la transferencia.';
    }

    if (btnConfirm) btnConfirm.disabled = !ok;
    setCheckoutError(msg);
  }

  document.querySelectorAll('input[name="payment-method"]').forEach((el) =>
    el.addEventListener('change', () => syncModalVisibility())
  );
  document.querySelectorAll('input[name="delivery-method"]').forEach((el) =>
    el.addEventListener('change', () => syncModalVisibility())
  );
  transferRef?.addEventListener('input', updateConfirmEnabled);

  btnCheckout?.addEventListener('click', async () => {
    const user = await Auth.getUser();
    if (!user) {
      location.href = 'login.html?redirect=carrito.html';
      return;
    }
    // Sincronizar cantidades con stock antes de reservar
    await syncCartWithStock();
    renderCart();
    const cart = Cart.get();
    if (!cart.length) return;

    // Reservar stock para el carrito actual
    const byProduct = {};
    for (const i of cart) {
      const qty = Number(i.quantity) || 0;
      if (qty > 0) {
        byProduct[i.id] = (byProduct[i.id] || 0) + qty;
      }
    }
    const productIds = Object.keys(byProduct);
    if (!productIds.length) return;

    const reserveRes = await reserveStockCAS(byProduct);
    if (!reserveRes.ok) {
      if (reserveRes.conflict) {
        notify(
          'Otra persona está realizando un pedido al mismo tiempo y el stock cambió. Actualiza el carrito e intenta de nuevo.',
          'error'
        );
      } else if (reserveRes.insufficient) {
        notify('No hay stock suficiente para reservar este pedido. Ajusta tu carrito.', 'error');
      } else {
        notify('No se pudo reservar el stock. Intenta de nuevo.', 'error');
      }
      await syncCartWithStock();
      renderCart();
      // Importante: NO abrir modal/pantalla de pago
      return;
    }

    reservedStock = { byProduct: byProduct };

    orderRef.textContent = 'EMP-' + Date.now().toString(36).toUpperCase();
    if (transferRef) transferRef.value = '';
    if (payCash) payCash.checked = false;
    if (payTransfer) payTransfer.checked = false;
    if (deliveryPickup) deliveryPickup.checked = false;
    if (deliveryDelivery) deliveryDelivery.checked = false;
    cashSection?.classList.add('hidden');
    transferSection?.classList.add('hidden');
    deliveryAddressWrap?.classList.add('hidden');
    pickupInfo?.classList.add('hidden');
    setCheckoutError('');
    if (btnConfirm) btnConfirm.disabled = true;

    // Cuenta por defecto (puedes cambiar el texto aquí sin tocar JS)
    if (bankAccount && !bankAccount.textContent.trim()) bankAccount.textContent = '0000 0000 0000 0000';

    updateModalTotals();
    modal.classList.remove('hidden');
  });

  btnCancel?.addEventListener('click', async () => {
    // Mostrar modal de confirmación en lugar de cancelar directamente
    cancelConfirmationModal.classList.remove('hidden');
  });

  // Función para ejecutar la cancelación
  async function executeCancel() {
    // Si se cancela el pedido, devolvemos la reserva de stock
    if (reservedStock && reservedStock.byProduct) {
      await rollbackReservedStock(reservedStock.byProduct);
      reservedStock = null;
    }
    modal.classList.add('hidden');
    cancelConfirmationModal.classList.add('hidden');
    notify('Pedido cancelado. Los productos han sido devueltos al stock.', 'info');
  }

  btnCancelConfirmationNo?.addEventListener('click', () => {
    // No cancelar, mantener el modal de checkout abierto
    cancelConfirmationModal.classList.add('hidden');
  });

  btnCancelConfirmationYes?.addEventListener('click', async () => {
    // Confirmar la cancelación
    await executeCancel();
  });

  btnConfirm?.addEventListener('click', async () => {
    const user = await Auth.getUser();
    if (!user || !supabase) return;
    const profile = await Auth.getProfile(user.id);
    if (!profile?.full_name?.trim() || !profile?.phone?.trim()) {
      notify('Completa tu perfil (nombre y teléfono) antes de realizar el pedido.', 'warning');
      return;
    }
    const cart = Cart.get();
    if (!cart.length) return;

    // El stock ya fue verificado y reservado al iniciar el pago (btnCheckout)
    // No se realiza verificación nuevamente aquí

    const payment = getSelectedPaymentMethod();
    const delivery = getSelectedDeliveryMethod();
    const withDelivery = delivery === 'delivery';
    const address = (deliveryAddress?.value || '').trim();
    const transferCode = (transferRef?.value || '').trim();

    if (!payment || !delivery) {
      notify('Completa las opciones de pago y domicilio antes de confirmar.', 'warning');
      updateConfirmEnabled();
      return;
    }
    if (withDelivery && !address) {
      notify('Tu dirección está vacía. Ve a tu perfil y guárdala para poder pedir a domicilio.', 'warning');
      updateConfirmEnabled();
      return;
    }
    if (payment === 'transfer' && !transferCode) {
      notify('Indica el código de confirmación de la transferencia.', 'warning');
      updateConfirmEnabled();
      return;
    }

    const subtotal = getSubtotal();
    const total = subtotal + (withDelivery ? DELIVERY_COST_CUP : 0);
    const ref = 'EMP-' + Date.now().toString(36).toUpperCase();

    const orderPayload = {
      user_id: user.id,
      user_name: profile.full_name.trim(),
      user_phone: profile.phone.trim(),
      total,
      status: 'pendiente',
      transfer_reference: payment === 'transfer' ? transferCode : null,
      bank_details: payment === 'transfer' ? `Cuenta: ${(bankAccount?.textContent || '').trim()}` : null,
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

    // En este punto el stock ya se había descontado al pulsar "Realizar pedido" (reserva).
    // Solo marcamos la reserva como consumida para que no se devuelva.
    reservedStock = null;

    Cart.clear();
    modal.classList.add('hidden');
    if (window.UI?.openModal) {
      UI.openModal({
        title: 'Pedido creado',
        html:
          payment === 'cash'
            ? `<p class="ui-modal__text">Estado: <strong>Pendiente</strong>. Debes completar la acción en <strong>48 horas</strong> o el pedido se cancelará.</p>`
            : `<p class="ui-modal__text">Estado: <strong>Pago pendiente</strong>. Realiza la transferencia y espera la confirmación.</p>`,
        actions: [
          { label: 'Ver mis pedidos', variant: 'primary', onClick: () => (location.href = 'pedidos.html') },
        ],
      });
    } else {
      notify(payment === 'cash' ? 'Pedido creado. Estado: Pendiente.' : 'Pedido creado. Estado: Pago pendiente.', 'success');
      location.href = 'pedidos.html';
    }
  });

  await syncCartWithStock();
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
        (async () => {
          const res = await Cart.addWithStock(
            { id: product.id, name: product.name, price: parseFloat(product.price) || 0, image_url: mainUrl },
            1,
            { notify }
          );
          if (res.ok) notify('Producto añadido al carrito', 'success');
          await syncCartWithStock();
          renderCart();
        })();
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

  // -------- Manejo de navegación hacia atrás (botón atrás del navegador) --------
  window.addEventListener('popstate', (e) => {
    // Si el modal de checkout está abierto, mostrar confirmación
    if (modal && !modal.classList.contains('hidden')) {
      cancelConfirmationModal.classList.remove('hidden');
      // Devolver el historial para que el botón atrás no tenga efecto
      history.pushState(null, null, window.location.href);
    }
  });

  // -------- Manejo de tecla Backspace --------
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') {
      // Si el modal de checkout está abierto, tratarlo como cancelación
      if (modal && !modal.classList.contains('hidden')) {
        e.preventDefault();
        cancelConfirmationModal.classList.remove('hidden');
      }
    }
    // ESC para cerrar el modal de confirmación
    if (e.key === 'Escape') {
      if (cancelConfirmationModal && !cancelConfirmationModal.classList.contains('hidden')) {
        cancelConfirmationModal.classList.add('hidden');
        e.preventDefault();
      }
    }
  });

  // Empujar un estado inicial para que el popstate funcione correctamente
  history.pushState(null, null, window.location.href);
});
