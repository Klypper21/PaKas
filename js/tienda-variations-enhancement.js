/**
 * TIENDA VARIATIONS ENHANCEMENT
 * Este script se ejecuta DESPUÉS de tienda.js para añadir soporte de variaciones
 * Mejora la función openProductModal() sin modificar el archivo original
 * 
 * FIX: Mejora de carga de imágenes de variaciones
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Esperar a que tienda.js haya expuesto sus funciones
  await new Promise(resolve => {
    const checkDependencies = setInterval(() => {
      if (window.openProductModal && window.Variations && window.VariationsUI && window.productsCache !== undefined) {
        clearInterval(checkDependencies);
        resolve();
      }
    }, 50);
    setTimeout(() => {
      clearInterval(checkDependencies);
      resolve(); // Proceder aunque falten dependencias
    }, 3000);
  });

  // Guardar referencia al openProductModal original
  const originalOpenProductModal = window.openProductModal;
  const NEW_PRODUCT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

  function hasRecicladoTag(product) {
    return String(product?.category || '')
      .split(/[\s,]+/)
      .some((token) => token.trim().toLowerCase() === 'reciclado');
  }

  function hasNovedadTag(product) {
    if (!product?.created_at) return false;
    const createdAtMs = new Date(product.created_at).getTime();
    if (!Number.isFinite(createdAtMs)) return false;
    return Date.now() - createdAtMs < NEW_PRODUCT_WINDOW_MS;
  }

  /**
   * MEJORA: openProductModal mejorado que integra variaciones
   */
  window.openProductModal = async function(productId) {
    if (!window.supabase) return;

    const modal = document.getElementById('product-modal');
    const colorSelect = document.getElementById('modal-color');
    const tallaSelect = document.getElementById('modal-talla');
    const priceEl = document.getElementById('modal-price');
    const stockEl = document.getElementById('modal-stock');
    const addCartBtn = document.getElementById('modal-add-cart');
    const colorsPaletteContainer = document.getElementById('modal-colors-palette');

    if (!modal || !colorSelect || !tallaSelect) {
      console.warn('[Variations] Modal base no encontrado');
      return;
    }

    // Cargar el producto
    let product = (window.productsCache || []).find((p) => p.id === productId);
    if (!product) {
      try {
        const { data } = await supabase.from('products').select('*').eq('id', productId).single();
        product = data;
      } catch (err) {
        console.error('[Variations] Error cargando producto:', err);
        return;
      }
    }

    if (!product) return;

    // Abrir modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Llenar información base del producto
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-description');
    const modalCategory = document.getElementById('modal-category');
    const modalMaterial = document.getElementById('modal-material');
    const modalRecomendaciones = document.getElementById('modal-recomendaciones');

    if (modalTitle) modalTitle.textContent = product.name;
    if (modalDesc) modalDesc.textContent = product.description || 'Sin descripción.';
    if (modalCategory) {
      const categoryTags = [];
      if (hasRecicladoTag(product)) categoryTags.push('Reciclado');
      if (hasNovedadTag(product)) categoryTags.push('Novedad');
      modalCategory.textContent = categoryTags.join(' · ');
      modalCategory.hidden = categoryTags.length === 0;
    }
    if (modalMaterial) modalMaterial.textContent = product.material ? `Material: ${product.material}` : '';
    if (modalRecomendaciones) modalRecomendaciones.textContent = product.recomendaciones ? `Recomendaciones: ${product.recomendaciones}` : '';

    // Renderizar imágenes
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

    // Orden de galería: principal + extras + variaciones (sin duplicados)
    const normalizeImageUrl = (value) => (typeof value === 'string' ? value.trim() : '');
    const seenImages = new Set();
    let allImages = [];
    let variationImageMap = {};

    [mainUrl, ...extraImages]
      .map(normalizeImageUrl)
      .filter(Boolean)
      .forEach((imageUrl) => {
        const normalized = imageUrl.toLowerCase();
        if (seenImages.has(normalized)) return;
        seenImages.add(normalized);
        allImages.push(imageUrl);
      });

    console.log('[Variations] ===== INICIO CARGA GALERIA =====');
    console.log('[Variations] Imagenes iniciales (main + extras):', allImages.length);

    try {
      if (window.supabase) {
        const { data: allVariations, error: varError } = await supabase
          .from('product_variations')
          .select('color, talla, image_url, sku')
          .eq('parent_product_id', productId);

        if (varError) {
          console.error('[Variations] Error cargando variaciones:', varError);
        } else if (allVariations && allVariations.length > 0) {
          console.log(`[Variations] Variaciones cargadas: ${allVariations.length}`);
          let addedVariationImages = 0;

          allVariations.forEach((variation) => {
            const color = (variation.color || '').trim();
            const talla = (variation.talla || '').trim();
            const key = `${color}-${talla}`;
            const imageUrl = normalizeImageUrl(variation.image_url);

            if (!imageUrl) {
              console.log(`[Variations] ${key}: sin imagen`);
              return;
            }

            variationImageMap[key] = imageUrl;
            const normalized = imageUrl.toLowerCase();
            if (seenImages.has(normalized)) {
              console.log(`[Variations] ${key}: ya estaba en galeria`);
              return;
            }

            seenImages.add(normalized);
            allImages.push(imageUrl);
            addedVariationImages += 1;
            console.log(`[Variations] ${key}: agregada a galeria (indice ${allImages.length - 1})`);
          });

          console.log(`[Variations] Imagenes de variaciones agregadas: ${addedVariationImages}`);
        } else {
          console.log('[Variations] No hay variaciones para este producto');
        }
      }
    } catch (err) {
      console.error('[Variations] Error cargando imagenes de variaciones:', err);
    }
    
    console.log(`[Variations] 📸 GALERÍA FINAL: ${allImages.length} imágenes totales`);
    console.log('[Variations] Imágenes en galería:', allImages.map((img, i) => `${i}: ${img.substring(0, 30)}...`));

    const carouselInner = document.getElementById('modal-carousel-inner');
    const indicators = document.getElementById('modal-carousel-indicators');

    if (carouselInner && indicators) {
      carouselInner.innerHTML = allImages
        .map((url, i) => `<img src="${url}" alt="${product.name} - ${i + 1}">`)
        .join('');
      indicators.innerHTML = allImages
        .map((_, i) => `<div class="indicator ${i === 0 ? 'active' : ''}" data-index="${i}"></div>`)
        .join('');

      // Verificar que se renderizó correctamente
      const imgElements = carouselInner.querySelectorAll('img');
      console.log(`[Variations] ✅ CAROUSEL RENDERIZADO: ${imgElements.length} imágenes en HTML`);
      imgElements.forEach((img, i) => {
        console.log(`[Variations]   ${i + 1}. ${img.src.substring(0, 50)}...`);
      });

      // Setup carousel controls
      let currentIndex = 0;
      const totalImages = allImages.length;

      function updateCarousel() {
        carouselInner.style.transform = `translateX(-${currentIndex * 100}%)`;
        indicators.querySelectorAll('.indicator').forEach((ind, i) => {
          ind.classList.toggle('active', i === currentIndex);
        });
      }

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

      indicators.addEventListener('click', (e) => {
        if (e.target.classList.contains('indicator')) {
          currentIndex = parseInt(e.target.dataset.index);
          updateCarousel();
        }
      });

      // FIX: switchToVariationImage más robusta
      window.switchToVariationImage = (imageUrl) => {
        if (!imageUrl) {
          console.log('[Variations] Sin imagen para variación, mostrando principal');
          currentIndex = 0;
          updateCarousel();
          return;
        }

        console.log(`[Variations] Cambiando a imagen: ${imageUrl.substring(0, 50)}...`);

        // Buscar imagen en allImages
        const index = allImages.indexOf(imageUrl);
        if (index !== -1) {
          console.log(`[Variations] Imagen encontrada en índice ${index}`);
          currentIndex = index;
          updateCarousel();
        } else {
          console.warn(`[Variations] ADVERTENCIA: Imagen no encontrada en galería. URL: ${imageUrl}`);
          // Fallback a imagen principal
          currentIndex = 0;
          updateCarousel();
        }
      };
    }

    // INTEGRACIÓN DE VARIACIONES
    if (window.Variations && window.VariationsUI) {
      try {
        const variations = await window.Variations.loadVariations(productId);

        if (variations && variations.length > 0) {
          console.log(`[Variations] Encontradas ${variations.length} variaciones para producto`);
          
          // Hay variaciones disponibles
          await window.VariationsUI.initializeModalVariations(
            productId,
            modal,
            {
              onVariationChange: async (variation) => {
                if (variation) {
                  console.log(`[Variations] ✅ Variación seleccionada: ${variation.color}-${variation.talla}`);
                  console.log(`[Variations]   - SKU: ${variation.sku}`);
                  console.log(`[Variations]   - Precio: ${variation.price}`);
                  console.log(`[Variations]   - Stock: ${variation.stock}`);
                  console.log(`[Variations]   - Imagen: ${variation.image_url ? variation.image_url.substring(0, 50) + '...' : 'NO TIENE'}`);
                  
                  addCartBtn.dataset.sku = variation.sku;
                  addCartBtn.dataset.variationId = variation.id;
                  addCartBtn.disabled = !variation.in_stock;
                  
                  // FIX: Cambiar imagen si esta variación tiene imagen específica
                  if (variation.image_url) {
                    console.log(`[Variations] 🖼️  Llamando switchToVariationImage...`);
                    if (window.switchToVariationImage) {
                      window.switchToVariationImage(variation.image_url);
                    } else {
                      console.warn('[Variations] switchToVariationImage no está disponible');
                    }
                  } else {
                    console.log(`[Variations] Variación sin imagen, mostrando principal`);
                    if (window.switchToVariationImage) {
                      window.switchToVariationImage(null);
                    }
                  }
                } else {
                  console.log('[Variations] Variación deseleccionada');
                  delete addCartBtn.dataset.sku;
                  delete addCartBtn.dataset.variationId;
                  addCartBtn.disabled = true;
                }
              },
              onStockChange: (stock, inStock) => {
                if (addCartBtn) {
                  addCartBtn.disabled = !inStock;
                }
              }
            }
          );
        } else {
          console.log('[Variations] No hay variaciones, usando opciones estándar');
          populateStandardOptions(product, colorSelect, tallaSelect, colorsPaletteContainer);
        }
      } catch (err) {
        console.warn('[Variations] Error procesando variaciones:', err);
        populateStandardOptions(product, colorSelect, tallaSelect, colorsPaletteContainer);
      }
    } else {
      console.warn('[Variations] window.Variations o window.VariationsUI no disponibles');
      populateStandardOptions(product, colorSelect, tallaSelect, colorsPaletteContainer);
    }

    // Configurar precio y stock
    if (priceEl) {
      priceEl.textContent = parseFloat(product.price).toFixed(2) + ' CUP';
    }

    if (stockEl) {
      stockEl.textContent = (product.stock ?? 10) > 0 ? `En stock (${product.stock})` : 'Agotado';
      stockEl.className = 'product-modal-stock ' + ((product.stock ?? 10) > 0 ? '' : 'out-of-stock');
    }

    // Configurar botón de carrito
    if (addCartBtn) {
      addCartBtn.dataset.id = product.id;
      addCartBtn.dataset.name = product.name;
      addCartBtn.dataset.price = product.price;
      addCartBtn.dataset.image = mainUrl;

      const inCart = window.Cart?.get?.().some(item => item.id === product.id) ? true : false;
      addCartBtn.dataset.inCart = inCart ? '1' : '0';
      addCartBtn.className = `btn ${inCart ? 'btn-outline in-cart' : 'btn-primary'} btn-block`;
      addCartBtn.disabled = (product.stock ?? 10) <= 0;
      addCartBtn.textContent = inCart ? 'En el carrito' : 'Añadir al carrito';
      addCartBtn.title = inCart ? 'Ir al carrito' : '';

      addCartBtn.onclick = async (ev) => {
        ev.preventDefault();
        const inCartNow = window.Cart?.get?.().some(item => item.id === product.id) ? true : false;
        if (inCartNow) {
          location.href = 'carrito.html';
          return;
        }

        const selectedColor = colorSelect?.value || '';
        const selectedTalla = tallaSelect?.value || '';
        const sku = addCartBtn.dataset.sku || null;
        const hasOptions = (product.colores && product.colores.trim()) || (product.talla && product.talla.trim());

        if (hasOptions && (!selectedColor || !selectedTalla)) {
          if (window.UI?.toast) window.UI.toast('Por favor selecciona color y talla.', 'error');
          return;
        }

        try {
          const notify = (msg, type = 'info', opts = {}) =>
            window.UI?.toast ? window.UI.toast(msg, type, opts) : null;

          const item = {
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
            image_url: mainUrl,
            sku: sku,
            options: hasOptions ? { color: selectedColor, talla: selectedTalla } : null
          };

          const res = await window.Cart?.addWithStock(item, 1, { notify });
          if (res?.ok) {
            notify(
              'Producto añadido al <span class="toast-carrito-link">carrito</span>',
              'success',
              { allowHtml: true }
            );
          }
        } catch (err) {
          console.error('Error al agregar al carrito:', err);
          if (window.UI?.toast) window.UI.toast('Error al agregar producto', 'error');
        }
      };
    }

    // Cargar reviews
    try {
      const { data: reviews } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      const avg =
        reviews?.length > 0
          ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length
          : 0;

      const ratingEl = document.getElementById('modal-rating');
      if (ratingEl) {
        const rounded = Math.round(avg * 10) / 10;
        ratingEl.innerHTML = `
          <span class="stars-display" title="${rounded} de 5">
            ${renderStars(rounded)}
          </span>
          <span class="rating-count">${reviews?.length || 0} ${reviews?.length === 1 ? 'reseña' : 'reseñas'}</span>
        `;
      }

      // Mostrar lista de reviews
      const reviewsList = document.getElementById('modal-reviews-list');
      if (reviewsList) {
        reviewsList.innerHTML = (reviews || [])
          .map(r => `
            <div class="review-item">
              <div class="review-header">
                <span class="review-author">${escapeHtml(r.user_name || 'Usuario')}</span>
                <span class="stars-display">${renderStars(r.rating)}</span>
                <span class="review-date">${formatDate(r.created_at)}</span>
              </div>
              ${r.comment ? `<p class="review-comment">${escapeHtml(r.comment)}</p>` : ''}
            </div>
          `)
          .join('');

        if (!reviews?.length) {
          reviewsList.innerHTML = '<p class="no-reviews">Aún no hay reseñas. ¡Sé el primero en opinar!</p>';
        }
      }
    } catch (reviewErr) {
      console.warn('Error al cargar reviews:', reviewErr);
    }
  };

  /**
   * Helper: Pobla selectores estándar (cuando no hay variaciones)
   */
  function populateStandardOptions(product, colorSelect, tallaSelect, paleteContainer) {
    colorSelect.innerHTML = '<option value="">Seleccionar</option>';
    tallaSelect.innerHTML = '<option value="">Seleccionar</option>';

    if (product.colores) {
      let colorsArray = [];
      try {
        colorsArray = JSON.parse(product.colores);
        if (!Array.isArray(colorsArray)) colorsArray = [];
      } catch {
        const names = product.colores.split(',').map(c => c.trim()).filter(Boolean);
        colorsArray = names.map(name => {
          const defaultColors = window.ColorPalette?.getDefaultColors?.() || [];
          const color = defaultColors.find(c => c.name.toLowerCase() === name.toLowerCase());
          return color || { name, hex: '#999999' };
        });
      }

      colorsArray.forEach(color => {
        const option = document.createElement('option');
        option.value = color.name || color.hex;
        option.textContent = color.name || color.hex;
        colorSelect.appendChild(option);
      });

      // Renderizar paleta visual
      if (paleteContainer && window.ColorPalette) {
        const defaultColors = window.ColorPalette.getDefaultColors?.() || [];
        paleteContainer.innerHTML = colorsArray.map(color => {
          const hexColor = color.hex || '#999999';
          return `
            <div class="modal-color-option" 
                 data-color-value="${color.name || color.hex}"
                 title="${color.name || color.hex}">
              <div class="modal-color-circle" style="background-color: ${hexColor};"></div>
            </div>
          `;
        }).join('');

        paleteContainer.querySelectorAll('.modal-color-option').forEach(option => {
          option.addEventListener('click', () => {
            const colorValue = option.dataset.colorValue;
            colorSelect.value = colorValue;
            paleteContainer.querySelectorAll('.modal-color-option').forEach(opt => {
              opt.classList.toggle('selected', opt === option);
            });
          });
        });
      }
    }

    if (product.talla) {
      const tallas = product.talla.split(',').map(t => t.trim()).filter(Boolean);
      tallas.forEach(talla => {
        const option = document.createElement('option');
        option.value = talla;
        option.textContent = talla;
        tallaSelect.appendChild(option);
      });
    }
  }

  /**
   * Helpers para renderizar
   */
  function renderStars(avg) {
    const n = Math.round(avg);
    return '<span class="star filled">★</span>'.repeat(n) + '<span class="star">☆</span>'.repeat(5 - n);
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

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});
