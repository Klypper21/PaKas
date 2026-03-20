# 🔍 PRUEBA DE GALERÍA: Verificar qué imágenes se cargan

## Paso a Paso (2 minutos)

### 1. Recarga el navegador
- Presiona **Ctrl+F5** (limpiar caché completo)

### 2. Abre la consola
- Presiona **F12**
- Haz click en la pestaña **Console**

### 3. Abre un producto CON variaciones
- En la tienda, busca un producto que tengas con variaciones
- Haz click para abrirlo

### 4. Mira la consola
Deberías ver un bloque de mensajes como este:

```
[Variations] ===== INICIO CARGA GALERÍA =====
[Variations] Imágenes iniciales (main + extras): 1
[Variations] ✅ Variaciones cargadas: 5
[Variations]   ✅ Rojo-M: https://...
[Variations]      → Agregada a galería (índice 1)
[Variations]   ✅ Rojo-L: https://...
[Variations]      → Agregada a galería (índice 2)
...
[Variations] 📊 Imágenes de variaciones agregadas: 3
[Variations] 📸 GALERÍA FINAL: 4 imágenes totales
[Variations] ✅ CAROUSEL RENDERIZADO: 4 imágenes en HTML
[Variations]   1. https://...
[Variations]   2. https://...
[Variations]   3. https://...
[Variations]   4. https://...
```

### 5. Analiza el resultado

#### ✅ Si ves algo parecido:
**SIGNIFICA:** Las imágenes SÍ se están cargando en la galería.
**PRUEBA:** Selecciona una variación → La imagen debe cambiar.

#### ❌ Si ves "GALERÍA FINAL: 1 imágenes totales":
**SIGNIFICA:** Las imágenes de variaciones NO se están cargando.
**POSIBLE CAUSA:** Las variaciones no tienen image_url en BD.

#### ❌ Si ves "Imágenes de variaciones agregadas: 0":
**SIGNIFICA:** Hay variaciones pero SIN imagen_url.
**SOLUCIÓN:** Necesitas subir imágenes en admin para cada variación.

---

## Copia y Pega (Método Rápido)

Si prefieres ejecutar un debug más completo, copia esto en la consola y pega (Enter):

```javascript
window.debugGalleryVariations(1);  // Reemplaza 1 con tu ID de producto
```

Verás un análisis completo de:
- Imagen principal ✅/❌
- Imágenes extras
- Variaciones con imagen
- Galería final

---

## Resultado Esperado

Si todo está correcto, cuando abras un producto deberías ver:

1. **En la galería:** Imagen principal + extras + imágenes de variaciones
2. **En los indicadores:** Puntos para cada imagen
3. **Al seleccionar variación:** La imagen debe cambiar automáticamente

---

## Si Está Fallando...

### Caso 1: "Variaciones cargadas: 0"
```
→ El producto NO tiene variaciones en BD
→ Solución: Crear variaciones en admin
```

### Caso 2: "Sin imagen" en todas las variaciones
```
→ Las variaciones existen pero NO tienen image_url
→ Solución: Subir imágenes en admin para cada variación
```

### Caso 3: "CAROUSEL RENDERIZADO: 1 imágenes"
```
→ Solo se está mostrando imagen principal
→ Las imágenes de variaciones NO se agregaron
→ Problema: En el código, no se agregan a allImages
```

### Caso 4: Imágenes en logs pero NO en galería visual
```
→ Las imágenes se cargan pero CSS oculta indicadores
→ O hay problema con renderizado
```

---

## Que Reportar Si Persiste

Copia los siguientes datos:

```javascript
// Ejecuta en consola:
console.log('PRODUCTO ID: 1');  // Tu ID
const productId = 1;
const vars = await supabase.from('product_variations').select('color, talla, image_url').eq('parent_product_id', productId);
console.table(vars.data);
```

**Envía una captura con:**
- El console output de [Variations]
- El resultado de console.table
- Una captura de la galería visual del producto
