# SOLUCIÓN: Imágenes de Variaciones No Se Muestran

## Problema Identificado
Hay **2 problemas potenciales** en el código:

### Problema 1: Las imágenes no se guardaron en la BD
- Las imágenes se seleccionan en admin pero NO se guardan en `product_variations.image_url`
- **Causa:** Probablemente error en el upload o en el guardado

### Problema 2: Las imágenes existen pero no se muestran
- Las imágenes se guardaron en BD ✅
- Pero tienda.html NO las carga o NO las muestra cuando selecciona variación
- **Causa:** Problemas en `tienda-variations-enhancement.js`

---

## PASO 1: Verificar si las imágenes se guardaron

### Opción A: Desde la consola del navegador

1. Abre `index.html` en tu navegador
2. Abre la consola: **F12 → Tab "Console"**
3. Ejecuta esto:

```javascript
// Verificar si las imágenes están en la BD
const testImagenes = async () => {
  // Obtén el primer producto con variaciones
  const { data: products } = await supabase
    .from('products')
    .select('id')
    .limit(1);
  
  if (!products?.[0]) {
    console.log('No hay productos');
    return;
  }
  
  const pid = products[0].id;
  console.log('🔍 Verificando producto ID:', pid);
  
  // Obtén las variaciones
  const { data: vars, error } = await supabase
    .from('product_variations')
    .select('*')
    .eq('parent_product_id', pid);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!vars || vars.length === 0) {
    console.log('❌ Este producto NO tiene variaciones');
    return;
  }
  
  console.log(`\n✅ Encontradas ${vars.length} variaciones:\n`);
  vars.forEach((v, i) => {
    console.log(`  ${i+1}. ${v.color}-${v.talla}`);
    console.log(`     - SKU: ${v.sku}`);
    console.log(`     - Imagen: ${v.image_url ? '✅ ' + v.image_url.substring(0, 40) + '...' : '❌ NO TIENE'}`);
    console.log('');
  });
};

testImagenes();
```

**Resultado esperado:**
- Si ves `✅ ` con una URL = **Las imágenes SÍ se guardaron** → Ve a PASO 2
- Si ves `❌ NO TIENE` = **Las imágenes NO se guardaron** → Ve a PASO 3

---

## PASO 2: Si las imágenes ESTÁN en la BD

Las imágenes se guardaron correctamente. El problema está en el código que las carga.

### Solución: Usar la versión mejorada

1. **Abre** `index.html`
2. **Encuentra** esta línea (cerca del final, en los `<script>` tags):
   ```html
   <script src="js/tienda-variations-enhancement.js"></script>
   ```

3. **Reemplázala con:**
   ```html
   <script src="js/tienda-variations-enhancement-v2.js"></script>
   <!--
   NOTA: tienda-variations-enhancement-v2.js es una versión mejorada que:
   - Agrega imágenes dinámicamente si no estaban en galería
   - Mejor logging para debugging
   - Fallback a imagen principal si variación no tiene imagen
   - Mejor manejo de errores
   -->
   ```

4. **Guarda el archivo**
5. **Recarga tu navegador** (Ctrl+F5 para limpiar cache)
6. **Abre un producto con variaciones**
7. **Selecciona una variación** → La imagen debería cambiar

**Para verificar que funciona:**
- Abre consola (F12)
- Selecciona una variación
- Deberías ver mensajes como:
  ```
  [Variations] Variación seleccionada: Rojo-M, imagen: Sí
  [Variations] Imagen encontrada en índice 2
  ```

---

## PASO 3: Si las imágenes NO ESTÁN en la BD

Hay un problema al guardarlas desde admin. Sigue estos pasos:

### 3.1: Verifica que el modal existe en admin.html

1. **Abre** `admin.html`
2. **Busca:**  `variation-image-modal`
3. **Si NO lo encuentra:**
   - Este es el problema
   - El modal de imagen no existe en el HTML
   - **Solución:** Ver archivo `ADMIN_IMAGENES_VARIACIONES_FIX.md` (será creado)

### 3.2: Si el modal EXISTE, revisa la carga

1. **Abre** `admin.html` en navegador
2. **Abre consola:** F12
3. **Crea un nuevo producto con variaciones**
4. **En la matriz, haz click en "Cargar" para una variación**
5. **Selecciona una imagen**  
6. **Haz click en "Confirmar"**
7. **En consola, busca errores** (Errors tab)

**Errores comunes:**

