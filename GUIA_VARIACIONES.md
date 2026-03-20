# 🎯 GUÍA DE VARIACIONES DE PRODUCTOS (Parent-Child)

## Descripción General

He modernizado tu lógica de inventario para que funcione con un sistema de **variaciones Parent-Child** similar a Amazon. Ahora un producto base puede tener múltiples combinaciones de talla/color con:

- **SKU único** para cada variación
- **Stock independiente** por combinación
- **Precio variable** (puedes tener precios diferentes por variación)
- **Imagen específica** para cada combinación (opcional)
- **Búsqueda inteligente**: Las combinaciones sin stock se deshabilitan automáticamente

## 📁 Archivos Nuevos / Modificados

### Nuevos Archivos:
1. **`sql/product_variations.sql`** - Schema de base de datos con tablas y funciones
2. **`js/variations.js`** - Módulo principal que maneja la lógica de variaciones
3. **`js/variations-ui.js`** - UI helpers para integrar variaciones en el modal
4. **`js/tienda-variations-enhancement.js`** - Mejora automática del modal de producto

### Modificados:
1. **`js/tienda.js`** - Expone funciones globalmente (cambio mínimo)
2. **`css/style.css`** - Nuevos estilos para selectores de variaciones
3. **`index.html`** - Incluye los nuevos scripts

## 🚀 Cómo Implementar (Paso a Paso)

### PASO 1: Ejecutar el Script SQL en Supabase

