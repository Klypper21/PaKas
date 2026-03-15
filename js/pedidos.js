document.addEventListener('DOMContentLoaded', async () => {
  const list = document.getElementById('orders-list');
  const empty = document.getElementById('orders-empty');

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  const user = await Auth.getUser();
  if (!user) {
    list.innerHTML = '<p>Inicia sesión para ver tus pedidos.</p>';
    return;
  }

  if (!supabase) {
    list.innerHTML = '<p>Configura Supabase en js/config.js</p>';
    return;
  }

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    list.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    return;
  }

  if (!orders?.length) {
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  for (const order of orders) {
    const { data: items } = await supabase
      .from('order_items')
      .select('*, products(name, image_url, price)')
      .eq('order_id', order.id);

    const itemsHtml = (items || []).map(i => {
      const name = i.products?.name || 'Producto';
      const unitPrice = parseFloat(i.price ?? i.products?.price ?? 0) || 0;
      const imageUrl = i.products?.image_url || 'https://placehold.co/80x100/1a1a2e/eaeaea?text=Img';
      const quantity = Number(i.quantity) || 0;
      const lineTotal = unitPrice * quantity;
      return `
      <div class="order-product">
        <img src="${imageUrl}" alt="">
        <div class="details">
          <h3>${name}</h3>
          <p>${unitPrice.toFixed(2)} CUP x ${quantity}</p>
        </div>
        <p>${lineTotal.toFixed(2)} CUP</p>
      </div>
    `;
    }).join('');

    const card = document.createElement('div');
    card.className = 'order-card';
    card.innerHTML = `
      <div class="order-header">
        <div>
          <strong>Pedido ${order.id.slice(0, 8)}...</strong>
          <span class="status-badge status-${order.status}">${order.status}</span>
        </div>
        <div>
          ${order.user_name ? `<span class="order-user-name">${escapeHtml(order.user_name)}</span> · ` : ''}${parseFloat(order.total).toFixed(2)} CUP · ${new Date(order.created_at).toLocaleDateString('es')}
        </div>
      </div>
      <div class="order-items">${itemsHtml}</div>
      ${order.transfer_reference ? `<p style="margin-top:0.5rem;font-size:0.9rem">Ref. transferencia: ${order.transfer_reference}</p>` : ''}
    `;
    list.appendChild(card);
  }
});