```
❌ "Can't find element variation-image-modal"
→ El modal no existe en admin.html

❌ "Error uploading: Access denied"
→ Problema de permisos en Supabase Storage

❌ "TypeError: uploadImageFile is not a function"
→ La función no se cargó correctamente
```

### 3.3: Test de upload manual

```javascript
// En consola de admin.html:

const testUpload = async () => {
  // Crear archivo de prueba
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, 100, 100);
  
  canvas.toBlob(async (blob) => {
    const file = new File([blob], 'test.png', { type: 'image/png' });
    
    // Intentar subir
    try {
      const timestamp = Date.now();
      const fileName = `variations/test-${timestamp}.webp`;
      
      const { data, error } = await supabase.storage
        .from('products')
        .upload(fileName, file);
      
      if (error) {
        console.error('❌ Error subiendo:', error);
      } else {
        console.log('✅ Archivo subido:', data);
        
        // Obtener URL pública
        const { data: urlData } = supabase.storage
          .from('products')
          .getPublicUrl(fileName);
        
        console.log('✅ URL pública:', urlData.publicUrl);
      }
    } catch (err) {
      console.error('❌ Error:', err);
    }
  });
};

testUpload();
```

---

## PASO 4: Implementaciones Quickfix

### Si el problema es el modal falta/no funciona:

**En admin.html, busca:**
```html
</body>
```

**Justo ANTES de `</body>`, agrega:**

```html
<!-- Modal para subir imagen de variación -->
<div id="variation-image-modal" class="modal hidden">
  <div class="modal-backdrop"></div>
  <div class="modal-content">
    <div class="modal-header">
      <h3>Seleccionar Imagen de Variación</h3>
      <button class="modal-close" aria-label="Cerrar">&times;</button>
    </div>
    <div class="modal-body">
      <input 
        type="file" 
        id="variation-image-input"
        accept="image/*"
        style="display: none;"
      >
      <button type="button" id="btn-select-variation-image" class="btn btn-primary">
        Seleccionar Archivo
      </button>
      <div id="variation-image-preview" style="margin-top: 1rem;">
        <p>Se abrirá un selector automáticamente</p>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" id="btn-variation-image-cancel" class="btn btn-outline">Cancelar</button>
      <button type="button" id="btn-variation-image-confirm" class="btn btn-primary">Confirmar</button>
    </div>
  </div>
</div>
```

---

## Checklist de Solución

### Intenta primero (más fácil):
- [ ] Verificar si imágenes están en BD (Paso 1)
- [ ] Si SÍ están: Usar tienda-variations-enhancement-v2.js (Paso 2)
- [ ] Recargar navegador con Ctrl+F5
- [ ] Probar abriendo producto con variaciones

### Si eso no funciona:
- [ ] Ejecutar test de upload (Paso 3.3)
- [ ] Revisar consola de errores (F12 → Errors)
- [ ] Verificar que modal existe en admin.html (Paso 3.1)
- [ ] Agregar modal si falta (Paso 4)

### Si aún no funciona:
- [ ] Crear nuevo producto desde cero
- [ ] Subir imagen de variación
- [ ] Ver si se guarda
- [ ] Si no: Revisar permisos de Supabase Storage

---

## Archivos Clave

| Archivo | Función |
|---------|---------|
| `js/tienda-variations-enhancement.js` | Versión ORIGINAL (si tienes problemas, usa v2) |
| `js/tienda-variations-enhancement-v2.js` | Versión MEJORADA (recomendada) |
| `index.html` | Cambiar de enhancement.js a enhancement-v2.js |
| `admin.html` | Verificar que existe `variation-image-modal` |
| `js/admin.js` | Lógica de upload (línea ~745) |

---

## Preguntas Frecuentes

**P: ¿Perderé datos si cambio a v2?**
A: No. La v2 es solo una mejora del mismo código. Las imágenes ya guardadas funcionarán mejor.

**P: ¿Cuál es la diferencia entre v1 y v2?**
A: 
- v1: Solo busca imagen en la galería que se construyó al abrir modal
- v2: Si la imagen no estaba, la agrega dinámicamente (más robusto)

**P: ¿Las imágenes deben estar en formato específico?**
A: No. Se aceptan JPG, PNG, WebP, etc. Se convierten a WebP automáticamente.

**P: ¿Hay límite de tamaño?**
A: Supabase tiene límite de 50MB por archivo. Para imágenes, 5-10MB es recomendado.

