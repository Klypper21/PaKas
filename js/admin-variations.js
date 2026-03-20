/**
 * Admin Variations Manager
 * Gestiona la creación, edición y eliminación de variaciones de productos
 * Se integra con el panel admin y Supabase
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Esperar a que Auth esté listo
  await new Promise(resolve => {
    if (window.Auth) resolve();
    else document.addEventListener('auth-ready', resolve);
  });

  // Verificar autenticación
  if (!window.Auth || !await window.Auth.getUser()) return;

  if (!window.supabase) {
    console.error('Supabase no configurado');
    return;
  }

  const notify = (msg, type = 'info') => {
    if (window.UI?.toast) UI.toast(msg, type);
    else console.log(type.toUpperCase() + ':', msg);
  };

  // ——— Referencias DOM ———
  let productSelect, variationsContent, variationsList, variationsEmpty;
  let btnNewVariation, variationFormModal, variationForm;
  let variationFormId, variationParentProductId, variationSku, variationColor;
  let variationTalla, variationPrice, variationStock, variationImage;

  function ensureVariationsElements() {
    if (productSelect && variationFormModal) return;
    productSelect = document.getElementById('variations-product-select');
    variationsContent = document.getElementById('variations-content');
    variationsList = document.getElementById('variations-list');
    variationsEmpty = document.getElementById('variations-empty');
    btnNewVariation = document.getElementById('btn-new-variation');
    variationFormModal = document.getElementById('variation-form-modal');
    variationForm = document.getElementById('variation-form');
    variationFormId = document.getElementById('variation-form-id');
    variationParentProductId = document.getElementById('variation-parent-product-id');
    variationSku = document.getElementById('variation-sku');
    variationColor = document.getElementById('variation-color');
    variationTalla = document.getElementById('variation-talla');
    variationPrice = document.getElementById('variation-price');
    variationStock = document.getElementById('variation-stock');
    variationImage = document.getElementById('variation-image');
  }

  // ——— Tab switching ———
  const tabVariations = document.querySelector('[data-tab="variaciones"]');
  const sectionVariations = document.getElementById('section-variaciones');

  if (tabVariations && sectionVariations) {
    tabVariations.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
      tabVariations.classList.add('active');
      sectionVariations.classList.remove('hidden');
      
      ensureVariationsElements();
      loadProductsForVariations();
    });
  }

  // ——— Cargar productos disponibles ———
  async function loadProductsForVariations() {
    ensureVariationsElements();
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      notify('Error al cargar productos: ' + error.message, 'error');
      return;
    }

    const currentValue = productSelect.value;
    productSelect.innerHTML = '<option value="">Selecciona un producto...</option>';
    
    if (products && products.length) {
      products.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        productSelect.appendChild(opt);
      });
    }

    if (currentValue) productSelect.value = currentValue;
  }

  // ——— Cargar variaciones de un producto ———
  async function loadVariationsForProduct(productId) {
    if (!productId) {
      variationsContent.style.display = 'none';
      return;
    }

    ensureVariationsElements();
    variationsContent.style.display = 'block';
    variationsList.innerHTML = '<div class="loading">Cargando...</div>';

    const { data, error } = await supabase
      .from('product_variations')
      .select('*')
      .eq('parent_product_id', productId)
      .order('color, talla', { ascending: true });

    if (error) {
      notify('Error al cargar variaciones: ' + error.message, 'error');
      variationsList.innerHTML = '';
      return;
    }

    const variations = data || [];

    if (!variations.length) {
      variationsList.innerHTML = '';
      variationsEmpty.classList.remove('hidden');
      return;
    }

    variationsEmpty.classList.add('hidden');
    variationsList.innerHTML = variations
      .map(v => `
        <div class="variation-card">
          <div class="variation-card-header">
            <div class="variation-card-title">
              <strong>${escapeHtml(v.sku)}</strong>
              <span class="variation-card-subtitle">${escapeHtml(v.color)} / ${escapeHtml(v.talla)}</span>
            </div>
            <div class="variation-card-stock ${v.stock > 0 ? 'in-stock' : 'out-of-stock'}">
              <span>${v.stock}</span> en stock
            </div>
          </div>
          <div class="variation-card-details">
            <div class="variation-detail-item">
              <span class="variation-detail-label">Precio:</span>
              <span class="variation-detail-value">${parseFloat(v.price).toFixed(2)} CUP</span>
            </div>
            <div class="variation-detail-item">
              <span class="variation-detail-label">Creado:</span>
              <span class="variation-detail-value">${new Date(v.created_at).toLocaleDateString('es')}</span>
            </div>
          </div>
          <div class="variation-card-actions">
            <button type="button" class="btn btn-outline btn-sm btn-edit-variation" data-id="${v.id}" data-product_id="${productId}">
              Editar
            </button>
            <button type="button" class="btn btn-outline btn-sm btn-danger btn-delete-variation" data-id="${v.id}">
              Eliminar
            </button>
          </div>
        </div>
      `)
      .join('');

    // Event listeners para editar
    variationsList.querySelectorAll('.btn-edit-variation').forEach(btn => {
      btn.addEventListener('click', () => {
        const variation = variations.find(v => v.id === btn.dataset.id);
        if (variation) openVariationFormModal(variation, productId);
      });
    });

    // Event listeners para eliminar
    variationsList.querySelectorAll('.btn-delete-variation').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const variation = variations.find(v => v.id === id);
        const sku = variation?.sku || 'esta variación';
        
        const ok = confirm(`¿Eliminar la variación "${sku}"? Esta acción no se puede deshacer.`);
        if (!ok) return;

        btn.disabled = true;
        const { error } = await supabase
          .from('product_variations')
          .delete()
          .eq('id', id);

        if (error) {
          btn.disabled = false;
          notify('Error al eliminar: ' + error.message, 'error');
          return;
        }

        notify('Variación eliminada correctamente', 'success');
        loadVariationsForProduct(productId);
      });
    });
  }

  // ——— Selector de producto ———
  productSelect.addEventListener('change', (e) => {
    const productId = e.target.value;
    loadVariationsForProduct(productId);
  });

  // ——— Modal de variación ———
  function openVariationFormModal(variation = null, productId = null) {
    ensureVariationsElements();

    if (!productId && variation?.parent_product_id) {
      productId = variation.parent_product_id;
    }

    if (!productId) {
      notify('Selecciona un producto primero', 'error');
      return;
    }

    const isEdit = !!variation?.id;
    document.getElementById('variation-form-title').textContent = 
      isEdit ? 'Editar variación' : 'Nueva variación';

    variationFormId.value = variation?.id || '';
    variationParentProductId.value = productId;
    variationSku.value = variation?.sku || '';
    variationColor.value = variation?.color || '';
    variationTalla.value = variation?.talla || '';
    variationPrice.value = variation?.price || '';
    variationStock.value = variation?.stock || '0';
    variationImage.value = variation?.image_url || '';

    variationFormModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    variationSku.focus();
  }

  function closeVariationFormModal() {
    variationFormModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // ——— Event listeners del modal ———
  variationFormModal.querySelector('.variation-form-backdrop').addEventListener('click', closeVariationFormModal);
  variationFormModal.querySelector('.variation-form-close').addEventListener('click', closeVariationFormModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !variationFormModal.classList.contains('hidden')) {
      closeVariationFormModal();
    }
  });

  // ——— Botón Nueva variación ———
  btnNewVariation.addEventListener('click', () => {
    const selectedProductId = productSelect.value;
    if (!selectedProductId) {
      notify('Selecciona un producto primero', 'warning');
      return;
    }
    openVariationFormModal(null, selectedProductId);
  });

  // ——— Submit del formulario de variación ———
  variationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    ensureVariationsElements();

    const id = variationFormId.value.trim();
    const parentProductId = variationParentProductId.value.trim();
    const sku = variationSku.value.trim();
    const color = variationColor.value.trim();
    const talla = variationTalla.value.trim();
    const price = parseFloat(variationPrice.value) || 0;
    const stock = parseInt(variationStock.value, 10) || 0;
    const imageUrl = variationImage.value.trim() || null;

    // Validaciones
    if (!sku || !color || !talla) {
      notify('Completa todos los campos requeridos', 'warning');
      return;
    }

    if (price < 0 || stock < 0) {
      notify('Precio y stock no pueden ser negativos', 'warning');
      return;
    }

    const payload = {
      sku,
      color,
      talla,
      price,
      stock,
      image_url: imageUrl,
    };

    let submitBtn = variationForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      if (id) {
        // Editar
        const { error } = await supabase
          .from('product_variations')
          .update(payload)
          .eq('id', id);

        if (error) throw error;
        notify('Variación actualizada correctamente', 'success');
      } else {
        // Crear
        const { error } = await supabase
          .from('product_variations')
          .insert({
            parent_product_id: parentProductId,
            ...payload,
          });

        if (error) throw error;
        notify('Variación creada correctamente', 'success');
      }

      closeVariationFormModal();
      loadVariationsForProduct(parentProductId);
    } catch (error) {
      notify('Error: ' + (error?.message || 'Desconocido'), 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // ——— Utilidades ———
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  // Cargar productos al iniciar
  loadProductsForVariations();
});