1. Ve a [Supabase](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** → **New Query**
4. Copia el contenido de `sql/product_variations.sql`
5. Ejecuta la query

Esto creará:
- ✅ Tabla `product_variations` (para guardar variaciones)
- ✅ Tabla `product_variation_attributes` (para cache de atributos)
- ✅ Funciones SQL helper (búsqueda, filtrado)
- ✅ Índices optimizados

### PASO 2: Insertar Datos de Variaciones (Ejemplo)

```sql
-- Ejemplo: Una camiseta roja disponible en tallas S, M, L
INSERT INTO product_variations (parent_product_id, sku, color, talla, stock, price)
VALUES 
  (1, 'TSHIRT-RED-S', 'Rojo', 'S', 15, 25.00),
  (1, 'TSHIRT-RED-M', 'Rojo', 'M', 20, 25.00),
  (1, 'TSHIRT-RED-L', 'Rojo', 'L', 10, 25.00),
  (1, 'TSHIRT-BLUE-S', 'Azul', 'S', 8, 25.00),
  (1, 'TSHIRT-BLUE-M', 'Azul', 'M', 0, 25.00),    -- AGOTADO
  (1, 'TSHIRT-BLUE-L', 'Azul', 'L', 12, 25.00),
  (1, 'TSHIRT-BLACK-S', 'Negro', 'S', 25, 28.00),  -- Precio diferente
  (1, 'TSHIRT-BLACK-M', 'Negro', 'M', 18, 28.00),
  (1, 'TSHIRT-BLACK-L', 'Negro', 'L', 5, 28.00);
```

**Importante:**
- `parent_product_id`: ID del producto base (ej: 1)
- `sku`: Código único para cada combinación (ej: TSHIRT-RED-S)
- `color`: Nombre del color (debe coincidir con tu paleta de colores)
- `talla`: Talla disponible
- `stock`: Cantidad disponible
- `price`: Precio (opcional - si no se especifica, usa el precio del producto base)

### PASO 3: Verificar que Funcione

1. Abre tu tienda
2. Haz clic en un producto que tenga variaciones
3. Deberías ver:
   - ✅ Selector de Color con opciones disponibles
   - ✅ Selector de Talla (varía según el color seleccionado)
   - ✅ Stock actualizado dinámicamente
   - ✅ Precio actualizado si es diferente
   - ✅ Combinaciones sin stock aparecen deshabilitadas

## 🎨 Cómo Funciona la UI

### Flujo de Usuario:

1. **Usuario abre producto con variaciones**
   ```
   Modal se abre → Carga variaciones disponibles
   ```

2. **Usuario selecciona un color**
   ```
   Se filtran las tallas disponibles para ese color
   Se deshabilitan combinaciones en talla que no tengan stock
   ```

3. **Usuario selecciona una talla**
   ```
   Se encuentra la variación exacta (color + talla)
   Se muestra:
     - Stock actual de esa combinación
     - Precio específico (si aplica)
     - Se habilita el botón "Añadir al carrito"
   ```

4. **Usuario añade al carrito**
   ```
   Se guarda el SKU de la variación
   En el carrito se visible: "Camiseta Roja - S - SKU: TSHIRT-RED-S"
   ```

### Estados Visuales:

```html
<!-- OPCIÓN DISPONIBLE (en stock) -->
<option value="S">S</option>  <!-- Habilitada, color normal -->

<!-- OPCIÓN AGOTADA (0 stock) -->
<option value="M" disabled>M</option>  <!-- Deshabilitada, gris -->

<!-- PALETA DE COLORES (visual) -->
<div class="variation-color-option selected">
  <!-- Círculo de color con borde grueso indicando selección -->
</div>
```

## 📊 Estructura de Datos

### Tabla `product_variations`:
```
id (BIGINT)              - ID único de la variación
parent_product_id (BIGINT) - ID del producto base
sku (VARCHAR)            - Código único: TSHIRT-RED-S
color (VARCHAR)          - Color
talla (VARCHAR)          - Talla
stock (INTEGER)          - Stock actual
price (DECIMAL)          - Precio (nullable, usa producto base si no hay)
image_url (TEXT)         - Imagen específica (opcional)
created_at / updated_at  - Timestamps
```

### Tabla `product_variation_attributes`:
```
id (BIGINT)              - ID
parent_product_id (BIGINT) - ID del producto base
colors (JSONB)           - Array: ["Rojo", "Azul", "Negro"]
tallas (JSONB)           - Array: ["S", "M", "L"]
updated_at (TIMESTAMP)   - Última actualización
```

## 🔧 API JavaScript

El módulo `Variations` expone estas funciones:

### Cargar variaciones:
```javascript
const variations = await Variations.loadVariations(productId);
// Retorna: [ { sku, color, talla, stock, price, image_url, in_stock }, ... ]
```

### Buscar una variación exacta:
```javascript
const variation = await Variations.findVariation(productId, 'Rojo', 'S');
// Retorna: { sku: 'TSHIRT-RED-S', stock: 15, price: 25.00,... }
```

### Obtener stock disponible:
```javascript
const stock = await Variations.getStock(productId, 'Rojo', 'S');
// Retorna: 15
```

### Obtener precio:
```javascript
const price = await Variations.getPrice(productId, 'Rojo', 'S');
// Retorna: 25.00
```

### Obtener combinaciones disponibles para un atributo:
```javascript
// Tallas disponibles si se elige color "Rojo"
const tallas = await Variations.getAvailableCombinations(productId, 'color', 'Rojo');
// Retorna: [ { value: 'S', in_stock: true }, { value: 'M', in_stock: true }, ... ]
```

### Renderizar selectores (uso avanzado):
```javascript
await Variations.renderSelectors(
  document.getElementById('my-container'),
  productId,
  {
    colorLabel: 'Color',
    tallaLabel: 'Talla',
    showPalette: true,
    onSelectionChange: (variation) => {
      console.log('Seleccionada:', variation);
    }
  }
);
```

## 🛒 Integración con Carrito

El carrito automáticamente guarda el SKU:

```javascript
// Cuando un producto con variación se añade:
{
  id: 1,                           // ID del producto base
  name: 'Camiseta Premium',
  price: 25.00,
  sku: 'TSHIRT-RED-S',             // ← SKU de la variación
  options: { color: 'Rojo', talla: 'S' },  // ← Para referencia visual
  quantity: 2
}
```

En el carrito se muestra:
```
Camiseta Premium
Rojo / S
SKU: TSHIRT-RED-S
25.00 CUP × 2
```

## 🎯 Casos de Uso

### Caso 1: Ropa con múltiples tallas/colores
```sql
INSERT INTO product_variations (parent_product_id, sku, color, talla, stock, price)
VALUES 
  (5, 'JACKET-BLACK-XS', 'Negro', 'XS', 3, 45.00),
  (5, 'JACKET-BLACK-S', 'Negro', 'S', 8, 45.00),
  (5, 'JACKET-BLACK-M', 'Negro', 'M', 12, 45.00),
  (5, 'JACKET-GRAY-M', 'Gris', 'M', 0, 45.00),  -- Agotado
  (5, 'JACKET-GRAY-L', 'Gris', 'L', 5, 45.00);
```

### Caso 2: Productos con precio por variación
```sql
INSERT INTO product_variations (parent_product_id, sku, color, talla, stock, price)
VALUES 
  (10, 'SHOES-BLACK-36', 'Negro', 'US 6', 5, 65.00),
  (10, 'SHOES-BLACK-40', 'Negro', 'US 10', 2, 65.00),
  (10, 'SHOES-WHITE-36', 'Blanco', 'US 6', 8, 75.00),  -- Más caro
  (10, 'SHOES-WHITE-40', 'Blanco', 'US 10', 4, 75.00);
```

### Caso 3: Stock dinámico (control en tiempo real)
```sql
-- Actualizar stock de una variación específica
UPDATE product_variations
SET stock = stock - 1
WHERE sku = 'TSHIRT-RED-S' AND stock > 0;
```

## ⚙️ Optimizaciones Incluidas

✅ **Caché en memoria**: Las variaciones se cargan una sola vez y se caché  
✅ **Índices SQL**: Se crean automáticamente para búsquedas rápidas  
✅ **Lazy Loading**: Las imágenes se cargan bajo demanda  
✅ **Filtrado inteligente**: Las opciones se filtran según disponibilidad  
✅ **Validación**: Se verifica que exista la combinación antes de añadir al carrito

## 🐛 Troubleshooting

### P: No veo variaciones en el producto
**R:** Verifica que:
1. Ejecutaste el SQL en Supabase
2. Insertaste datos en `product_variations` con el ID correcto del producto
3. El `parent_product_id` coincide con el ID real del producto

### P: La talla no se deshabilita cuando agoto stock
**R:** 
1. Revisa que `stock = 0` en la variación
2. Limpia el caché: `Variations.clearCache()`
3. Recarga la página

### P: El precio no cambia según la variación
**R:**
1. Verifica que la variación tiene `price` especificado
2. Si `price` es NULL, usa el precio del producto base
3. Comprueba que `UPDATE product_variations SET price = X` se ejecutó

### P: Quiero cambiar el texto del selector
**R:** Los textos están en `tienda-variations-enhancement.js`:
```javascript
// Busca y reemplaza:
newNode.textContent = 'Por favor selecciona color y talla.';
```

## 📱 Responsive Design

Los selectores se adaptan automáticamente a dispositivos móviles:
- **Desktop**: Paleta de colores grande + selectores
- **Tablet**: Paleta de colores mediana
- **Mobile**: Selectores compactos, paleta pequeña

## 🔐 Consideraciones de Seguridad

✅ Las variaciones se validan en el backend (Supabase RLS)  
✅ Los SKU son únicos y no se pueden duplicar  
✅ El stock se reserva con Compare-And-Set (evita race conditions)  
✅ Los precios se validan antes de procesar pedidos  

## 🎓 Próximos Pasos (Opcionales)

1. **Atributos adicionales**: Modificar para soportar otro atributo además de color/talla (ej: tamaño de pantalla para TVs)

2. **Imágenes por variación**: Permitir diferentes imágenes para cada color

3. **Análisis de ventas**: Reportes de qué combinaciones venden más

4. **Sincronización automática**: Actualizar stock cuando se recibe un pedido

5. **Admin Panel**: Interfaz para gestionar variaciones desde el admin

---

**¡Listo!** Tu tienda ahora soporta variaciones tipo Amazon. 🚀
