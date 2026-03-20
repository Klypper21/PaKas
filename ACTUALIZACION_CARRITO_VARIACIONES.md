# ✅ Actualización del Carrito - Validación por Variaciones

## Resumen de Cambios

El carrito ahora **analiza el stock por variación específica** (color+talla con SKU) y **actualiza los precios según la variación seleccionada**, en lugar de usar el promedio del producto.

---

## Archivos Modificados

### 1. 🔧 `js/app.js` (Clase Cart)

#### Nuevas Funciones:
- **`getVariation(productId, color, talla)`** - Obtiene toda la información de una variación específica
  ```javascript
  // Returns: { id, parent_product_id, sku, color, talla, stock, price }
  ```

#### Funciones Modificadas:
- **`getStock(productId, sku = null)`**
  - Si hay `sku`: busca en `product_variations` TABLE
  - Si NO hay `sku`: busca en `products` table (backward compatible)

- **`addWithStock(product, quantity, opts)`**
  - Ahora detecta cuando el producto tiene `sku`
  - Usa de clave `${productId}::${sku}` para evitar duplicados de la misma variación
  - Valida stock CONTRA `product_variations` si existe SKU

- **`_validateAndAdjustAddedItem(productId, qty, prevQty, notify, sku)`**
  - Nuevo parámetro: `sku`
  - Valida contra variación si existe SKU

- **`setQuantityWithStock(productId, quantity, opts)`**
  - Nuevo en opts: `sku`
  - Maneja actualización de cantidad para variaciones

- **`remove(productId, sku = null)`**
  - Nuevo parámetro: `sku`
  - Elimina producto O variación específica

#### Cambios en Lógica de Búsqueda:
- **Carrito sin SKU** (datos antiguos): se busca por `id`
- **Carrito con SKU** (variaciones nuevas): se busca por `${id}::${sku}`
- **Permite mixtos**: productos antiguos + variaciones nuevas en el mismo carrito

---

### 2. 🛍️ `js/tienda.js` (Modal de Producto)

#### Nuevo Comportamiento:
- Cuando se selecciona **Color + Talla**, se busca la variación exacta en `product_variations`
- Se obtiene el **precio específico** de esa variación y se muestra en el modal
- Se obtiene el **stock específico** de esa variación y se muestra en el modal
- El botón "Agregar al carrito" se deshabilita si la variación está **agotada**

#### Nuevo Event Handler:
```javascript
// Ejecuta cuando cambias color o talla
async function updateVariationPriceAndStock() {
  // Busca la variación
  // Actualiza precio, stock e estado del botón
}
```

#### Al Agregar al Carrito:
Si hay variación (color + talla seleccionados):
- Busca `product_variations` por `(productId, color, talla)`
- Obtiene: `sku`, `price`, `stock`
- Pasa al carrito con estos datos

---

### 3. 🛒 `js/carrito.js` (Visualización y Validación)

#### Cambios en `syncCartWithStock()`:
- **Separación por tipo**:
  - Items CON `sku`: valida en `product_variations` contra el SKU específico
  - Items SIN `sku`: valida en `products` contra el ID (backward compatible)

- **Validación de Variaciones**:
  ```javascript
  for (const item of itemsWithSku) {
    const { data: variation } = await supabase
      .from('product_variations')
      .select('stock, price')
      .eq('sku', item.sku)
      .single();
    
    // Valida stock y precio específicos
  }
  ```

- **Actualización de Precios**:
  - Si la variación tiene precio diferente, se ACTUALIZA en carrito
  - Ej: cambio de precio en admin se refleja en carrito automáticamente

#### Cambios en `renderCart()`:
- Ahora usa `item.sku` como clave en `lastStockMap` (en lugar de `item.id`)
- Muestra el **precio correcto** de la variación (no el promedio)
- Muestra el **stock específico** de la variación

#### Cambios en Event Listeners:
- Botones de cantidad (+ -) ahora pasan `data-sku`
- Botón de eliminar ahora pasa `data-sku`
- Búsqueda en carrito es por `id + sku` (no solo `id`)

---

## Flujo de Datos Completo

### 1️⃣ En Tienda (tienda.html)
```
Usuario selecciona Color: "Rojo" + Talla: "S"
  ↓
JavaScript busca en product_variations:
  WHERE parent_product_id = productId
  AND color = "Rojo"
  AND talla = "S"
  ↓
Obtiene: sku="CAMI-RED-S", price=25.00, stock=10
  ↓
Modal actualiza:
  - Precio: 25.00 CUP (en lugar de 26.25 promedio)
  - Stock: 10 (en lugar de 113 total)
  - Botón: habilitado si stock > 0
  ↓
Usuario hace click "Agregar al carrito"
  ↓
Se agrega al carrito CON SKU:
  {
    id: "product-uuid",
    name: "Camiseta",
    price: 25.00,        ← precio de variación
    sku: "CAMI-RED-S",   ← nuevo
    options: { color: "Rojo", talla: "S" },
    quantity: 1
  }
```

### 2️⃣ En Carrito (carrito.html)
```
Carga página
  ↓
syncCartWithStock() se ejecuta
  ↓
Para cada item CON sku:
  SELECT stock, price FROM product_variations WHERE sku = "CAMI-RED-S"
  ↓
Valida:
  - Stock disponible: 10 ✓
  - Si cantidad > stock: ajusta a 10
  - Si stock = 0: ELIMINA del carrito
  ↓
Actualiza precio si cambió en BD:
  - Si admin cambió precio a 28.00, se refleja aquí
  ↓
Renderiza carrito:
  - Muestra: "Camiseta - Color: Rojo, Talla: S"
  - Precio: 25.00 CUP (el correcto)
  - Stock mostrado: 10 (el específico)
  ↓
Cuando usuario modifica cantidad (+ -):
  Valida nuevamente contra product_variations con ese SKU
```

