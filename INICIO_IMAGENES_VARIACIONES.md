# 📸 NUEVO: Imágenes por Variación de Producto

## Inicio Rápido (3 pasos)

### 1️⃣ **Admin sube imágenes por variación**
   - Abre: Panel Admin → Productos → Nuevo/Editar Producto
   - Agrega colores (ej: Rojo, Azul)
   - Agrega tallas (ej: S, M, L)
   - **VERÁS UNA MATRIZ** con stock + precio + **botón "Cargar Imagen"** en cada celda
   - Clickea botón → Selecciona imagen de esa variación → ¡Listo!

### 2️⃣ **Las imágenes se agregan a la galería automáticamente**
   - Todas las imágenes de variaciones se añaden a la galería del producto
   - Sin duplicados
   - Se mostrarán junto con la imagen principal

### 3️⃣ **Cliente selecciona variación → imagen cambia automáticamente**
   - Cliente ve producto en tienda
   - Selecciona Color (Rojo) + Talla (M)
   - **¡La imagen cambia automáticamente a la de Rojo-M!**
   - Cliente ve exactamente cómo se verá su compra

---

## 📋 Funcionamiento Completo

### En el Admin (Panel de Administración):

```
Crear Producto
├─ Nombre: "Camiseta Premium"
├─ Colores: Rojo, Azul, Negro
├─ Tallas: S, M, L, XL
│
└─ MATRIZ: Color × Talla
   ┌─────────────┬───┬───┬───┬───┐
   │ Color/Talla │ S │ M │ L │XL │ [IMAGEN]
   ├─────────────┼───┼───┼───┼───┼─────────
   │ Rojo        │ 5 │ 8 │ 3 │ 2 │ [📷 Cargar]
   │ Azul        │ 7 │ 4 │ 6 │ 4 │ [📷 Cargar]
   │ Negro       │ 3 │ 9 │ 5 │ 7 │ [📷 Cargar]
   └─────────────┴───┴───┴───┴───┴─────────
```

**Pasos:**
1. Completa stock y precio para cada variación
2. Clickea el botón "Cargar Imagen" en cada celda
3. Elige foto de esa variación (Rojo-S, Azul-M, etc)
4. ¡Se guarda automáticamente y ves miniatura en la matriz!
5. Guarda el producto

### En la Tienda (Cliente):

```
Producto: Camiseta Premium
├─ Carousel de imágenes:
│  ├─ Imagen principal
│  ├─ Imagen extra 1
│  ├─ Imagen extra 2
│  ├─ [NEW] Imagen variación Rojo
│  ├─ [NEW] Imagen variación Azul
│  └─ [NEW] Imagen variación Negro
│
├─ Selector de Color: [Rojo ▼]
├─ Selector de Talla: [M ▼]
├─ Precio: 25.00 CUP
├─ Stock: En stock
│
└─ [Añadir al carrito]

⚡ MAGIA: Cuando cambia Color/Talla → ¡Imagen cambia sola!
```

---

## 🎯 Puntos Clave

| Característica | Detalles |
|---|---|
| **Dónde subir** | Admin → Productos → Nueva/Editar → Botón "Cargar Imagen" en matriz |
| **Qué imágenes** | Una para cada combinación color+talla |
| **Automático** | Al cambiar variación, imagen cambia sin recargar |
| **Galería** | Las imágenes de variaciones se agregan automáticamente |
| **Sin duplicados** | Si subes la misma imagen para múltiples variaciones, solo aparece 1x |
| **Compresión** | Se convierte a WebP automáticamente (ahorra espacio) |
| **Fallback** | Si falta imagen en variación, muestra imagen principal |

---

## ⚙️ Detalles Técnicos

### Estructura de Datos:
```sql
product_variations
├─ id (único)
├─ parent_product_id (vinculado a productos)
├─ sku (código único)
├─ color (ej: Rojo)
├─ talla (ej: M)
├─ stock (cantidad)
├─ price (precio individual)
└─ image_url ← [NUEVA] Tu imagen de esta variación
```

### Flujo de Carga:
1. Admin selecciona archivo en modal
2. Se comprime a WebP
3. Se sube a Supabase Storage (/productos/variaciones/)
4. Se obtiene URL pública
5. Se guarda en BD con color+talla+image_url

---

## 🐛 Solución de Problemas

### La imagen no carga en el modal del admin
- ✔️ Espera a que se abra el modal de imagen
- ✔️ Verifica que el archivo sea: JPG, PNG o WebP
- ✔️ Máximo tamaño recomendado: 5MB (se comprime automáticamente)

### La imagen no aparece en la tienda
- ✔️ Recargaba la página (Ctrl+F5)
- ✔️ Verifica que guardaste el producto después de subir imagen
- ✔️ Abre la consola (F12) → pestaña "Red" → busca errores

### La imagen no cambia al seleccionar variación
- ✔️ Asegúrate de que la variación TIENE imagen en el admin
- ✔️ El cliente debe seleccionar color Y talla (no solo uno)

---

## 🎓 Ejemplos de Uso

### Ejemplo 1: Camiseta con 3 colores
```
Camiseta Rojo-S → foto1.jpg
Camiseta Rojo-M → foto2.jpg
Camiseta Azul-S → foto3.jpg
Azul-M → usa imagen principal (no tiene foto específica)
```

Cliente ve galería con: foto1, foto2, foto3 + imagen principal
Cuando selecciona Azul-M → ve imagen principal
Cuando selecciona Rojo-S → ve foto1

### Ejemplo 2: Pantalón con tallas diferentes por color
```
Color Negro → misma foto para S,M,L,XL
Color Azul → diferente foto para S,M,L,XL
```

Cliente ve 2 imágenes en galería (Negro + Azul)
Cuando selecciona Negro → ve foto de Negro (igual para todas tallas)
Cuando selecciona Azul → ve foto de Azul

---

## 📞 Soporte

Si encuentra errores o tiene dudas, revisa:
1. Consola del navegador (F12 → Console)
2. Los archivos: `js/product-variations-builder.js`, `js/admin.js`, `js/tienda-variations-enhancement.js`
3. Base de datos: Tabla `product_variations` → Columna `image_url`

¡Listo! 🎉 Ahora tu tienda muestra productos con imágenes reales de cada variación.

