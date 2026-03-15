const DELIVERY_COST_CUP = 150;

document.addEventListener('DOMContentLoaded', () => {
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

    cartItems.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${item.image_url || 'https://placehold.co/80x100/1a1a2e/eaeaea?text=Img'}" alt="">
        <div class="details">
          <h3>${item.name}</h3>
          <p>${parseFloat(item.price).toFixed(2)} CUP x ${item.quantity}</p>
        </div>
        <p>${(parseFloat(item.price) * item.quantity).toFixed(2)} CUP</p>
        <button class="remove" onclick="removeFromCart('${item.id}')">Eliminar</button>
      </div>
    `).join('');
  }

  window.removeFromCart = (id) => {
    Cart.remove(id);
    renderCart();
  };

  deliveryCheckbox?.addEventListener('change', () => {
    if (deliveryCheckbox.checked) {
      deliveryAddressWrap?.classList.remove('hidden');
    } else {
      deliveryAddressWrap?.classList.add('hidden');
      if (deliveryAddress) deliveryAddress.value = '';
    }
    updateModalTotals();
  });

  btnCheckout?.addEventListener('click', async () => {
    const user = await Auth.getUser();
    if (!user) {
      location.href = 'login.html?redirect=carrito.html';
      return;
    }
    const cart = Cart.get();
    if (!cart.length) return;
    orderRef.textContent = 'EMP-' + Date.now().toString(36).toUpperCase();
    transferRef.value = '';
    if (deliveryCheckbox) deliveryCheckbox.checked = false;
    if (deliveryAddressWrap) deliveryAddressWrap.classList.add('hidden');
    if (deliveryAddress) deliveryAddress.value = '';
    updateModalTotals();
    modal.classList.remove('hidden');
  });

  btnCancel?.addEventListener('click', () => modal.classList.add('hidden'));

  btnConfirm?.addEventListener('click', async () => {
    const user = await Auth.getUser();
    if (!user || !supabase) return;
    const profile = await Auth.getProfile(user.id);
    if (!profile?.full_name?.trim() || !profile?.phone?.trim()) {
      alert('Completa tu perfil (nombre y teléfono) antes de realizar el pedido.');
      return;
    }
    const cart = Cart.get();
    if (!cart.length) return;
    const subtotal = getSubtotal();
    const withDelivery = deliveryCheckbox?.checked === true;
    const address = (deliveryAddress?.value || '').trim();
    if (withDelivery && !address) {
      alert('Indica la dirección de entrega para el envío a domicilio.');
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
      alert('Error al crear pedido: ' + orderErr.message);
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
      alert('Error al guardar items: ' + itemsErr.message);
      return;
    }

    // Reservar stock inmediatamente para este pedido (estado pendiente)
    const { data: stockItems, error: stockErr } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', order.id);
    if (stockErr) {
      alert('Pedido creado pero hubo un error reservando el stock: ' + stockErr.message);
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
    alert('Pedido creado. Estado: Pago pendiente. Realiza la transferencia y espera la confirmación.');
    location.href = 'pedidos.html';
  });

  renderCart();
});
