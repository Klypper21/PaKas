/**
 * VARIATIONS MODULE
 * Maneja la lógica de variaciones de productos (Parent-Child)
 * 
 * Funcionalidades:
 * - Cargar variaciones de un producto
 * - Buscar variación exacta por color + talla
 * - Actualizar estado visual de selectores según stock
 * - Calcular precio dinámico según variación
 */

const Variations = (() => {
  // Cache de variaciones cargadas: { parentId -> { variations: [], attributes: {} } }
  const variationsCache = new Map();

  /**
   * Carga todas las variaciones de un producto padre
   * @param {number|string} parentProductId - ID del producto padre
   * @returns {Promise<Array>} Array de variaciones con { sku, color, talla, stock, price, image_url, in_stock }
   */
  const loadVariations = async (parentProductId) => {
    // Retornar del cache si ya existe
    if (variationsCache.has(parentProductId)) {
      return variationsCache.get(parentProductId).variations;
    }

    if (!window.supabase) {
      console.warn('Supabase no está disponible');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('product_variations')
        .select('*')
        .eq('parent_product_id', parentProductId);

      if (error) {
        console.error('Error cargando variaciones:', error);
        return [];
      }

      const variations = (data || []).map(v => ({
        id: v.id,
        sku: v.sku,
        color: v.color,
        talla: v.talla,
        stock: v.stock || 0,
        price: v.price,
        image_url: v.image_url,
        in_stock: (v.stock || 0) > 0,
        parent_product_id: v.parent_product_id
      }));

      // Guardar en cache
      const attributes = extractAttributes(variations);
      variationsCache.set(parentProductId, { variations, attributes });

      return variations;
    } catch (err) {
      console.error('Error en loadVariations:', err);
      return [];
    }
  };

  /**
   * Extrae los atributos únicos de las variaciones
   * Retorna { colors: Set, tallas: Set }
   */
  const extractAttributes = (variations) => {
    const colors = new Set();
    const tallas = new Set();

    variations.forEach(v => {
      if (v.color) colors.add(v.color);
      if (v.talla) tallas.add(v.talla);
    });

    return {
      colors: Array.from(colors),
      tallas: Array.from(tallas)
    };
  };

  /**
   * Obtiene la variación exacta por color y talla
   * @param {number|string} parentProductId
   * @param {string} color
   * @param {string} talla
   * @returns {Object|null} Variación encontrada o null
   */
  const findVariation = async (parentProductId, color, talla) => {
    let variations = variationsCache.has(parentProductId)
      ? variationsCache.get(parentProductId).variations
      : await loadVariations(parentProductId);

    if (!variations.length) {
      console.warn(`No hay variaciones para producto ${parentProductId}`);
      return null;
    }

    const variation = variations.find(
      v => v.color === color && v.talla === talla
    );

    return variation || null;
  };

  /**
   * Obtiene variaciones disponibles para un atributo específico
   * (ej: variaciones disponibles para el color "Rojo")
   * @param {number|string} parentProductId
   * @param {string} attributeType - 'color' o 'talla'
   * @param {string} attributeValue - Valor del atributo seleccionado
   * @returns {Promise<Array>} Array de combinaciones disponibles
   */
  const getAvailableCombinations = async (parentProductId, attributeType, attributeValue) => {
    let variations = variationsCache.has(parentProductId)
      ? variationsCache.get(parentProductId).variations
      : await loadVariations(parentProductId);

    if (!variations.length) return [];

    const otherAttribute = attributeType === 'color' ? 'talla' : 'color';
    const combinations = new Map();

    variations.forEach(v => {
      if (v[attributeType] === attributeValue) {
        const otherValue = v[otherAttribute];
        if (!combinations.has(otherValue)) {
          combinations.set(otherValue, { value: otherValue, in_stock: v.in_stock });
        }
      }
    });

    return Array.from(combinations.values());
  };

  /**
   * Renderiza selectores de variaciones con estado visual
   * @param {HTMLElement} containerElement - Elemento contenedor
   * @param {number|string} parentProductId - ID del producto padre
   * @param {Object} options - { onSelectionChange, colorLabel, tallaLabel }
   */
  const renderSelectors = async (containerElement, parentProductId, options = {}) => {
    const {
      onSelectionChange,
      colorLabel = 'Color',
      tallaLabel = 'Talla',
      showPalette = true
    } = options;

    const variations = await loadVariations(parentProductId);
    if (!variations.length) {
      console.warn('No hay variaciones para renderizar');
      return;
    }

    const attributes = variationsCache.get(parentProductId).attributes;

    // Crear estructura HTML para los selectores
    containerElement.innerHTML = `
      <div class="variation-selector-group">
        <div class="variation-field">
          <label>${colorLabel}:</label>
          <div class="variation-color-selector">
            <select id="variation-color" data-type="color">
              <option value="">Seleccionar ${colorLabel}</option>
            </select>
            <div id="variation-colors-palette" class="variation-colors-palette"></div>
          </div>
        </div>
        
        <div class="variation-field">
          <label>${tallaLabel}:</label>
          <select id="variation-talla" data-type="talla">
            <option value="">Seleccionar ${tallaLabel}</option>
          </select>
        </div>
      </div>
    `;

    const colorSelect = containerElement.querySelector('#variation-color');
    const tallaSelect = containerElement.querySelector('#variation-talla');
    const colorsPalette = containerElement.querySelector('#variation-colors-palette');

    // Llenar selectores
    attributes.colors.forEach(color => {
      const option = document.createElement('option');
      option.value = color;
      option.textContent = color;
      colorSelect.appendChild(option);
    });

    attributes.tallas.forEach(talla => {
      const option = document.createElement('option');
      option.value = talla;
      option.textContent = talla;
      tallaSelect.appendChild(option);
    });

    // Renderizar paleta de colores visual (si está disponible)
    if (showPalette && window.ColorPalette) {
      const defaultColors = window.ColorPalette.getDefaultColors?.() || [];
      colorsPalette.innerHTML = attributes.colors.map(colorName => {
        const colorObj = defaultColors.find(c => c.name === colorName);
        const hexColor = colorObj?.hex || '#999999';
        return `
          <div class="variation-color-option" 
               data-color-value="${colorName}"
               title="${colorName}"
               style="background-color: ${hexColor};">
          </div>
        `;
      }).join('');

      // Event listeners para paleta visual
      colorsPalette.querySelectorAll('.variation-color-option').forEach(option => {
        option.addEventListener('click', () => {
          const colorValue = option.dataset.colorValue;
          colorSelect.value = colorValue;
          updateVariationState(parentProductId, colorSelect, tallaSelect, onSelectionChange);
        });
      });
    }

    // Event listeners para cambios en selectores
    colorSelect.addEventListener('change', () => {
      updateVariationState(parentProductId, colorSelect, tallaSelect, onSelectionChange);
    });

    tallaSelect.addEventListener('change', () => {
      updateVariationState(parentProductId, colorSelect, tallaSelect, onSelectionChange);
    });

    // Actualizar estado inicial
    updateVariationState(parentProductId, colorSelect, tallaSelect, onSelectionChange);
  };

  /**
   * Actualiza el estado visual de los selectores según disponibilidad
   * Deshabilita combinaciones sin stock
   */
  const updateVariationState = async (parentProductId, colorSelect, tallaSelect, onSelectionChange) => {
    const selectedColor = colorSelect.value;
    const selectedTalla = tallaSelect.value;

    // Si hay color seleccionado, filtrar tallas disponibles
    if (selectedColor) {
      const availableTallas = await getAvailableCombinations(parentProductId, 'color', selectedColor);
      
      // Actualizar opciones de talla
      tallaSelect.querySelectorAll('option').forEach(option => {
        if (!option.value) return; // Omitir opción vacía
        const isAvailable = availableTallas.some(t => t.value === option.value && t.in_stock);
        option.disabled = !isAvailable;
        option.classList.toggle('out-of-stock', !isAvailable);
      });

      // Si la talla actual se deshabilitó, limpiarla
      if (selectedTalla && tallaSelect.querySelector(`option[value="${selectedTalla}"]`)?.disabled) {
        tallaSelect.value = '';
      }
    }

    // Si hay talla seleccionada, filtrar colores disponibles
    if (selectedTalla) {
      const availableColors = await getAvailableCombinations(parentProductId, 'talla', selectedTalla);
      
      colorSelect.querySelectorAll('option').forEach(option => {
        if (!option.value) return; // Omitir opción vacía
        const isAvailable = availableColors.some(c => c.value === option.value && c.in_stock);
        option.disabled = !isAvailable;
        option.classList.toggle('out-of-stock', !isAvailable);
      });

      // Si el color actual se deshabilitó, limpiarlo
      if (selectedColor && colorSelect.querySelector(`option[value="${selectedColor}"]`)?.disabled) {
        colorSelect.value = '';
      }
    }

    // Callback cuando hay cambios
    if (onSelectionChange && selectedColor && selectedTalla) {
      const variation = await findVariation(parentProductId, selectedColor, selectedTalla);
      onSelectionChange(variation);
    } else if (onSelectionChange && (!selectedColor || !selectedTalla)) {
      onSelectionChange(null);
    }
  };

  /**
   * Obtiene el SKU para una combinación específica
   * @returns {Promise<string|null>}
   */
  const getSKU = async (parentProductId, color, talla) => {
    const variation = await findVariation(parentProductId, color, talla);
    return variation?.sku || null;
  };

  /**
   * Obtiene el stock disponible para una variación
   * @returns {Promise<number>}
   */
  const getStock = async (parentProductId, color, talla) => {
    const variation = await findVariation(parentProductId, color, talla);
    return variation?.stock || 0;
  };

  /**
   * Obtiene el precio para una variación (o precio del producto base)
   * @returns {Promise<number>}
   */
  const getPrice = async (parentProductId, color, talla) => {
    const variation = await findVariation(parentProductId, color, talla);
    return variation?.price || null;
  };

  /**
   * Limpia el cache de variaciones (útil después de actualizar stock)
   */
  const clearCache = () => {
    variationsCache.clear();
  };

  /**
   * Limpia el cache de un producto específico
   */
  const clearCacheForProduct = (parentProductId) => {
    variationsCache.delete(parentProductId);
  };

  // API pública
  return {
    loadVariations,
    findVariation,
    getAvailableCombinations,
    renderSelectors,
    getSKU,
    getStock,
    getPrice,
    clearCache,
    clearCacheForProduct,
    extractAttributes
  };
})();

// Exportar para uso global
window.Variations = Variations;
