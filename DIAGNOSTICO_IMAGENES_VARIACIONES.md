# DIAGNÓSTICO: Imágenes de Variaciones No Se Muestran en la Galería

## Síntoma
En la galería del producto, cuando selecciona una variación (color + talla), NO se muestran las imágenes que subió para esa variación específica.

---

## Causas Posibles (en orden de probabilidad)

### 1. ❌ **Imágenes NO se están guardando en la Base de Datos**
**Señal:** Las imágenes NO aparecen en el panel admin después de guardarlas.

**Solución:**
- Ve a `admin.html` → Crear/Editar Producto
- En la matriz de variaciones, haz click en "Cargar" o "Cambiar" para una variación
- Verifica que la imagen se previsualize en el modal
- Haz click en "Confirmar"
- **IMPORTANTE:** Verifica que el botón esté etiquetado como "Confirmar" (no "Subir")

**Código para probar:**
```javascript
// En la consola del navegador (F12):
localStorage.setItem('debugVariationsMode', 'on');
```
Luego abre un producto en tienda. En la consola verás un análisis completo.

---

### 2. ⚠️ **Las imágenes se guardaron pero tienda.js no las está cargando**
**Señal:** Las imágenes existen en la BD pero no aparecen en la galería al seleccionar variación.

**Verificar en consola:**
```javascript
// En tienda (F12):
window.debugVariationImages(<ID_DEL_PRODUCTO>)
```

Busca en la salida: `Imagen URL: ` - Si dice `❌ NO TIENE`, las imágenes no se guardaron.

---

### 3. 🔧 **El switchToVariationImage está siendo llamado pero no funciona**
**Señal:** Las imágenes están en la galería pero no cambian cuando selecciona variación.

**Verificar:**
- Abre página de producto
- Abre consola (F12)
- Selecciona una variación
- ¿Ves mensajes de "[Variations]" en la consola?
- ¿Ves `switchToVariationImage` llamado?

---

## Checklist de Verificación Rápida

### Paso 1: ¿Las imágenes se guardaron?
```bash
# En admin, edita un producto con variaciones
# Haz click en "Cargar" para una variación
# Selecciona imagen
# Click "Confirmar"
# Haz click en "Guardar Producto"
# Espera a que diga "Producto creado/actualizado correctamente"
```

**Problema:** Si da error al guardar, revisa la consola (F12) → Errors tab

---

### Paso 2: ¿Las imágenes están en la BD?
```javascript
// En consola de tienda.html (F12):
const { data } = await supabase
  .from('product_variations')
  .select('*')
  .eq('parent_product_id', 1); // Reemplaza 1 con tu ID de producto

console.table(data); // Verás todas las variaciones
// Busca la columna "image_url" - debe tener una URL si subiste imagen
```

**Problema:** Si `image_url` está vacío o null, las imágenes NO se guardaron.

---

### Paso 3: ¿El cliente está recibiendo las imágenes?
```javascript
// En consola de tienda.html, abre cualquier producto:
window.debugVariationImages(1); // Reemplaza 1 con tu ID
```

**Lee el output:**
- ✅ Si ves "Imagen disponible: https://..." → La imagen está bien
- ❌ Si ves "❌ NO TIENE" → No se guardó

---

## Soluciones Específicas

### Si las imágenes NO se guardan en admin:

1. **Verifica el modal de imagen:**
   - File: `admin.html` → Busca `<div id="variation-image-modal"`
   - ¿Existe el modal?

2. **Verifica la carga en admin.js:**
   - File: `js/admin.js` línea ~745
   - ¿Está el código `if (v.image instanceof File) { imageUrl = await uploadImageFile(...) }`?

3. **Verifica uploadImageFile:**
   - File: `js/admin.js` línea ~548
   - Cuando subas imagen, ¿aparece en los logs de Supabase Storage?

---

### Si las imágenes se guardaron pero NO se muestran:

1. **Verifica que tienda-variations-enhancement.js se carga:**
   - Abre `index.html`
   - Busca: `<script src="js/tienda-variations-enhancement.js">`
   - ¿Existe esta línea?

2. **Verifica el callback onVariationChange:**
   - File: `js/tienda-variations-enhancement.js` línea ~73
   - El callback debe llamar a `window.switchToVariationImage(variation.image_url)`

3. **Verifica que switchToVariationImage existe:**
   - En consola de tienda: `typeof window.switchToVariationImage`
   - Debe decir: `"function"`

---

## Comando de Debug Automático

Ejecuta esto en la consola de `tienda.html`:

```javascript
// Obtén un ID de producto con variaciones
const test = async () => {
  // Cargar primer producto
  const { data: products } = await supabase.from('products').select('id').limit(1);
  if (!products?.[0]) { console.log('No hay productos'); return; }
  
  const pid = products[0].id;
  console.log(`Debugueando producto ID: ${pid}`);
  
  // Llamar función de debug
  window.debugVariationImages?.(pid) || console.log('Debug function not loaded');
};

test();
```

---

## Archivo de Debug Disponible

Se creó: `js/debug-variations-images.js`

**Para usarlo:**
1. En tienda.html, busca la última línea `</body>`
2. Antes de `</body>`, agrega:
   ```html
   <script src="js/debug-variations-images.js"></script>
   ```

3. Activa el modo debug:
   ```javascript
   localStorage.setItem('debugVariationsMode', 'on');
   location.reload();
   ```

---

## Si Nada Funciona

Recopila esta información:

1. **Producto ID con problema**
2. **Consola output (F12 → Console tab)**
3. **¿Imagen se carga en admin pero no se guarda?**
4. **¿Error en guardar producto?**
5. **¿Variación existe en BD pero sin image_url?**

---

## Links Rápidos

- 📄 [Admin Form](admin.html) - Crear/editar con variaciones
- 🏪 [Tienda](index.html) - Verificar galería
- 🐛 Debug script: `js/debug-variations-images.js`
- 📊 BD table: `product_variations` > column `image_url`

---

## Próximos Pasos

1. Ejecuta el diagnóstico arriba
2. Identifica cuál de los 3 problemas es el tuyo
3. Aplica la solución correspondiente
4. Si persiste, recopila la info de "Si Nada Funciona" y contacta
