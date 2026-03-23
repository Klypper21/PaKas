/**
 * TIENDA VARIATIONS ENHANCEMENT - VERSIÓN MEJORADA
 * Corrige problemas con carga de imágenes de variaciones
 * 
 * CAMBIOS:
 * 1. switchToVariationImage ahora agrega dinámicamente imágenes faltantes
 * 2. Mejor manejo de variationImageMap
 * 3. Logging mejorado para debugging
 * 4. Fallback a imagen principal si no hay imagen de variación
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
    if (modalCategory) modalCategory.textContent = product.category || '';
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

    // MEJORA: Cargar imágenes de variaciones desde BD
    let allImages = [mainUrl, ...extraImages.filter((u) => u && u !== mainUrl)];
    let variationImageMap = {}; // Mapear variaciones a sus imágenes
    
    console.log(`[Variations] Cargando imágenes para producto ${productId}...`);
    
    try {
      if (window.supabase) {
        const { data: variationsWithImages, error: varErr } = await supabase
          .from('product_variations')
          .select('color, talla, image_url, sku')
          .eq('parent_product_id', productId);
        
        if (varErr) {
          console.warn(`[Variations] Error cargando variaciones: ${varErr.message}`);
        }
        
        if (variationsWithImages && variationsWithImages.length > 0) {
          console.log(`[Variations] Encontradas ${variationsWithImages.length} variaciones con datos de imagen`);
          
          // Construir mapa de variaciones a imágenes
          variationsWithImages.forEach(v => {
            const key = `${v.color}-${v.talla}`;
            if (v.image_url) {
              variationImageMap[key] = v.image_url;
              console.log(`[Variations] ${key}: ${v.image_url.substring(0, 50)}...`);
              
              // Agregar imagen a la galería si no está duplicada
              if (!allImages.includes(v.image_url)) {
                allImages.push(v.image_url);
              }
            } else {
              console.log(`[Variations] ${key}: sin imagen`);
            }
          });
        } else {
          console.log(`[Variations] No hay variaciones con imágenes para este producto`);
        }
      }
    } catch (err) {
      console.warn('[Variations] Error cargando imágenes de variaciones:', err);
    }

    console.log(`[Variations] Galería final: ${allImages.length} imágenes`);

    const carouselInner = document.getElementById('modal-carousel-inner');
    const indicators = document.getElementById('modal-carousel-indicators');

    if (carouselInner && indicators) {
      carouselInner.innerHTML = allImages
        .map((url, i) => `<img src="${url}" alt="${product.name} - ${i + 1}" loading="lazy">`)
        .join('');
      indicators.innerHTML = allImages
        .map((_, i) => `<div class="indicator ${i === 0 ? 'active' : ''}" data-index="${i}"></div>`)
        .join('');

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

      // MEJORA: switchToVariationImage MÁS ROBUSTA
      // Ahora agrega dinámicamente imágenes que no estaban previamente
      window.switchToVariationImage = (imageUrl) => {
        if (!imageUrl) {
          console.log('[Variations] No hay imagen de variación, mostrando principal');
          currentIndex = 0;
          updateCarousel();
          return;
        }

        console.log(`[Variations] Intentando cambiar a imagen: ${imageUrl.substring(0, 50)}...`);

        // Opción 1: La imagen ya está en la galería
        if (allImages.includes(imageUrl)) {
          const index = allImages.indexOf(imageUrl);
          console.log(`[Variations] Imagen encontrada en índice ${index}`);
          currentIndex = index;
          updateCarousel();
          return;
        }

        // Opción 2: Agregar la imagen dinámicamente si NO estaba
        console.log('[Variations] Imagen no estaba en galería, agregando dinámicamente...');
        allImages.push(imageUrl);
        
        // Re-renderizar carousel
        carouselInner.innerHTML = allImages
          .map((url, i) => `<img src="${url}" alt="${product.name} - ${i + 1}" loading="lazy">`)
          .join('');
        
        // Re-renderizar indicadores
        indicators.innerHTML = allImages
          .map((_, i) => `<div class="indicator ${i === (allImages.length - 1) ? 'active' : ''}" data-index="${i}"></div>`)
          .join('');
        
        // Re-agregar event listeners a indicadores
        indicators.addEventListener('click', (e) => {
          if (e.target.classList.contains('indicator')) {
            currentIndex = parseInt(e.target.dataset.index);
            updateCarousel();
          }
        });
        
        // Cambiar a la nueva imagen
        currentIndex = allImages.length - 1;
        updateCarousel();
        console.log(`[Variations] Imagen agregada en índice ${currentIndex}`);
      };
    }

    // INTEGRACIÓN DE VARIACIONES
    if (window.Variations && window.VariationsUI) {
      try {
        const variations = await window.Variations.loadVariations(productId);

        if (variations && variations.length > 0) {
          console.log(`[Variations] Inicializando modal con ${variations.length} variaciones`);
          
          // Hay variaciones disponibles
          await window.VariationsUI.initializeModalVariations(
            productId,
            modal,
            {
              onVariationChange: async (variation) => {
                if (variation) {
                  console.log(`[Variations] Variación seleccionada: ${variation.color}-${variation.talla}, imagen: ${variation.image_url ? 'Sí' : 'No'}`);
                  
                  addCartBtn.dataset.sku = variation.sku;
                  addCartBtn.dataset.variationId = variation.id;
                  addCartBtn.disabled = !variation.in_stock;
                  
                  // MEJORA: Cambiar imagen si esta variación tiene imagen específica
                  if (variation.image_url && window.switchToVariationImage) {
                    window.switchToVariationImage(variation.image_url);
                  } else if (window.switchToVariationImage) {
                    // Fallback a imagen principal si no hay imagen de variación
                    console.log('[Variations] Variación sin imagen, mostrando principal');
                    window.switchToVariationImage(null);
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
              { onclick: () => (location.href = 'carrito.html') }
            );
            addCartBtn.className = 'btn btn-outline in-cart btn-block';
            addCartBtn.textContent = 'En el carrito';
            addCartBtn.title = 'Ir al carrito';
          } else if (res?.error) {
            notify(`No hay suficiente stock. ${res.error}`, 'warning');
          }
        } catch (err) {
          console.error('Error al añadir al carrito:', err);
          if (window.UI?.toast) window.UI.toast('Error al añadir producto', 'error');
        }
      };
    }
  };

  // Mantener la función populateStandardOptions que usaba el original
  function populateStandardOptions(product, colorSelect, tallaSelect, colorsPaletteContainer) {
    if (!product) return;

    let colors = [];
    if (product.colores) {
      const parsedColors = window.ColorPalette?.colorsFromJSON?.(product.colores) || [];
      if (parsedColors.length) {
        colors = parsedColors
          .map(color => (color?.name || color?.hex || '').trim())
          .filter(Boolean);
      } else {
        colors = product.colores.split(',').map(c => c.trim()).filter(Boolean);
      }
    }
    const tallas = (product.talla ? product.talla.split(',').map(t => t.trim()) : []).filter(Boolean);

    if (colorSelect) {
      colorSelect.innerHTML = '<option value="">Seleccionar color</option>';
      colors.forEach(color => {
        const option = document.createElement('option');
        option.value = color;
        option.textContent = color;
        colorSelect.appendChild(option);
      });
    }

    if (tallaSelect) {
      tallaSelect.innerHTML = '<option value="">Seleccionar talla</option>';
      tallas.forEach(ta => {
        const option = document.createElement('option');
        option.value = ta;
        option.textContent = ta;
        tallaSelect.appendChild(option);
      });
    }

    if (colorsPaletteContainer && product.colores) {
      colorsPaletteContainer.innerHTML = '';
    }
  }

  // Llamar al original para configurar los demás listeners
  window.openProductModal.isWrapped = true;
});
