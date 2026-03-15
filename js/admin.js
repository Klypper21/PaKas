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

  // ——— Pestañas ———
  const tabs = document.querySelectorAll('.admin-tab');
  const sectionCompras = document.getElementById('section-compras');
  const sectionProductos = document.getElementById('section-productos');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const which = tab.dataset.tab;
      if (which === 'compras') {
        sectionCompras.classList.remove('hidden');
        sectionProductos.classList.add('hidden');
      } else {
        sectionCompras.classList.add('hidden');
        sectionProductos.classList.remove('hidden');
        loadAdminProducts();
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
      .select('*, products(name, stock)')
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
        <span>${i.products?.name || 'Producto'} x ${i.quantity}</span>
        <span>${(parseFloat(i.price) * i.quantity).toFixed(2)} CUP</span>
      </div>
    `
      )
      .join('');

    const deliveryInfo = order.delivery_requested && order.delivery_address
      ? `<p class="order-delivery"><strong>Domicilio:</strong> ${escapeHtml(order.delivery_address)}</p>`
      : '';
    const whatsappUrl = getWhatsAppUrl(order.user_phone);
    const msgCancelar = `Hola${order.user_name ? ' ' + order.user_name : ''}, te escribimos respecto a tu pedido en PaKas. Lamentamos informarte que hemos tenido que cancelar este pedido. Por favor, escríbenos si tienes dudas o si deseas realizar un nuevo pedido.`;
    const card = document.createElement('div');
    card.className = 'order-card';
    card.innerHTML = `
      <div class="order-info">
        <div class="order-header">
          <strong>Pedido ${order.id.slice(0, 8)}...</strong>
          <span class="status-badge status-pendiente">Pendiente</span>
        </div>
        <p>${order.user_name ? `<strong>${escapeHtml(order.user_name)}</strong>${order.user_phone ? ` · ${escapeHtml(order.user_phone)}` : ''}<br>` : ''}Total: ${parseFloat(order.total).toFixed(2)} CUP · ${new Date(order.created_at).toLocaleString('es')}</p>
        ${order.transfer_reference ? `<p>Ref. transferencia: ${order.transfer_reference}</p>` : ''}
        ${deliveryInfo}
        <div class="order-items">${itemsHtml}</div>
      </div>
      <div class="order-card-actions">
        <button type="button" class="btn-complete" data-id="${order.id}">Aprobar pago</button>
        <button type="button" class="btn-cancel" data-id="${order.id}" data-phone="${escapeHtml(order.user_phone || '')}" data-msg="${escapeHtml(msgCancelar)}">Cancelar pago</button>
        ${whatsappUrl ? `<a href="${whatsappUrl}" target="_blank" rel="noopener" class="btn-whatsapp" title="Escribir por WhatsApp">WhatsApp</a>` : ''}
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
        <span>${i.products?.name || 'Producto'} x ${i.quantity}</span>
        <span>${(parseFloat(i.price) * i.quantity).toFixed(2)} CUP</span>
      </div>
    `
      )
      .join('');

    const deliveryInfoCompleted = order.delivery_requested && order.delivery_address
      ? `<p class="order-delivery"><strong>Domicilio:</strong> ${escapeHtml(order.delivery_address)}</p>`
      : '';
    const whatsappUrlCompleted = getWhatsAppUrl(order.user_phone);
    const card = document.createElement('div');
    card.className = 'order-card';
    card.innerHTML = `
      <div class="order-info">
        <div class="order-header">
          <strong>Pedido ${order.id.slice(0, 8)}...</strong>
          <span class="status-badge status-completado">Completado</span>
        </div>
        <p>${order.user_name ? `<strong>${escapeHtml(order.user_name)}</strong>${order.user_phone ? ` · ${escapeHtml(order.user_phone)}` : ''}<br>` : ''}Total: ${parseFloat(order.total).toFixed(2)} CUP · ${new Date(order.created_at).toLocaleString('es')}</p>
        ${deliveryInfoCompleted}
        <div class="order-items">${itemsHtml}</div>
      </div>
      ${whatsappUrlCompleted ? `<div class="order-card-actions"><a href="${whatsappUrlCompleted}" target="_blank" rel="noopener" class="btn-whatsapp" title="Escribir por WhatsApp">WhatsApp</a></div>` : ''}
    `;
    container.appendChild(card);
  }

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
        alert('Error al actualizar: ' + updateErr.message);
        return;
      }
      if (!updated?.length) {
        btn.disabled = false;
        alert('No se pudo marcar como completado. Comprueba que tu usuario está en la lista de administradores (admin_users).');
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
      if (!confirm('¿Cancelar este pedido? Se abrirá WhatsApp para que le expliques al cliente.')) return;
      btn.disabled = true;
      const stockOk = await restoreStockForOrder(id);
      if (!stockOk) {
        btn.disabled = false;
        alert('No se pudo devolver el stock de este pedido. Revisa permisos o datos del pedido.');
        return;
      }
      const { data: updated, error: updateErr } = await supabase
        .from('orders')
        .update({ status: 'cancelado', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id');
      if (updateErr) {
        btn.disabled = false;
        alert('Error al cancelar: ' + updateErr.message);
        return;
      }
      if (!updated?.length) {
        btn.disabled = false;
        alert('No se pudo cancelar el pedido.');
        return;
      }
      const card = btn.closest('.order-card');
      if (card) card.remove();
      const whatsappUrl = getWhatsAppUrl(phone, msg);
      if (whatsappUrl) window.open(whatsappUrl, '_blank', 'noopener');
      location.reload();
    };
  });

  // ——— Productos (CRUD) ———
  const adminProductsGrid = document.getElementById('admin-products');
  const adminProductsEmpty = document.getElementById('admin-products-empty');
  const btnNewProduct = document.getElementById('btn-new-product');
  const productFormModal = document.getElementById('product-form-modal');
  const productFormTitle = document.getElementById('product-form-title');
  const productForm = document.getElementById('product-form');
  const productFormId = document.getElementById('product-form-id');
  const productName = document.getElementById('product-name');
  const productDescription = document.getElementById('product-description');
  const productCategory = document.getElementById('product-category');
  const productPrice = document.getElementById('product-price');
  const productStock = document.getElementById('product-stock');
  const productImage = document.getElementById('product-image');
  const productImageFile = document.getElementById('product-image-file');
  const productExtraImages = document.getElementById('product-extra-images');
  const productExtraImagesExisting = document.getElementById('product-extra-images-existing');

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
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });
    if (error) {
      console.error('Error subiendo imagen', error);
      alert('Error al subir una imagen: ' + error.message);
      return null;
    }
    const { data: publicData } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path);
    return publicData?.publicUrl || null;
  }

  function openProductFormModal(product = null) {
    productFormId.value = product ? product.id : '';
    productFormTitle.textContent = product ? 'Editar producto' : 'Nuevo producto';
    productName.value = product?.name ?? '';
    productDescription.value = product?.description ?? '';
    productCategory.value = product?.category ?? '';
    productPrice.value = product != null ? product.price : '';
    productStock.value = product != null ? (product.stock ?? 0) : 0;
    productImage.value = product?.image_url ?? '';

    if (productExtraImagesExisting) {
      const extras = parseExtraImages(product?.extra_images);
      productExtraImagesExisting.value = JSON.stringify(extras);
    }
    if (productImageFile) productImageFile.value = '';
    if (productExtraImages) productExtraImages.value = '';
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
    const id = productFormId.value.trim();

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

    const payload = {
      name: productName.value.trim(),
      description: productDescription.value.trim() || null,
      category: productCategory.value.trim() || null,
      price: parseFloat(productPrice.value) || 0,
      stock: parseInt(productStock.value, 10) || 0,
      image_url: mainImageUrl,
      extra_images: extraImages.length ? extraImages : null,
    };
    if (id) {
      const { error: err } = await supabase.from('products').update(payload).eq('id', id);
      if (err) {
        alert('Error al actualizar: ' + err.message);
        return;
      }
    } else {
      const { error: err } = await supabase.from('products').insert(payload);
      if (err) {
        alert('Error al crear: ' + err.message);
        return;
      }
    }
    closeProductFormModal();
    loadAdminProducts();
  });

  async function loadAdminProducts() {
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
          <button type="button" class="btn btn-outline btn-edit-product" data-id="${p.id}">Editar</button>
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
  }

  function escapeAttr(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
});