### 3️⃣ En Checkout
```
Cuando usuario confirma orden:
  ↓
Se reserva stock POR VARIACIÓN:
  FOR EACH item in cart:
    UPDATE product_variations SET stock = stock - qty
    WHERE sku = item.sku
  ↓
Se crea ORDER con items que incluyen SKU
  ORDER_ITEMS:
    - sku: "CAMI-RED-S"
    - quantity: 2
    - price_at_purchase: 25.00
    - ... etc
```

---

## Ejemplos de Uso

### Ejemplo 1: Producto con Múltiples Variaciones

**Producto**: Camiseta
- **BD products**: price=26.25 (promedio), stock=113 (total)
- **BD product_variations**:
  - CAMI-RED-S: price=25.00, stock=5
  - CAMI-RED-M: price=25.00, stock=8
  - CAMI-RED-L: price=25.00, stock=6
  - CAMI-BLUE-S: price=25.00, stock=10
  - CAMI-BLUE-M: price=25.00, stock=10
  - CAMI-BLUE-L: price=25.00, stock=8
  - CAMI-BLACK-S: price=28.00, stock=15  ← más caro
  - CAMI-BLACK-M: price=28.00, stock=15
  - CAMI-BLACK-L: price=28.00, stock=15

**En Tienda**:
- Usuario selecciona Rojo + S → Modal muestra: 25.00 CUP, Stock: 5
- Usuario selecciona Negro + S → Modal muestra: 28.00 CUP, Stock: 15
- Al carrito: items con SKU correcto y precio correcto

**En Carrito**:
- Item 1: CAMI-RED-S (2 unidades) → 2 × 25.00 = 50.00 CUP
- Item 2: CAMI-BLACK-L (1 unidad) → 1 × 28.00 = 28.00 CUP
- **Total correcto**: 78.00 CUP

### Ejemplo 2: Cambio de Precio en Admin

**Escenario**: Admin cambia precio de Negro a 30.00 CUP en product_variations

**Antes de cambio**: Carrito tiene CAMI-BLACK-L a 28.00 CUP
**Usuario recarga carrito.html** → syncCartWithStock() ejecuta
**Resultado**: Carrito actualiza a 30.00 CUP automáticamente

### Ejemplo 3: Agotamiento de Stock

**Escenario**: Stock de CAMI-RED-S se agota en tienda

**En Tienda**: 
- Cuando otro usuario selecciona Rojo + S
- Modal muestra: Stock: 0, Botón deshabilitado

**En Carrito**:
- Si user ya tenía 3 unidades de CAMI-RED-S en carrito
- Next syncCartWithStock(): detecta stock = 0
- ELIMINA el item automáticamente con mensaje "Se eliminó... por estar agotado"

---

## Compatibilidad Backward

✅ **100% Compatible** con productos sin variaciones:
- Items sin `sku` siguen usando tabla `products`
- Código detecta automáticamente si hay `sku`
- Productos viejos + nuevos variaciones en el mismo carrito: ✅ funciona

---

## Testing Recomendado

### En Tienda
- [ ] Selecciona color + talla → verificar que precio/stock se actualicen
- [ ] Agrega producto → verificar que SKU se guarde en carrito
- [ ] Prueba con 2+ variaciones del mismo producto → verifican que sean items separados

### En Carrito
- [ ] Aumenta cantidad → valida stock específico de variación
- [ ] Disminuye cantidad → valida correctamente
- [ ] Elimina producto → elimina por SKU (no afecta otras variaciones del producto)
- [ ] Recargar página → syncCartWithStock() valida stock de variaciones
- [ ] Cambia precio en admin → recarga carrito → precio se actualiza

### En Checkout
- [ ] Confirma orden → stock se deduce de product_variations (no de products)
- [ ] Verifica order line items → contienen SKU correcto

---

## Notas Técnicas

### Estructura de Item en Carrito
```javascript
{
  id: "550e8400-e29b-41d4-a716-446655440001",      // product id
  name: "Camiseta Premium",                         // product name
  price: 25.00,                                      // precio de LA VARIACION (not avg)
  image_url: "...",
  quantity: 2,
  
  // NUEVO: Solo si es variación
  sku: "CAMI-RED-S",                                // unique variation id
  options: { color: "Rojo", talla: "S" },
  variationStock: 10,                               // stock de la variación
}
```

### Validación de Cantidad
```javascript
// ANTES: if (qty > product.stock) ← stock total
// AHORA: if (qty > variation.stock) ← stock específico de color+talla
```

### Clave de Búsqueda en Carrito
```javascript
// ANTES: cartKey = productId
// AHORA: cartKey = sku ? `${productId}::${sku}` : productId
// Permite múltiples items del mismo producto pero DIFERENTES variaciones
```

---

## Status

✅ **Implementación Completa**
- app.js: actualizado
- tienda.js: actualizado
- carrito.js: actualizado
- Backward compatible: ✅
- Listo para testing: ✅

---

**Última actualización**: Marzo 20, 2026
**Status**: Ready for QA Testing
