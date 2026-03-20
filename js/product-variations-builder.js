/**
 * Product Variations Matrix Builder
 * Interfaz para agregar colores y tallas, y especificar stock/precio por combinación
 * Se integra en el formulario de productos del admin
 */

class ProductVariationsBuilder {
  constructor() {
    this.colors = [];
    this.tallas = [];
    this.variations = {}; // { "color-talla": { stock, price, sku } }
    this.variationImages = {}; // { "color-talla": File object }
    this.variationImageUrls = {}; // { "color-talla": image URL for existing variations }
    
    this.init();
  }

  init() {
    // Paleta de colores predeterminada
    this.DEFAULT_COLORS = [
      { name: 'Rojo', hex: '#EF4444' },
      { name: 'Naranja', hex: '#F97316' },
      { name: 'Amarillo', hex: '#FFD400' },
      { name: 'Verde', hex: '#22C55E' },
      { name: 'Azul', hex: '#3B82F6' },
      { name: 'Violeta', hex: '#A855F7' },
      { name: 'Rosa', hex: '#EC4899' },
      { name: 'Negro', hex: '#1F2937' },
      { name: 'Gris', hex: '#9CA3AF' },
      { name: 'Blanco', hex: '#FFFFFF' },
      { name: 'Beige', hex: '#D4AF9E' },
      { name: 'Marrón', hex: '#92400E' },
    ];

    // Referencias DOM
    this.colorInput = document.getElementById('product-new-color');
    this.colorPalette = document.getElementById('admin-colors-palette');
    this.tanlaInput = document.getElementById('product-new-talla');
    this.btnAddColor = document.getElementById('btn-add-color');
    this.btnAddTalla = document.getElementById('btn-add-talla');
    this.colorsList = document.getElementById('product-colors-list');
    this.tallasList = document.getElementById('product-tallas-list');
    this.matrixSection = document.getElementById('product-variations-matrix-section');
    this.matrix = document.getElementById('product-variations-matrix');
    this.variationsDataInput = document.getElementById('product-variations-data');
    
    // Modal para subir imagen de variación
    this.variationImageModal = document.getElementById('variation-image-modal');
    this.variationImageInput = document.getElementById('variation-image-input');
    this.variationImagePreview = document.getElementById('variation-image-preview');
    this.btnVariationImageConfirm = document.getElementById('btn-variation-image-confirm');
    this.btnVariationImageCancel = document.getElementById('btn-variation-image-cancel');
    this.btnSelectVariationImage = document.getElementById('btn-select-variation-image');

    if (!this.colorsList) return; // No estamos en formulario de productos

    // Renderizar paleta de colores
    this.renderPalette();

    // Event listeners para el input de tallas (mantener como estaba)
    if (this.btnAddTalla) {
      this.btnAddTalla.addEventListener('click', (e) => {
        e.preventDefault();
        this.addTalla();
      });
    }

    // Enter key para tallas
    if (this.tanlaInput) {
      this.tanlaInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.addTalla();
        }
      });
    }

    // Event listeners para el modal de imagen de variación
    if (this.btnVariationImageConfirm) {
      this.btnVariationImageConfirm.addEventListener('click', (e) => {
        e.preventDefault();
        this.confirmVariationImage();
      });
    }

    if (this.btnVariationImageCancel) {
      this.btnVariationImageCancel.addEventListener('click', (e) => {
        e.preventDefault();
        this.closeImageUploadModal();
      });
    }

    // Botón para seleccionar archivo
    if (this.btnSelectVariationImage) {
      this.btnSelectVariationImage.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.variationImageInput) {
          this.variationImageInput.click();
        }
      });
    }

    // Botón de cerrar del modal (X)
    const modalCloseBtn = document.querySelector('#variation-image-modal .modal-close');
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeImageUploadModal();
      });
    }

    // Cerrar modal al hacer click en el fondo oscuro (backdrop)
    if (this.variationImageModal) {
      const backdrop = this.variationImageModal.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.onclick = () => this.closeImageUploadModal();
      }
    }
  }

  renderPalette() {
    if (!this.colorPalette) return;

    this.colorPalette.innerHTML = this.DEFAULT_COLORS.map(color => `
      <div class="admin-color-option" 
           data-color-name="${this.escapeHtml(color.name, true)}"
           title="${color.name}">
        <div class="admin-color-circle" style="background-color: ${color.hex}; border: 2px solid rgba(0,0,0,0.1);"></div>
        <span>${color.name}</span>
      </div>
    `).join('');

    // Agregar event listeners a las opciones de color
    this.colorPalette.querySelectorAll('.admin-color-option').forEach(option => {
      option.addEventListener('click', () => {
        const colorName = option.dataset.colorName;
        this.addColor(colorName);
        // Marcar como seleccionado
        option.classList.add('selected');
      });
    });
  }

  addColor(colorName) {
    const color = (colorName || '').trim();
    if (!color) return;
    if (this.colors.includes(color)) {
      alert('Este color ya existe');
      return;
    }

    this.colors.push(color);
    this.renderColors();
    this.renderMatrix();
    this.updatePaletteSelection();
  }

  addTalla() {
    const talla = this.tanlaInput.value.trim();
    if (!talla) return;
    if (this.tallas.includes(talla)) {
      alert('Esta talla ya existe');
      return;
    }

    this.tallas.push(talla);
    this.tanlaInput.value = '';
    this.renderTallas();
    this.renderMatrix();
  }

  removeColor(color) {
    this.colors = this.colors.filter(c => c !== color);
    // Limpiar variaciones relacionadas
    Object.keys(this.variations).forEach(key => {
      if (key.startsWith(color + '-')) {
        delete this.variations[key];
      }
    });
    this.renderColors();
    this.renderMatrix();
    this.updatePaletteSelection();
  }

  removeTalla(talla) {
    this.tallas = this.tallas.filter(t => t !== talla);
    // Limpiar variaciones relacionadas
    Object.keys(this.variations).forEach(key => {
      if (key.endsWith('-' + talla)) {
        delete this.variations[key];
      }
    });
    this.renderTallas();
    this.renderMatrix();
  }

  renderColors() {
    this.colorsList.innerHTML = this.colors
      .map(color => `
        <div class="product-item-tag">
          <span>${this.escapeHtml(color)}</span>
          <button type="button" class="product-item-remove" data-color="${this.escapeHtml(color, true)}">×</button>
        </div>
      `)
      .join('');

    this.colorsList.querySelectorAll('.product-item-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.removeColor(btn.dataset.color);
      });
    });
  }

  renderTallas() {
    this.tallasList.innerHTML = this.tallas
      .map(talla => `
        <div class="product-item-tag">
          <span>${this.escapeHtml(talla)}</span>
          <button type="button" class="product-item-remove" data-talla="${this.escapeHtml(talla, true)}">×</button>
        </div>
      `)
      .join('');

    this.tallasList.querySelectorAll('.product-item-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.removeTalla(btn.dataset.talla);
      });
    });
  }

  renderMatrix() {
    if (this.colors.length === 0 || this.tallas.length === 0) {
      this.matrixSection.style.display = 'none';
      return;
    }

    this.matrixSection.style.display = 'block';

    // Headers
    let html = `
      <div class="matrix-container">
        <table class="variations-matrix-table">
          <thead>
            <tr>
              <th class="matrix-corner">Color / Talla</th>
              ${this.tallas.map(t => `<th>${this.escapeHtml(t)}</th>`).join('')}
              <th class="matrix-image-header">Imagen</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Filas (colores)
    this.colors.forEach(color => {
      html += `<tr><td class="matrix-row-header">${this.escapeHtml(color)}</td>`;

      // Celdas (combinaciones)
      this.tallas.forEach(talla => {
        const key = `${color}-${talla}`;
        const variation = this.variations[key] || { stock: 0, price: 0, sku: '' };

        html += `
          <td class="matrix-cell">
            <div class="variation-inputs">
              <div class="variation-input-row">
                <input type="number" 
                       min="0" 
                       value="${variation.stock || 0}" 
                       placeholder="Stock"
                       class="variation-stock"
                       data-color="${this.escapeHtml(color, true)}"
                       data-talla="${this.escapeHtml(talla, true)}">
              </div>
              <div class="variation-input-row">
                <input type="number" 
                       step="0.01" 
                       min="0"
                       value="${variation.price || 0}"
                       placeholder="Precio"
                       class="variation-price"
                       data-color="${this.escapeHtml(color, true)}"
                       data-talla="${this.escapeHtml(talla, true)}">
              </div>
            </div>
          </td>
        `;
      });

      // Celda de imagen
      html += `<td class="matrix-image-cell">
        <div class="variation-image-container" data-color="${this.escapeHtml(color, true)}" data-talla="">
      `;

      // Renderizar miniaturas de colores con sus imágenes
      this.tallas.forEach(talla => {
        const key = `${color}-${talla}`;
        const imageUrl = this.variationImageUrls[key] || null;
        const hasImage = this.variationImages[key] || imageUrl;

        html += `
          <div class="variation-image-wrapper" data-color="${this.escapeHtml(color, true)}" data-talla="${this.escapeHtml(talla, true)}">
            <div class="variation-image-preview">
              ${hasImage 
                ? `<img src="${imageUrl ? this.escapeHtml(imageUrl) : 'data:image/svg+xml,%3Csvg/%3E'}" alt="${this.escapeHtml(color)}-${this.escapeHtml(talla)}" class="variation-img-thumb">` 
                : '<span class="no-image">Sin imagen</span>'
              }
            </div>
            <button type="button" class="btn btn-sm btn-upload-variation-image" 
                    data-color="${this.escapeHtml(color, true)}"
                    data-talla="${this.escapeHtml(talla, true)}">
              ${hasImage ? 'Cambiar' : 'Cargar'}
            </button>
          </div>
        `;
      });

      html += `</div></td></tr>`;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    this.matrix.innerHTML = html;

    // Event listeners para inputs
    this.matrix.querySelectorAll('.variation-stock').forEach(input => {
      input.addEventListener('change', (e) => this.updateVariation(e.target));
    });

    this.matrix.querySelectorAll('.variation-price').forEach(input => {
      input.addEventListener('change', (e) => this.updateVariation(e.target));
    });

    // Event listeners para botones de imagen
    this.matrix.querySelectorAll('.btn-upload-variation-image').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const color = btn.dataset.color;
        const talla = btn.dataset.talla;
        this.openImageUploadModal(color, talla);
      });
    });

    // Generar SKU automáticamente
    this.generateSKUs();
  }

  generateSKUs() {
    const productName = document.getElementById('product-name').value.trim();
    const prefix = productName.substring(0, 3).toUpperCase() || 'PRD';

    this.colors.forEach(color => {
      this.tallas.forEach(talla => {
        const key = `${color}-${talla}`;
        if (!this.variations[key]) {
          this.variations[key] = { stock: 0, price: 0 };
        }
        const colorCode = color.substring(0, 3).toUpperCase();
        const tallaCode = talla.substring(0, 3).toUpperCase();
        this.variations[key].sku = `${prefix}-${colorCode}-${tallaCode}`;
      });
    });
  }

  updateVariation(input) {
    const color = input.dataset.color;
    const talla = input.dataset.talla;
    const key = `${color}-${talla}`;

    if (!this.variations[key]) {
      this.variations[key] = { stock: 0, price: 0, sku: '' };
    }

    if (input.classList.contains('variation-stock')) {
      this.variations[key].stock = parseInt(input.value, 10) || 0;
    } else if (input.classList.contains('variation-price')) {
      this.variations[key].price = parseFloat(input.value) || 0;
    }

    this.saveVariationsToInput();
  }

  saveVariationsToInput() {
    this.variationsDataInput.value = JSON.stringify(this.variations);
  }

  // Cargar datos al editar
  loadFromProduct(product, variations = []) {
    if (!product) {
      // Resetear si es nuevo producto
      this.colors = [];
      this.tallas = [];
      this.variations = {};
      this.variationImages = {};
      this.variationImageUrls = {};
      this.renderColors();
      this.renderTallas();
      this.renderMatrix();
      this.updatePaletteSelection();
      return;
    }

    // Si el producto tiene colores en el JSON
    if (product.colores && typeof product.colores === 'string') {
      try {
        const coloresData = JSON.parse(product.colores);
        if (Array.isArray(coloresData)) {
          this.colors = coloresData;
        }
      } catch (e) {
        // Es un string simple, ignorar
      }
    }

    // Si el producto tiene talla
    if (product.talla) {
      this.tallas = product.talla.split(',').map(t => t.trim()).filter(Boolean);
    }

    // Cargar datos de variaciones existentes
    if (Array.isArray(variations)) {
      variations.forEach(v => {
        const key = `${v.color}-${v.talla}`;
        this.variations[key] = {
          stock: v.stock || 0,
          price: v.price || 0,
          sku: v.sku || '',
        };
        if (v.image_url) {
          this.variationImageUrls[key] = v.image_url;
        }
      });
    }

    this.renderColors();
    this.renderTallas();
    this.renderMatrix();
    this.updatePaletteSelection();
  }

  updatePaletteSelection() {
    if (!this.colorPalette) return;
    
    // Marcar colores seleccionados en la paleta
    this.colorPalette.querySelectorAll('.admin-color-option').forEach(option => {
      const colorName = option.dataset.colorName;
      option.classList.toggle('selected', this.colors.includes(colorName));
    });
  }

  getVariationsArray() {
    const arr = [];
    this.colors.forEach(color => {
      this.tallas.forEach(talla => {
        const key = `${color}-${talla}`;
        const variation = this.variations[key];
        if (variation && (variation.stock > 0 || variation.price > 0)) {
          arr.push({
            color,
            talla,
            stock: variation.stock || 0,
            price: variation.price || 0,
            sku: variation.sku || '',
            image: this.variationImages[key] || null, // File object
            imageUrl: this.variationImageUrls[key] || null, // Existing image URL
          });
        }
      });
    });
    return arr;
  }

  openImageUploadModal(color, talla) {
    if (!this.variationImageModal || !this.variationImageInput) {
      console.warn('Modal de imagen no encontrado');
      return;
    }

    this.currentImageColor = color;
    this.currentImageTalla = talla;

    // Limpiar input y preview
    this.variationImageInput.value = '';
    this.variationImagePreview.innerHTML = '<p>Se abrirá un selector de archivos automáticamente</p><p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">Si no se abre, haz click en el botón de abajo</p>';

    // Mostrar el modal (sin modificar body.overflow ya que el modal de producto ya lo hace)
    this.variationImageModal.classList.remove('hidden');

    // IMPORTANTE: Remover listener anterior si existe para evitar duplicados
    this.variationImageInput.removeEventListener('change', this.imageChangeHandler);
    
    // Crear handler de cambio de imagen
    this.imageChangeHandler = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          this.variationImagePreview.innerHTML = `<img src="${event.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px; object-fit: contain; border-radius: 8px;">`;
          // Auto-scroll para ver la vista previa
          setTimeout(() => {
            this.variationImagePreview.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        };
        reader.readAsDataURL(file);
      }
    };

    // Agregar nuevo listener
    this.variationImageInput.addEventListener('change', this.imageChangeHandler);

    // Disparar el clic en el input file automáticamente para abrir el selector
    try {
      setTimeout(() => {
        this.variationImageInput.click();
      }, 200);
    } catch (err) {
      console.warn('No se pudo abrir el selector de archivos:', err);
    }
  }

  closeImageUploadModal() {
    if (this.variationImageModal) {
      this.variationImageModal.classList.add('hidden');
      this.variationImageInput.value = '';
      this.variationImagePreview.innerHTML = '<p>Se abrirá un selector de archivos automáticamente</p><p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">Si no se abre, haz click en el botón de abajo</p>';
      // No restaurar body.overflow - lo maneja el modal de producto
    }
  }

  confirmVariationImage() {
    const file = this.variationImageInput.files[0];
    if (!file) {
      alert('Por favor selecciona una imagen');
      return;
    }

    const key = `${this.currentImageColor}-${this.currentImageTalla}`;
    this.variationImages[key] = file;
    
    // Guardar URL temporal para preview
    const reader = new FileReader();
    reader.onload = (event) => {
      this.variationImageUrls[key] = event.target.result;
      this.renderMatrix();
      this.closeImageUploadModal();
    };
    reader.readAsDataURL(file);
  }

  setInitialVariationImages(variationsWithImages) {
    // variationsWithImages es un array de objetos con { color, talla, image_url }
    if (!Array.isArray(variationsWithImages)) return;

    variationsWithImages.forEach(v => {
      if (v.color && v.talla && v.image_url) {
        const key = `${v.color}-${v.talla}`;
        this.variationImageUrls[key] = v.image_url;
      }
    });
  }

  escapeHtml(str, forAttribute = false) {
    if (forAttribute) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.ProductVariationsBuilder = new ProductVariationsBuilder();
});
