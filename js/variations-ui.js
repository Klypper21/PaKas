/**
 * PRODUCT MODAL VARIATIONS INTEGRATION
 * Mejora el modal de producto para trabajar con el sistema de variaciones
 * Se ejecuta después de Variations.js y se integra con tienda.js
 */

const VariationsUI = (() => {
  /**
   * Inicializa los selectores de variaciones en el modal
   * @param {number} productId - ID del producto (padre)
   * @param {HTMLElement} modalElement - Referencia al modal
   * @param {Object} callbacks - { onVariationChange, onStockChange }
   */
  const initializeModalVariations = async (productId, modalElement, callbacks = {}) => {
    const { onVariationChange, onStockChange } = callbacks;

    // Obtener referencias a elementos del modal
    const colorSelect = modalElement.querySelector('#modal-color');
    const tallaSelect = modalElement.querySelector('#modal-talla');
    const colorsPaletteContainer = modalElement.querySelector('#modal-colors-palette');
    const stockInfoElement = modalElement.querySelector('#modal-stock');
    const priceElement = modalElement.querySelector('#modal-price');

    if (!colorSelect || !tallaSelect) {
      console.warn('Selectores de variación no encontrados en el modal');
      return;
    }

    // Cargar variaciones
    const variations = await Variations.loadVariations(productId);
    
    if (!variations || variations.length === 0) {
      console.log('No hay variaciones disponibles para este producto');
      return;
    }

    const attributes = variationsCache?.get(productId)?.attributes || 
                       Variations.extractAttributes(variations);

    // Limpiar selectores
    colorSelect.innerHTML = '<option value="">Seleccionar color</option>';
    tallaSelect.innerHTML = '<option value="">Seleccionar talla</option>';

    // Poblar colores
    (attributes.colors || []).forEach(color => {
      const option = document.createElement('option');
      option.value = color;
      option.textContent = color;
      colorSelect.appendChild(option);
    });

    // Poblar tallas
    (attributes.tallas || []).forEach(talla => {
      const option = document.createElement('option');
      option.value = talla;
      option.textContent = talla;
      tallaSelect.appendChild(option);
    });

    // Renderizar paleta de colores visual
    if (colorsPaletteContainer && window.ColorPalette) {
      const defaultColors = window.ColorPalette.getDefaultColors?.() || [];
      colorsPaletteContainer.innerHTML = (attributes.colors || []).map(colorName => {
        const colorObj = defaultColors.find(c => c.name === colorName);
        const hexColor = colorObj?.hex || '#999999';
        return `
          <div class="modal-color-option" 
               data-color-value="${colorName}"
               title="${colorName}">
            <div class="modal-color-circle" style="background-color: ${hexColor};"></div>
            <span>${colorName}</span>
          </div>
        `;
      }).join('');

      // Event listeners para paleta visual
      colorsPaletteContainer.querySelectorAll('.modal-color-option').forEach(option => {
        option.addEventListener('click', () => {
          const colorValue = option.dataset.colorValue;
          colorSelect.value = colorValue;
          updateModalVariationDisplay(productId, colorSelect, tallaSelect, {
            stockElement: stockInfoElement,
            priceElement,
            onVariationChange,
            onStockChange
          });

          // Actualizar selección visual
          colorsPaletteContainer.querySelectorAll('.modal-color-option').forEach(opt => {
            opt.classList.toggle('selected', opt === option);
          });
        });
      });
    }

    // Event listeners para selectores
    colorSelect.addEventListener('change', () => {
      updateModalVariationDisplay(productId, colorSelect, tallaSelect, {
        stockElement: stockInfoElement,
        priceElement,
        onVariationChange,
        onStockChange
      });

      // Actualizar selección visual de color
      if (colorsPaletteContainer) {
        const selectedColor = colorSelect.value;
        colorsPaletteContainer.querySelectorAll('.modal-color-option').forEach(opt => {
          opt.classList.toggle('selected', opt.dataset.colorValue === selectedColor);
        });
      }
    });

    tallaSelect.addEventListener('change', () => {
      updateModalVariationDisplay(productId, colorSelect, tallaSelect, {
        stockElement: stockInfoElement,
        priceElement,
        onVariationChange,
        onStockChange
      });
    });
  };

  /**
   * Actualiza la vista del modal cuando cambia la selección de variación
   */
  const updateModalVariationDisplay = async (parentProductId, colorSelect, tallaSelect, options = {}) => {
    const { stockElement, priceElement, onVariationChange, onStockChange } = options;
    const selectedColor = colorSelect?.value;
    const selectedTalla = tallaSelect?.value;

    // Filtrar opciones de talla según color  
    if (selectedColor && tallaSelect) {
      const availableTallas = await Variations.getAvailableCombinations(
        parentProductId, 
        'color', 
        selectedColor
      );

      tallaSelect.querySelectorAll('option').forEach(option => {
        if (!option.value) return;
        const isAvailable = availableTallas.some(t => t.value === option.value && t.in_stock);
        option.disabled = !isAvailable;
      });

      // Si la talla actual se deshabilitó, limpiarla
      if (selectedTalla && tallaSelect.querySelector(`option[value="${selectedTalla}"]`)?.disabled) {
        tallaSelect.value = '';
      }
    }

    // Filtrar opciones de color según talla
    if (selectedTalla && colorSelect) {
      const availableColors = await Variations.getAvailableCombinations(
        parentProductId, 
        'talla', 
        selectedTalla
      );

      colorSelect.querySelectorAll('option').forEach(option => {
        if (!option.value) return;
        const isAvailable = availableColors.some(c => c.value === option.value && c.in_stock);
        option.disabled = !isAvailable;
      });

      // Si el color actual se deshabilitó, limpiarlo
      if (selectedColor && colorSelect.querySelector(`option[value="${selectedColor}"]`)?.disabled) {
        colorSelect.value = '';
      }
    }

    // Si la combinación está completa, actualizar información de stock y precio
    if (selectedColor && selectedTalla) {
      const variation = await Variations.findVariation(parentProductId, selectedColor, selectedTalla);

      if (variation) {
        // Actualizar stock
        if (stockElement) {
          const stock = variation.stock || 0;
          const inStock = stock > 0;
          stockElement.textContent = inStock ? `En stock (${stock})` : 'Agotado';
          stockElement.className = 'product-modal-stock ' + (inStock ? '' : 'out-of-stock');
          
          if (onStockChange) {
            onStockChange(stock, inStock);
          }
        }

        // Actualizar precio
        if (priceElement && variation.price) {
          priceElement.textContent = parseFloat(variation.price).toFixed(2) + ' CUP';
        }

        // Callback
        if (onVariationChange) {
          onVariationChange(variation);
        }
      }
    } else {
      // Limpiar información si no hay selección completa
      if (onVariationChange) {
        onVariationChange(null);
      }
    }
  };

  /**
   * Obtiene la variación seleccionada actualmente en el modal
   */
  const getSelectedVariation = async (parentProductId, colorSelect, tallaSelect) => {
    const color = colorSelect?.value;
    const talla = tallaSelect?.value;

    if (!color || !talla) return null;

    return await Variations.findVariation(parentProductId, color, talla);
  };

  /**
   * Verifica si hay una variación válida seleccionada
   */
  const isVariationValid = (colorSelect, tallaSelect) => {
    return !!(colorSelect?.value && tallaSelect?.value);
  };

  return {
    initializeModalVariations,
    updateModalVariationDisplay,
    getSelectedVariation,
    isVariationValid
  };
})();

// Exportar para uso global
window.VariationsUI = VariationsUI;

// También mantener el cache de variaciones accesible globalmente para eficiencia
const variationsCache = new Map();
