document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.getUser();
  if (!user) {
    location.href = 'login.html?redirect=admin.html';
    return;
  }

  // Cerrar sesión: redirige al index sin usuario logueado
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) btnLogout.addEventListener('click', () => Auth.logout());

  if (!supabase) {
    document.getElementById('admin-orders').innerHTML = '<p>Configura Supabase en js/config.js</p>';
    return;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  const notify = (msg, type = 'info') => {
    if (window.UI?.toast) UI.toast(msg, type);
    else console.log(type.toUpperCase() + ':', msg);
  };

  function getProductColorNames(product) {
    if (!product?.colores) return [];

    try {
      const parsed = JSON.parse(product.colores);
      if (Array.isArray(parsed)) {
        return parsed
          .map((color) => {
            if (typeof color === 'string') return color.trim();
            return String(color?.name || color?.hex || '').trim();
          })
          .filter(Boolean);
      }
    } catch {}

    const parsedColors = window.ColorPalette?.colorsFromJSON?.(product.colores) || [];
    if (parsedColors.length) {
      return parsedColors
        .map((color) => (color?.name || color?.hex || '').trim())
        .filter(Boolean);
    }

    return String(product.colores)
      .split(',')
      .map((color) => color.trim())
      .filter(Boolean);
  }

  function formatProductDescription(product) {
    let desc = '';
    if (product.description) desc += product.description + ' ';
    if (product.talla) desc += `Talla: ${product.talla}. `;
    const colorNames = getProductColorNames(product);
    if (colorNames.length) desc += `Colores: ${colorNames.join(', ')}. `;
    if (product.material) desc += `Material: ${product.material}. `;
    if (product.recomendaciones) desc += `Recomendaciones: ${product.recomendaciones}. `;
    return desc.trim() || 'Sin descripción.';
  }

  const AUTO_NEW_CATEGORY_TAG = 'Novedad';

  function parseCategoryTokens(rawCategory) {
    return String(rawCategory || '')
      .split(/[\s,]+/)
      .map((token) => token.trim())
      .filter(Boolean);
  }

  function addCategoryTag(rawCategory, tagLabel) {
    const normalizedTag = String(tagLabel || '').trim().toLowerCase();
    if (!normalizedTag) return String(rawCategory || '').trim();

    const tokens = parseCategoryTokens(rawCategory);
    const alreadyHasTag = tokens.some((token) => token.toLowerCase() === normalizedTag);
    if (!alreadyHasTag) tokens.push(tagLabel);
    return tokens.join(', ');
  }

  // Iconos inline (evita dependencias externas)
  const ICONS = {
    check: `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5"></path>
      </svg>
    `,
    x: `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 6 6 18"></path>
        <path d="M6 6l12 12"></path>
      </svg>
    `,
    whatsapp: `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
        <path d="M19.11 17.6c-.28-.14-1.66-.82-1.92-.91-.26-.1-.45-.14-.64.14-.19.28-.73.91-.9 1.1-.17.19-.33.21-.61.07-.28-.14-1.18-.44-2.25-1.39-.83-.74-1.39-1.66-1.55-1.94-.16-.28-.02-.43.12-.57.12-.12.28-.33.42-.49.14-.16.19-.28.28-.47.09-.19.05-.35-.02-.49-.07-.14-.64-1.55-.88-2.13-.23-.55-.47-.48-.64-.49h-.55c-.19 0-.49.07-.75.35-.26.28-.99.97-.99 2.36 0 1.39 1.01 2.74 1.15 2.93.14.19 1.99 3.04 4.82 4.27.67.29 1.19.46 1.6.59.67.21 1.28.18 1.76.11.54-.08 1.66-.68 1.89-1.33.23-.65.23-1.2.16-1.33-.07-.12-.26-.19-.54-.33zM16.02 26.67c-1.73 0-3.42-.47-4.9-1.36l-3.42.9.92-3.34c-.96-1.54-1.46-3.31-1.46-5.15 0-5.36 4.36-9.72 9.72-9.72 2.6 0 5.05 1.01 6.88 2.84a9.66 9.66 0 0 1 2.84 6.88c0 5.36-4.36 9.95-9.58 9.95zm0-21.34C9.12 5.33 3.53 10.92 3.53 17.82c0 2.06.54 4.08 1.57 5.86L4 29.87l6.33-1.66a12.3 12.3 0 0 0 5.69 1.39c6.65 0 12.79-5.14 12.79-11.78 0-3.16-1.23-6.13-3.47-8.36A11.72 11.72 0 0 0 16.02 5.33z"/>
      </svg>
    `,
    trash: `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 6h18"></path>
        <path d="M8 6V4h8v2"></path>
        <path d="M19 6l-1 14H6L5 6"></path>
        <path d="M10 11v6"></path>
        <path d="M14 11v6"></path>
      </svg>
    `,
  };

  // Referencias para la sección de productos (se inicializan bajo demanda)
  let adminProductsGrid;
  let adminProductsEmpty;
  let btnNewProduct;
  let productFormModal;
  let productFormTitle;
  let productForm;
  let productFormId;
  let productName;
  let productMaterial;
  let productRecomendaciones;
  let productDescription;
  let productCategory;
  let productImage;
  let productImageFile;
  let productExtraImages;
  let productExtraImagesExisting;
  let loadingModal;

  function ensureAdminProductElements() {
    if (adminProductsGrid && productFormModal && productForm) return;
    adminProductsGrid = document.getElementById('admin-products');
    adminProductsEmpty = document.getElementById('admin-products-empty');
    btnNewProduct = document.getElementById('btn-new-product');
    productFormModal = document.getElementById('product-form-modal');
    productFormTitle = document.getElementById('product-form-title');
    productForm = document.getElementById('product-form');
    productFormId = document.getElementById('product-form-id');
    productName = document.getElementById('product-name');
    productMaterial = document.getElementById('product-material');
    productRecomendaciones = document.getElementById('product-recomendaciones');
    productDescription = document.getElementById('product-description');
    productCategory = document.getElementById('product-category');
    productImage = document.getElementById('product-image');
    productImageFile = document.getElementById('product-image-file');
    productExtraImages = document.getElementById('product-extra-images');
    productExtraImagesExisting = document.getElementById('product-extra-images-existing');
    loadingModal = document.getElementById('loading-modal');
  }

  // ——— Pestañas ———
  const tabs = document.querySelectorAll('.admin-tab');
  const sectionCompras = document.getElementById('section-compras');
  const sectionProductos = document.getElementById('section-productos');
  const sectionVariaciones = document.getElementById('section-variaciones');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const which = tab.dataset.tab;
      
      // Ocultar todas las secciones
      sectionCompras.classList.add('hidden');
      sectionProductos.classList.add('hidden');
      if (sectionVariaciones) sectionVariaciones.classList.add('hidden');
      
      // Mostrar la sección seleccionada
      if (which === 'compras') {
        sectionCompras.classList.remove('hidden');
      } else if (which === 'productos') {
        sectionProductos.classList.remove('hidden');
        loadAdminProducts();
      } else if (which === 'variaciones' && sectionVariaciones) {
        sectionVariaciones.classList.remove('hidden');
        // El módulo admin-variations.js manejará la carga de datos
      }
    });
  });

  // ——— Compras (pedidos) ———
  const container = document.getElementById('admin-orders');
  const empty = document.getElementById('admin-empty');

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = `<p>Error: ${error.message}</p>`;
    return;
  }

  const pendientes = orders?.filter((o) => o.status === 'pendiente') || [];
  const completados = orders?.filter((o) => o.status === 'completado') || [];

  // WhatsApp: normalizar teléfono (solo dígitos; si son 8 dígitos se asume Cuba +53)
  function getWhatsAppUrl(phone, text) {
    if (!phone) return null;
    const digits = String(phone).replace(/\D/g, '');
    const num = digits.length === 8 ? '53' + digits : digits;
    if (!num.length) return null;
    const base = 'https://wa.me/' + num;
    return text ? base + '?text=' + encodeURIComponent(text) : base;
  }

  if (!pendientes.length && !completados.length) {
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
  }

  async function loadOrderDetails(order) {
    const { data: items } = await supabase
      .from('order_items')
      .select('*, products(name, stock, image_url, price)')
      .eq('order_id', order.id);
    return items || [];
  }

  /** Al cancelar el pago, devuelve al stock de cada producto la cantidad del pedido. Devuelve true si todo ok. */
  async function restoreStockForOrder(orderId) {
    const { data: items, error: itemsErr } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId);
    if (itemsErr || !items?.length) return true;

    const byProduct = {};
    for (const i of items) {
      byProduct[i.product_id] = (byProduct[i.product_id] || 0) + Number(i.quantity) || 0;
    }

    for (const productId of Object.keys(byProduct)) {
      const qty = byProduct[productId];
      if (qty <= 0) continue;
      const { data: product, error: fetchErr } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();
      if (fetchErr || !product) return false;
      const current = Number(product.stock) || 0;
      const newStock = current + qty;
      const { error: updateErr } = await supabase.from('products').update({ stock: newStock }).eq('id', productId);
      if (updateErr) return false;
    }
    return true;
  }

  for (const order of pendientes) {
    const items = await loadOrderDetails(order);
    const itemsHtml = items
      .map(
        (i) => `
      <div class="order-item">
        <img src="${escapeAttr(i.products?.image_url || 'https://placehold.co/90x110/1a1a2e/eaeaea?text=Producto')}" alt="${escapeAttr(i.products?.name || 'Producto')}" class="order-item-img">
        <div class="order-item-info">
          <div class="order-item-name">${i.products?.name || 'Producto'}</div>
          <div class="order-item-qty">Cantidad: ${i.quantity}</div>
          <div class="order-item-price">${(parseFloat(i.price) * i.quantity).toFixed(2)} CUP</div>
        </div>
      </div>
    `
      )
      .join('');

    const deliveryInfo = order.delivery_requested && order.delivery_address
      ? `<p class="order-delivery"><strong>Domicilio:</strong> ${escapeHtml(order.delivery_address)}</p>`
      : `<p class="order-delivery"><strong>Entrega:</strong> Recogida en tienda</p>`;
    
    const paymentInfo = order.transfer_reference 
      ? `<p><strong>Pago:</strong> Transferencia · Ref: <strong>${order.transfer_reference}</strong></p>`
      : `<p><strong>Pago:</strong> Efectivo</p>`;
    
    const whatsappUrl = getWhatsAppUrl(order.user_phone);
    const msgCancelar = `Hola${order.user_name ? ' ' + order.user_name : ''}, te escribimos respecto a tu pedido en PaKas. Lamentamos informarte que hemos tenido que cancelar este pedido. Por favor, escríbenos si tienes dudas o si deseas realizar un nuevo pedido.`;
    const card = document.createElement('div');
    card.className = 'order-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('data-order-id', order.id);
    card.innerHTML = `
      <div class="order-info">
        <div class="order-header">
          <strong>Pedido ${order.id.slice(0, 8)}...</strong>
          <span class="status-badge status-pendiente">Pendiente</span>
        </div>
        <p>${order.user_name ? `<strong>${escapeHtml(order.user_name)}</strong>${order.user_phone ? ` · ${escapeHtml(order.user_phone)}` : ''}<br>` : ''}Total: ${parseFloat(order.total).toFixed(2)} CUP · ${new Date(order.created_at).toLocaleString('es')}</p>
        ${paymentInfo}
        ${deliveryInfo}
        <div class="order-items order-items-preview">${itemsHtml.substring(0, 300)}...</div>
        <button type="button" class="btn btn-link view-details-btn">Ver más detalles</button>
      </div>
      <div class="order-card-actions">
        <button type="button" class="btn-complete" data-id="${order.id}" aria-label="Aprobar pago" title="Aprobar pago">
          <span class="btn-icon-svg">${ICONS.check}</span>
          <span class="btn-text">Aprobar</span>
        </button>
        <button type="button" class="btn-cancel" data-id="${order.id}" data-phone="${escapeAttr(order.user_phone || '')}" data-msg="${escapeAttr(msgCancelar)}" aria-label="Cancelar pago" title="Cancelar pago">
          <span class="btn-icon-svg">${ICONS.x}</span>
          <span class="btn-text">Cancelar</span>
        </button>
        ${
          whatsappUrl
            ? `<a href="${whatsappUrl}" target="_blank" rel="noopener" class="btn-whatsapp" aria-label="Escribir por WhatsApp" title="WhatsApp">
                <span class="btn-icon-svg">${ICONS.whatsapp}</span>
                <span class="btn-text">WhatsApp</span>
              </a>`
            : ''
        }
      </div>
    `;
    container.appendChild(card);
  }

  if (completados.length) {
    const sep = document.createElement('h3');
    sep.textContent = 'Pedidos completados';
    sep.style.marginTop = '2rem';
    sep.style.marginBottom = '1rem';
    container.appendChild(sep);
  }

  for (const order of completados.slice(0, 10)) {
    const items = await loadOrderDetails(order);
    const itemsHtml = items
      .map(
        (i) => `
      <div class="order-item">
        <img src="${escapeAttr(i.products?.image_url || 'https://placehold.co/90x110/1a1a2e/eaeaea?text=Producto')}" alt="${escapeAttr(i.products?.name || 'Producto')}" class="order-item-img">
        <div class="order-item-info">
          <div class="order-item-name">${i.products?.name || 'Producto'}</div>
          <div class="order-item-qty">Cantidad: ${i.quantity}</div>
          <div class="order-item-price">${(parseFloat(i.price) * i.quantity).toFixed(2)} CUP</div>
        </div>
      </div>
    `
      )
      .join('');

    const deliveryInfoCompleted = order.delivery_requested && order.delivery_address
      ? `<p class="order-delivery"><strong>Domicilio:</strong> ${escapeHtml(order.delivery_address)}</p>`
      : `<p class="order-delivery"><strong>Entrega:</strong> Recogida en tienda</p>`;
    
    const paymentInfoCompleted = order.transfer_reference 
      ? `<p><strong>Pago:</strong> Transferencia · Ref: <strong>${order.transfer_reference}</strong></p>`
      : `<p><strong>Pago:</strong> Efectivo</p>`;
    
    const whatsappUrlCompleted = getWhatsAppUrl(order.user_phone);
    const card = document.createElement('div');
    card.className = 'order-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('data-order-id', order.id);
    card.innerHTML = `
      <div class="order-info">
        <div class="order-header">
          <strong>Pedido ${order.id.slice(0, 8)}...</strong>
          <span class="status-badge status-completado">Completado</span>
        </div>
        <p>${order.user_name ? `<strong>${escapeHtml(order.user_name)}</strong>${order.user_phone ? ` · ${escapeHtml(order.user_phone)}` : ''}<br>` : ''}Total: ${parseFloat(order.total).toFixed(2)} CUP · ${new Date(order.created_at).toLocaleString('es')}</p>
        ${paymentInfoCompleted}
        ${deliveryInfoCompleted}
        <div class="order-items order-items-preview">${itemsHtml.substring(0, 300)}...</div>
        <button type="button" class="btn btn-link view-details-btn">Ver más detalles</button>
      </div>
      ${
        whatsappUrlCompleted
          ? `<div class="order-card-actions">
              <a href="${whatsappUrlCompleted}" target="_blank" rel="noopener" class="btn-whatsapp" aria-label="Escribir por WhatsApp" title="WhatsApp">
                <span class="btn-icon-svg">${ICONS.whatsapp}</span>
                <span class="btn-text">WhatsApp</span>
              </a>
            </div>`
          : ''
      }
    `;
    container.appendChild(card);
  }

  // Modal para detalles del pedido
  const orderDetailModal = document.getElementById('order-detail-modal');
  const orderDetailBody = document.getElementById('order-detail-body');
  const orderDetailBackdrop = document.querySelector('.order-detail-backdrop');
  const orderDetailClose = document.querySelector('.order-detail-close');

  function closeOrderDetailModal() {
    orderDetailModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  orderDetailClose.onclick = closeOrderDetailModal;
  orderDetailBackdrop.onclick = closeOrderDetailModal;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !orderDetailModal.classList.contains('hidden')) closeOrderDetailModal();
  });

  async function showOrderDetailModal(orderId) {
    const order = [...pendientes, ...completados].find((o) => o.id === orderId);
    if (!order) return;

    const items = await loadOrderDetails(order);
    const itemsDetailHtml = items
      .map(
        (i) => `
      <div class="order-detail-item">
        <img src="${escapeAttr(i.products?.image_url || 'https://placehold.co/120x150/1a1a2e/eaeaea?text=Producto')}" alt="${escapeAttr(i.products?.name || 'Producto')}" class="order-detail-item-img">
        <div class="order-detail-item-info">
          <h4>${i.products?.name || 'Producto'}</h4>
          <p class="order-detail-item-qty">Cantidad: <strong>${i.quantity}</strong></p>
          <p class="order-detail-item-price">Precio unitario: <strong>${parseFloat(i.price).toFixed(2)} CUP</strong></p>
          <p class="order-detail-item-total">Subtotal: <strong>${(parseFloat(i.price) * i.quantity).toFixed(2)} CUP</strong></p>
        </div>
      </div>
    `
      )
      .join('');

    const deliveryInfoFull = order.delivery_requested && order.delivery_address
      ? `<div class="order-detail-section">
          <h3>Información de domicilio</h3>
          <p>${escapeHtml(order.delivery_address)}</p>
        </div>`
      : '';

    const cancelReasonHtml = order.cancel_reason
      ? `<div class="order-detail-section">
          <h3 style="color: var(--error);">Motivo de cancelación</h3>
          <p>${escapeHtml(order.cancel_reason)}</p>
        </div>`
      : '';

    orderDetailBody.innerHTML = `
      <div class="order-detail-header">
        <div>
          <h2>Pedido ${order.id.slice(0, 8)}...</h2>
          <span class="status-badge status-${order.status}">${order.status === 'pendiente' ? 'Pendiente' : order.status === 'completado' ? 'Completado' : 'Cancelado'}</span>
        </div>
        <p class="order-detail-date">${new Date(order.created_at).toLocaleString('es')}</p>
      </div>

      <div class="order-detail-section">
        <h3>Cliente</h3>
        <p><strong>${escapeHtml(order.user_name || 'N/A')}</strong></p>
        ${order.user_phone ? `<p>Teléfono: ${escapeHtml(order.user_phone)}</p>` : ''}
      </div>

      <div class="order-detail-section">
        <h3>Productos</h3>
        <div class="order-detail-items">
          ${itemsDetailHtml}
        </div>
      </div>

      ${deliveryInfoFull}

      <div class="order-detail-section">
        <h3>Información de pago</h3>
        <p>Total: <strong>${parseFloat(order.total).toFixed(2)} CUP</strong></p>
        <p><strong>Método:</strong> ${order.transfer_reference ? 'Transferencia' : 'Efectivo'}</p>
        ${order.transfer_reference ? `<p><strong>Código de confirmación:</strong> ${escapeHtml(order.transfer_reference)}</p>` : ''}
        ${order.bank_details ? `<p><strong>Datos bancarios:</strong> ${escapeHtml(order.bank_details)}</p>` : ''}
        ${order.notes ? `<p><strong>Notas:</strong> ${escapeHtml(order.notes)}</p>` : ''}
      </div>

      ${cancelReasonHtml}
    `;

    orderDetailModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  container.querySelectorAll('.view-details-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const orderId = btn.closest('.order-card').dataset.orderId;
      showOrderDetailModal(orderId);
    });
  });

  container.querySelectorAll('[data-order-id]').forEach((card) => {
    card.addEventListener('click', () => {
      const orderId = card.dataset.orderId;
      showOrderDetailModal(orderId);
    });
  });

  container.querySelectorAll('.btn-complete').forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      if (!id) return;
      btn.disabled = true;
      const { data: updated, error: updateErr } = await supabase
        .from('orders')
        .update({ status: 'completado', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id');
      if (updateErr) {
        btn.disabled = false;
        notify('Error al actualizar: ' + updateErr.message, 'error');
        return;
      }
      if (!updated?.length) {
        btn.disabled = false;
        notify('No se pudo marcar como completado. Comprueba permisos (admin_users).', 'error');
        return;
      }
      const card = btn.closest('.order-card');
      if (card) card.remove();
      location.reload();
    };
  });

  container.querySelectorAll('.btn-cancel').forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const phone = btn.dataset.phone || '';
      const msg = btn.dataset.msg || '';
      if (!id) return;
      const ok = window.UI?.confirm
        ? await UI.confirm({
            title: 'Cancelar pedido',
            message: '¿Cancelar este pedido? Se devolverá el stock y se notificará el motivo al cliente.',
            confirmText: 'Cancelar pedido',
            cancelText: 'Volver',
          })
        : confirm('¿Cancelar este pedido?');
      if (!ok) return;

      const reason = window.UI?.promptReason
        ? await UI.promptReason({
            title: 'Motivo de cancelación',
            message: 'Este motivo se mostrará al cliente.',
            placeholder: 'Ej: No hay stock disponible / Transferencia no recibida / Error en datos…',
            confirmText: 'Guardar y cancelar',
            cancelText: 'Volver',
            minLen: 5,
          })
        : (prompt('Motivo de cancelación (se mostrará al cliente):') || '').trim();

      if (!reason) return;
      btn.disabled = true;
      const stockOk = await restoreStockForOrder(id);
      if (!stockOk) {
        btn.disabled = false;
        notify('No se pudo devolver el stock de este pedido. Revisa permisos o datos.', 'error');
        return;
      }
      const { data: updated, error: updateErr } = await supabase
        .from('orders')
        .update({ status: 'cancelado', cancel_reason: reason, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id');
      if (updateErr) {
        btn.disabled = false;
        notify('Error al cancelar: ' + updateErr.message, 'error');
        return;
      }
      if (!updated?.length) {
        btn.disabled = false;
        notify('No se pudo cancelar el pedido.', 'error');
        return;
      }
      const card = btn.closest('.order-card');
      if (card) card.remove();
      const msgFull = msg + (reason ? `\n\nMotivo: ${reason}` : '');
      const whatsappUrl = getWhatsAppUrl(phone, msgFull);
      if (whatsappUrl) window.open(whatsappUrl, '_blank', 'noopener');
      location.reload();
    };
  });

  // ——— Productos (CRUD) ———
  ensureAdminProductElements();

  function parseExtraImages(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  async function uploadImageFile(file, folder = 'products') {
    if (!supabase || !file) return null;
    
    try {
      // Comprimir la imagen primero
      const compressedBlob = await compressImage(file);
      
      // Crear un nuevo File con el blob comprimido
      const compressedFile = new File([compressedBlob], file.name.replace(/\.[^/.]+$/, '.webp'), { type: 'image/webp' });
      
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        });
      if (error) {
        console.error('Error subiendo imagen', error);
        notify('Error al subir una imagen: ' + error.message, 'error');
        return null;
      }
      const { data: publicData } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);
      return publicData?.publicUrl || null;
    } catch (error) {
      console.error('Error procesando imagen', error);
      notify('Error al procesar la imagen: ' + error.message, 'error');
      return null;
    }
  }

  function openProductFormModal(product = null) {
    productFormId.value = product ? product.id : '';
    productFormTitle.textContent = product ? 'Editar producto' : 'Nuevo producto';
    productName.value = product?.name ?? '';

    productDescription.value = product?.description ?? '';
    productMaterial.value = product?.material ?? '';
    productRecomendaciones.value = product?.recomendaciones ?? '';

    productCategory.value = product?.category ?? '';
    productImage.value = product?.image_url ?? '';

    if (productExtraImagesExisting) {
      const extras = parseExtraImages(product?.extra_images);
      productExtraImagesExisting.value = JSON.stringify(extras);
    }
    if (productImageFile) productImageFile.value = '';
    if (productExtraImages) productExtraImages.value = '';
    
    // Cargar data de variaciones en el builder
    if (window.ProductVariationsBuilder && product?.id) {
      // Cargar variaciones existentes desde BD
      supabase.from('product_variations')
        .select('*')
        .eq('parent_product_id', product.id)
        .then(({ data: variations }) => {
          window.ProductVariationsBuilder.loadFromProduct(product, variations || []);
        })
        .catch((err) => {
          console.error('Error cargando variaciones:', err);
          window.ProductVariationsBuilder.loadFromProduct(product, []);
        });
    } else if (window.ProductVariationsBuilder) {
      window.ProductVariationsBuilder.loadFromProduct(product, []);
    }
    
    productFormModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeProductFormModal() {
    productFormModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  productFormModal.querySelector('.product-form-backdrop').onclick = closeProductFormModal;
  productFormModal.querySelector('.product-form-close').onclick = closeProductFormModal;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !productFormModal.classList.contains('hidden')) closeProductFormModal();
  });

  btnNewProduct.addEventListener('click', () => openProductFormModal());

  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    ensureAdminProductElements();

    const productId = productFormId.value.trim();
    const productNameVal = productName.value.trim();

    // Validar nombre
    if (!productNameVal) {
      notify('El nombre del producto es requerido', 'warning');
      return;
    }

    // Obtener variaciones del builder
    let variationsArray = [];
    if (window.ProductVariationsBuilder) {
      variationsArray = window.ProductVariationsBuilder.getVariationsArray();
    }

    // Calcular precio y stock promedio/total de las variaciones
    let avgPrice = 0, totalStock = 0;
    if (variationsArray.length > 0) {
      avgPrice = variationsArray.reduce((sum, v) => sum + (v.price || 0), 0) / variationsArray.length;
      totalStock = variationsArray.reduce((sum, v) => sum + (v.stock || 0), 0);
    }

    loadingModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Imagen principal: prioridad al archivo subido; si no, a la URL escrita
    let mainImageUrl = productImage.value.trim() || null;
    if (productImageFile && productImageFile.files && productImageFile.files[0]) {
      const uploaded = await uploadImageFile(productImageFile.files[0], 'main');
      if (uploaded) mainImageUrl = uploaded;
    }

    // Imágenes extra: conservar existentes y sumar nuevas subidas
    let existingExtras = [];
    if (productExtraImagesExisting?.value) {
      try {
        const parsed = JSON.parse(productExtraImagesExisting.value);
        if (Array.isArray(parsed)) existingExtras = parsed.filter(Boolean);
      } catch {
        existingExtras = [];
      }
    }
    let extraImages = [...existingExtras];
    if (productExtraImages && productExtraImages.files && productExtraImages.files.length) {
      for (const file of productExtraImages.files) {
        const url = await uploadImageFile(file, 'extra');
        if (url) extraImages.push(url);
      }
    }
    extraImages = extraImages.filter(Boolean);

    // Construir payload del producto
    const rawCategoryValue = productCategory.value.trim();
    const categoryValue = productId
      ? rawCategoryValue
      : addCategoryTag(rawCategoryValue, AUTO_NEW_CATEGORY_TAG);
    const colorsPayload = window.ProductVariationsBuilder
      ? window.ProductVariationsBuilder.getColorsPayload()
      : [];

    const payload = {
      name: productNameVal,
      description: productDescription.value.trim(),
      material: productMaterial.value.trim(),
      recomendaciones: productRecomendaciones.value.trim(),
      category: categoryValue || null,
      price: avgPrice || 0,  // Precio promedio de variaciones
      stock: totalStock,      // Stock total de variaciones
      image_url: mainImageUrl,
      extra_images: extraImages.length ? extraImages : null,
      // Guardar colores y tallas en JSON para refer​encia
      colores: colorsPayload.length ? JSON.stringify(colorsPayload) : null,
      talla: window.ProductVariationsBuilder ? window.ProductVariationsBuilder.tallas.join(', ') : '',
    };

    try {
      let newProductId = productId;

      if (productId) {
        // Editar producto existente
        const { error: updateErr } = await supabase
          .from('products')
          .update(payload)
          .eq('id', productId);

        if (updateErr) throw updateErr;

        // Eliminar variaciones antiguas
        await supabase
          .from('product_variations')
          .delete()
          .eq('parent_product_id', productId);

      } else {
        // Crear producto nuevo
        const { data: insertedProduct, error: insertErr } = await supabase
          .from('products')
          .insert([payload])
          .select('id');

        if (insertErr) throw insertErr;
        if (!insertedProduct || !insertedProduct[0]) throw new Error('No se pudo obtener el ID del nuevo producto');

        newProductId = insertedProduct[0].id;
      }

      // Guardar variaciones
      if (variationsArray.length > 0 && newProductId) {
        // Procesar imágenes de variaciones
        const variationsToInsert = [];
        for (const v of variationsArray) {
          let imageUrl = v.imageUrl || null; // URL existente, si la hay
          
          // Si hay una imagen nueva (File), subirla
          if (v.image instanceof File) {
            imageUrl = await uploadImageFile(v.image, 'variations');
          }
          
          variationsToInsert.push({
            parent_product_id: newProductId,
            sku: v.sku || `${payload.name.substring(0, 3).toUpperCase()}-${v.color}-${v.talla}`,
            color: v.color,
            talla: v.talla,
            price: v.price || 0,
            stock: v.stock || 0,
            image_url: imageUrl,
          });
        }

        const { error: variationErr } = await supabase
          .from('product_variations')
          .insert(variationsToInsert);

        if (variationErr) throw variationErr;
      }

      notify(productId ? 'Producto actualizado correctamente' : 'Producto creado correctamente', 'success');
      loadingModal.classList.add('hidden');
      document.body.style.overflow = '';
      closeProductFormModal();
      loadAdminProducts();

    } catch (error) {
      notify('Error: ' + (error?.message || 'Desconocido'), 'error');
      loadingModal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  });

  async function loadAdminProducts() {
    ensureAdminProductElements();
    const { data: products, error: productsErr } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (productsErr) {
      adminProductsGrid.innerHTML = `<p class="error">Error: ${productsErr.message}</p>`;
      adminProductsEmpty.classList.add('hidden');
      return;
    }

    if (!products?.length) {
      adminProductsGrid.innerHTML = '';
      adminProductsEmpty.classList.remove('hidden');
      return;
    }

    adminProductsEmpty.classList.add('hidden');
    adminProductsGrid.innerHTML = products
      .map(
        (p) => `
      <div class="admin-product-card">
        <div class="admin-product-img">
          <img src="${escapeAttr(p.image_url || 'https://placehold.co/400x500/1a1a2e/eaeaea?text=Producto')}" alt="">
        </div>
        <div class="admin-product-info">
          <h3>${escapeHtml(p.name)}</h3>
          <p class="admin-product-price">${parseFloat(p.price).toFixed(2)} CUP</p>
          <p class="admin-product-stock">Stock: ${p.stock ?? 0}</p>
          <p class="admin-product-desc">${escapeHtml(formatProductDescription(p))}</p>
          <div class="admin-product-actions">
            <button type="button" class="btn btn-outline btn-edit-product" data-id="${p.id}">Editar</button>
            <button type="button" class="btn btn-outline btn-delete-product" data-id="${p.id}" aria-label="Eliminar producto" title="Eliminar">
              <span class="btn-icon-svg">${ICONS.trash}</span>
              <span class="btn-text">Eliminar</span>
            </button>
          </div>
        </div>
      </div>
    `
      )
      .join('');

    adminProductsGrid.querySelectorAll('.btn-edit-product').forEach((btn) => {
      btn.addEventListener('click', () => {
        const product = products.find((x) => x.id === btn.dataset.id);
        if (product) openProductFormModal(product);
      });
    });

    adminProductsGrid.querySelectorAll('.btn-delete-product').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!id) return;
        const product = products.find((x) => x.id === id);
        const name = product?.name ? `“${product.name}”` : 'este producto';
        const ok = window.UI?.confirm
          ? await UI.confirm({
              title: 'Eliminar producto',
              message: `¿Seguro que deseas eliminar ${name}? Esta acción no se puede deshacer.`,
              confirmText: 'Eliminar',
              cancelText: 'Cancelar',
              danger: true,
            })
          : confirm(`¿Seguro que deseas eliminar ${name}?`);
        if (!ok) return;

        btn.disabled = true;
        const { error: delErr } = await supabase.from('products').delete().eq('id', id);
        if (delErr) {
          btn.disabled = false;
          notify('No se pudo eliminar: ' + delErr.message, 'error');
          return;
        }
        notify('Producto eliminado.', 'success');
        loadAdminProducts();
      });
    });
  }

  function escapeAttr(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Función para comprimir imágenes usando canvas
  async function compressImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calcular nuevo tamaño manteniendo proporción, ancho máximo 1080px
        let { width, height } = img;
        if (width > 1080) {
          height = (height * 1080) / width;
          width = 1080;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Dibujar la imagen en el canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a Blob en formato WebP con calidad 0.8
        canvas.toBlob(resolve, 'image/webp', 0.8);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
});
