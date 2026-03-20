/**
 * Color Palette Manager
 * Gestiona la paleta de colores para productos
 */

// Paleta de colores predeterminada con nombres en español
const DEFAULT_COLORS = [
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

// Almacenar colores del producto
let selectedColors = [];

// Función para convertir array de colores a JSON
function colorsToJSON(colorsArray) {
  return JSON.stringify(colorsArray);
}

// Función para parsear colores desde JSON
function colorsFromJSON(jsonStr) {
  try {
    if (!jsonStr) return [];
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    // Si es un string de colores separados por comas, intentar parsear
    return [];
  }
}

// Renderizar selector visual de colores
function renderColorPicker() {
  const container = document.getElementById('color-picker-container');
  if (!container) return;

  container.innerHTML = `
    <div class="color-picker-wrapper">
      <div class="color-palette-grid">
        ${DEFAULT_COLORS.map(color => `
          <button type="button"
                  class="color-swatch"
                  data-color-hex="${color.hex}"
                  data-color-name="${color.name}"
                  title="${color.name}">
            <span class="color-swatch-inner" style="background-color: ${color.hex};"></span>
            <span class="color-swatch-label">${color.name}</span>
          </button>
        `).join('')}
      </div>

      <div class="custom-color-section">
        <h4>Color personalizado</h4>
        <div class="custom-color-inputs">
          <input type="color" id="custom-color-picker" value="#000000">
          <input type="text" id="custom-color-name" placeholder="Nombre del color" maxlength="20">
          <button type="button" id="btn-add-custom-color" class="btn btn-secondary">Agregar</button>
        </div>
      </div>

      <div class="selected-colors-display">
        <h4>Colores seleccionados:</h4>
        <div id="selected-colors-list" class="selected-colors-list"></div>
      </div>
    </div>
  `;

  // Agregar event listeners a los colores predeterminados
  document.querySelectorAll('.color-swatch').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const hex = btn.dataset.colorHex;
      const name = btn.dataset.colorName;
      addColorSelection(name, hex);
    });
  });

  // Event listener para agregar color personalizado
  const addButton = document.getElementById('btn-add-custom-color');
  if (addButton) {
    addButton.addEventListener('click', addCustomColor);
  }

  updateSelectedColorsDisplay();
}

// Agregar color a la selección
function addColorSelection(name, hex) {
  // Verificar que no esté ya seleccionado
  if (selectedColors.some(c => c.hex === hex)) {
    removeColorSelection(hex);
    return;
  }

  selectedColors.push({ name, hex });
  updateSelectedColorsDisplay();
  updateHiddenInput();
}

// Remover color de la selección
function removeColorSelection(hex) {
  selectedColors = selectedColors.filter(c => c.hex !== hex);
  updateSelectedColorsDisplay();
  updateHiddenInput();
}

// Agregar color personalizado
function addCustomColor() {
  const colorPicker = document.getElementById('custom-color-picker');
  const nameInput = document.getElementById('custom-color-name');

  if (!colorPicker || !nameInput) return;

  const hex = colorPicker.value.toUpperCase();
  const name = nameInput.value.trim();

  if (!name) {
    alert('Por favor, ingresa un nombre para el color personalizado.');
    return;
  }

  // Verificar que no sea un color ya existente
  if (DEFAULT_COLORS.some(c => c.hex.toLowerCase() === hex.toLowerCase())) {
    alert('Este color ya existe en la paleta predeterminada.');
    return;
  }

  // Verificar que no esté ya seleccionado
  if (selectedColors.some(c => c.hex.toLowerCase() === hex.toLowerCase())) {
    alert('Este color ya está seleccionado.');
    return;
  }

  // Verificar que el nombre no esté duplicado
  if (selectedColors.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    alert('Ya existe un color con este nombre.');
    return;
  }

  addColorSelection(name, hex);

  // Limpiar inputs
  nameInput.value = '';
  colorPicker.value = '#000000';
}

// Actualizar display de colores seleccionados
function updateSelectedColorsDisplay() {
  const display = document.getElementById('selected-colors-list');
  if (!display) return;

  if (selectedColors.length === 0) {
    display.innerHTML = '<p class="no-colors">Sin colores seleccionados</p>';
    return;
  }

  display.innerHTML = selectedColors.map(color => `
    <div class="selected-color-item">
      <div class="selected-color-preview" style="background-color: ${color.hex};"></div>
      <span class="selected-color-name">${color.name}</span>
      <button type="button" class="btn-remove-color" data-hex="${color.hex}" title="Eliminar">
        ×
      </button>
    </div>
  `).join('');

  // Event listeners para remover colores
  document.querySelectorAll('.btn-remove-color').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      removeColorSelection(btn.dataset.hex);
    });
  });

  // Actualizar checkbox de selección en la paleta
  document.querySelectorAll('.color-swatch').forEach(btn => {
    const hex = btn.dataset.colorHex;
    const isSelected = selectedColors.some(c => c.hex === hex);
    btn.classList.toggle('selected', isSelected);
  });
}

// Actualizar input oculto con datos de colores
function updateHiddenInput() {
  const input = document.getElementById('product-colores-data');
  if (input) {
    input.value = colorsToJSON(selectedColors);
  }
  // También actualizar field de texto para compatibilidad
  const textInput = document.getElementById('product-colores');
  if (textInput) {
    textInput.value = selectedColors.map(c => c.name).join(', ');
  }
}

// Cargar colores guardados
function loadColors(jsonStr) {
  selectedColors = colorsFromJSON(jsonStr);
  if (selectedColors.length === 0 && jsonStr) {
    // Intentar parsear formato de texto legado
    const names = jsonStr.split(',').map(n => n.trim()).filter(Boolean);
    selectedColors = names.map(name => {
      const color = DEFAULT_COLORS.find(c => c.name.toLowerCase() === name.toLowerCase());
      return color || { name, hex: '#999999' };
    });
  }
  renderColorPicker();
}

// Renderizar paleta en la tienda
function renderColorsPaletteForProduct(colors) {
  if (!colors || colors.length === 0) return '';

  let colorsArray = colorsFromJSON(colors);
  if (colorsArray.length === 0) {
    // Formato legado
    const names = colors.split(',').map(n => n.trim()).filter(Boolean);
    colorsArray = names.map(name => {
      const color = DEFAULT_COLORS.find(c => c.name.toLowerCase() === name.toLowerCase());
      return color || { name, hex: '#999999' };
    });
  }

  return `
    <div class="product-colors-palette">
      ${colorsArray.map(color => `
        <div class="product-color-swatch"
             style="background-color: ${color.hex};"
             title="${color.name}"
             aria-label="Color ${color.name}">
        </div>
      `).join('')}
    </div>
  `;
}

// Definir ColorPalette en el scope global
window.ColorPalette = {
  renderColorPicker,
  addColorSelection,
  removeColorSelection,
  updateSelectedColorsDisplay,
  loadColors,
  getSelectedColors: () => [...selectedColors],
  setSelectedColors: (colors) => { selectedColors = colors; },
  renderColorsPaletteForProduct,
  colorsToJSON,
  colorsFromJSON,
  updateHiddenInput,
  getDefaultColors: () => [...DEFAULT_COLORS],
};
