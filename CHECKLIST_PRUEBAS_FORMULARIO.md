# ✅ Checklist de Pruebas - Formulario Integrado de Productos

## FASE 1: Pruebas en Navegador 

### 1.1 Abrir Admin Panel
- [ ] Navega a `http://localhost/admin.html`
- [ ] Inicia sesión como administrador
- [ ] Espera a que la página cargue completamente

### 1.2 Acceder al Panel de Productos
- [ ] Haz click en la pestaña **"Productos"**
- [ ] Verifica que se carga la lista de productos existentes
- [ ] Busca el botón **"Nuevo producto"**

### 1.3 Abrir Modal de Nuevo Producto
- [ ] Haz click en **"Nuevo producto"**
- [ ] Se abre modal con el formulario
- [ ] Verifica que aparece la sección **"COLORES Y TALLAS"**
- [ ] Verifica que la matriz está **OCULTA** inicialmente (no debe haber nada en "Stock y Precio por Variación")

---

## FASE 2: Pruebas de Interfaz de Colores

### 2.1 Agregar Primer Color
- [ ] En sección "Colores disponibles", escribe **"Rojo"** en el input
- [ ] Presiona **ENTER** o haz click en botón "Agregar color"
- [ ] Aparece un **chip/etiqueta "Rojo ×"** debajo del input
- [ ] El input se vacía

### 2.2 Agregar Segundo Color
- [ ] Escribe **"Azul"** en el input
- [ ] Presiona **ENTER**
- [ ] Aparece chip **"Azul ×"** junto a "Rojo ×"
- [ ] El input sigue vacío y listo para nuevo color

### 2.3 Validación de Duplicados
- [ ] Intenta agregar **"Rojo"** de nuevo
- [ ] **Esperado:** No se agregar (o muestra alerta "Color ya existe")
- [ ] Input se vacía de todas formas

### 2.4 Remover Color
- [ ] Haz click en el " **×** " del chip "Azul ×"
- [ ] El chip desaparece
- [ ] **Nota:** Si la matriz ya existía, debería actualizarse quitando la columna Azul

---

## FASE 3: Pruebas de Interfaz de Tallas

### 3.1 Agregar Primer Talla
- [ ] En sección "Tallas disponibles", escribe **"S"** en el input
- [ ] Presiona **ENTER**
- [ ] Aparece chip **"S ×"** debajo del input
- [ ] El input se vacía

### 3.2 Agregar Más Tallas
- [ ] Agrega **"M"**, **"L"**, **"XL"** siguiendo el mismo procedimiento
- [ ] Después de cada una, aparece un nuevo chip
- [ ] Resultado: chips **"S ×  M ×  L ×  XL ×"** en la lista

### 3.3 Validación de Duplicados
- [ ] Intenta agregar **"M"** de nuevo
- [ ] **Esperado:** No se agrega (o alerta)

### 3.4 Remover Talla
- [ ] Haz click en " **×** " del chip "L ×"
- [ ] El chip desaparece
- [ ] Tallas ahora son: **"S  M  XL"** (3 tallas)
- [ ] Si hay matriz: se actualiza (ahora tiene 3 columnas en lugar de 4)

---

## FASE 4: Pruebas de Matriz de Variaciones

### 4.1 Matriz Aparece Automáticamente
- [ ] Después de agregar colores Y tallas (al menos 1 de cada)
- [ ] La sección **"Stock y Precio por Variación"** debe aparecer
- [ ] Se ve una tabla con:
  - **Encabezado superior:** Nombres de tallas (S, M, XL)
  - **Primera columna:** Nombres de colores (Rojo)

### 4.2 Estructura de Matriz (Ejemplo)
```
        S        M        XL
Rojo  [  ]    [  ]    [  ]
      [  ]    [  ]    [  ]
```
- [ ] Cada celda tiene **2 inputs**: uno para Stock, uno para Precio
- [ ] Stock input debe aceptar números (0, 5, 10, 100)
- [ ] Precio input debe aceptar decimales (25.00, 15.50)

### 4.3 Llenar Valores en Matriz
- [ ] Haz click en la primera celda (Rojo - S)
- [ ] Ingresa **Stock: 10**
- [ ] Ingresa **Precio: 25.00**
- [ ] Muévete a siguiente celda (Rojo - M)
- [ ] Ingresa **Stock: 15**
- [ ] Ingresa **Precio: 25.00**
- [ ] Continúa con Rojo - XL: **Stock: 8**, **Precio: 30.00**
- [ ] Matriz ahora muestra valores reales

### 4.4 Matriz Dinámicamente Persiste
- [ ] Agrega un nuevo color (ej: "Negro")
- [ ] La matriz se actualiza: aparece nueva fila "Negro"
- [ ] Celdas nuevas tienen stock=0, precio=0
- [ ] Antigos valores del "Rojo" se mantienen

---

## FASE 5: Pruebas de Otros Campos del Formulario

### 5.1 Campos Básicos Existen
- [ ] Verifica que existen y son editables:
  - [ ] **Nombre del producto** (input text)
  - [ ] **Descripción** (textarea)
  - [ ] **Material** (input text o dropdown si aplica)
  - [ ] **Categoría** (dropdown o input)
  - [ ] **Recomendaciones** (textarea, si existe)
  - [ ] **Imagen** (input type=file, si existe)

### 5.2 Campos Removidos Correctamente
- [ ] **NO debe existir** campo "Talla" individual (removed)
- [ ] **NO debe existir** campo "Precio" individual (removed)
- [ ] **NO debe existir** campo "Stock" individual (removed)
- [ ] **NO debe existir** campo "Colores" como selector (reemplazado por matriz)

### 5.3 Llenar Formulario Completo
- [ ] Nombre: **"Camiseta Premium de Verano"**
- [ ] Descripción: **"Una camiseta cómoda para días calurosos"**
- [ ] Material: **"100% Algodón"**
- [ ] Categoría: **"Camisetas"** (o la que aplique)
- [ ] Imagen: (sube una imagen, opcional)
- [ ] Colores: **"Rojo", "Azul", "Negro"** (agregar 3)
- [ ] Tallas: **"S", "M", "L", "XL"** (agregar 4)
- [ ] Matriz: llena los 12 valores (3 colores × 4 tallas)
  ```
  Rojo-S: stock=5, precio=25
  Rojo-M: stock=8, precio=25
  Rojo-L: stock=6, precio=25
  Rojo-XL: stock=3, precio=30
  
  Azul-S: stock=10, precio=25
  Azul-M: stock=10, precio=25
  Azul-L: stock=8, precio=25
  Azul-XL: stock=0, precio=30
  
  Negro-S: stock=15, precio=28
  Negro-M: stock=15, precio=28
  Negro-L: stock=15, precio=28
  Negro-XL: stock=10, precio=33
  ```

---

## FASE 6: Pruebas de Guardado

### 6.1 Envío de Formulario
- [ ] Haz scroll hasta el final del modal
- [ ] Busca el botón **"Guardar"** o **"Crear producto"**
- [ ] Haz click en el botón
- [ ] **Esperado:** Breve carga/validación en navegador

### 6.2 Respuesta en Navegador
- [ ] **Esperado (éxito):** 
  - Notificación tipo **Toast** en la pantalla: "Producto creado exitosamente" o similar
  - Modal se cierra después de 1-2 segundos
  - Lista de productos se recarga

- [ ] **Si hay error:**
  - Notificación de error visible
  - Modal permanece abierto
  - Puedes corregir y reintentar
  - Ver sección "Debugging" más abajo

### 6.3 Verificar Lista de Productos
- [ ] Después de guardar, la lista se recarga
- [ ] Verifica que el nuevo producto aparece en la lista
- [ ] Busca por nombre: **"Camiseta Premium de Verano"**
- [ ] Haz click para ver detalles del producto

### 6.4 Verificar Detalles del Producto
- [ ] Abre el producto recién creado (click en nombre o botón "Ver")
- [ ] Verifica que aparecen:
  - Nombre correcto
  - Descripción correcta
  - Material correcto
  - Categoría correcta
  - **Precio mostrado:** Promedio de todos los precios (ejemplo: si agregaste 1 variación a 30 y otras a 25, debería ser ~26.25)
  - **Stock mostrado:** Suma total de stock (ejemplo: si agregaste 5+8+6+3+10+10+8+0+15+15+15+10 = 113)

---

## FASE 7: Verificación en Base de Datos

### 7.1 Acceso a Supabase
- [ ] Abre Supabase dashboard
- [ ] Ve a tu proyecto
- [ ] En SQL Editor, ejecuta:

```sql
-- Ver producto recién creado
SELECT id, name, description, material, price, stock, colores, talla 
FROM products 
ORDER BY created_at DESC 
LIMIT 1;
```

- [ ] Verifica que aparece con:
  - Nombre: "Camiseta Premium de Verano"
  - Material: "100% Algodón"
  - Price: ~26.25 (promedio de variaciones)
  - Stock: 113 (suma de variaciones)
  - Colores: JSON con ["Rojo", "Azul", "Negro"]
  - Talla: "S, M, L, XL"

### 7.2 Verificar Variaciones Creadas
- [ ] Copia el **ID** del producto del paso anterior
- [ ] Ejecuta:

```sql
-- Ver variaciones del producto
SELECT id, parent_product_id, sku, color, talla, stock, price 
FROM product_variations 
WHERE parent_product_id = 'PEGA_EL_ID_AQUI'
ORDER BY color, talla;
```

- [ ] **Esperado:** 12 registros (3 colores × 4 tallas)
- [ ] Verifica algunos ejemplos:
  - [ ] `Rojo + S`: stock=5, price=25.00, SKU algo como "CAMI-RED-S"
  - [ ] `Azul + XL`: stock=0, price=30.00
  - [ ] `Negro + L`: stock=15, price=28.00
- [ ] Todos los SKUs deben ser únicos y generados automáticamente

### 7.3 Verificar Asociación de Datos
- [ ] Cada variación debe tener:
  - [ ] `parent_product_id` = ID del producto (CORRECTO)
  - [ ] `color` IN ("Rojo", "Azul", "Negro")
  - [ ] `talla` IN ("S", "M", "L", "XL")
  - [ ] `stock` > 0 o = 0 (dependiendo de lo que ingresaste)
  - [ ] `price` > 0
  - [ ] `sku` != NULL y único

---

## FASE 8: Pruebas en Tienda (Frontend)

### 8.1 Abrir Tienda
- [ ] Ve a `http://localhost/tienda.html`
- [ ] Espera a que cargue la lista de productos
- [ ] Busca el producto **"Camiseta Premium de Verano"**

### 8.2 Abrir Producto en Modal
- [ ] Haz click en el producto para abrir modal de detalles
- [ ] Verifica que aparecen:
  - Nombre, descripción, imagen
  - **Selector de Colores** con opciones: Rojo, Azul, Negro
  - **Selector de Tallas** con opciones: S, M, L, XL
  - Precio y stock

### 8.3 Pruebas de Selectores Dinámicos
- [ ] Selecciona color **"Rojo"**
  - [ ] Selector de tallas se actualiza (debe mostrar todas)
  - [ ] Precio se actualiza: debe mostrar **25.00** (precio de Rojo)
  - [ ] Stock se actualiza: debe mostrar total de Rojo (5+8+6+3 = 22)

- [ ] Ahora selecciona talla **"S"**
  - [ ] Precio se actualiza: **25.00** (específico de Rojo-S)
  - [ ] Stock se actualiza: **5** (específico de Rojo-S)

- [ ] Cambia a color **"Negro"**, talla **"XL"**
  - [ ] Precio: **33.00**
  - [ ] Stock: **10**

### 8.4 Pruebas de Productos Agotados
- [ ] Selecciona **"Azul" + "XL"**
  - [ ] Stock debe mostrar: **0**
  - [ ] **Esperado:** Botón "Agregar al carrito" DESHABILITADO (gris)
  - [ ] O muestra mensaje "Agotado"

### 8.5 Carrito Persiste Correctamente
- [ ] Selecciona Rojo - S (stock=5)
- [ ] Escribe cantidad: **3**
- [ ] Haz click **"Agregar al carrito"**
- [ ] Carrito se actualiza
- [ ] Abre carrito y verifica:
  - [ ] Producto aparece con especificaciones: "Rojo, S"
  - [ ] Cantidad: 3
  - [ ] Precio unitario: 25.00
  - [ ] Subtotal: 75.00

---

## FASE 9: Pruebas de Edición de Producto

### 9.1 Volver a Admin Panel
- [ ] Abre admin.html
- [ ] Ve a "Productos"
- [ ] Busca el producto "Camiseta Premium de Verano"
- [ ] Haz click en "Editar" (o botón de edición)

### 9.2 Verificar Carga de Datos
- [ ] Modal se abre con datos del producto
- [ ] Verificar que aparecen en la matriz:
  - [ ] Colores cargados: Rojo, Azul, Negro
  - [ ] Tallas cargadas: S, M, L, XL
  - [ ] Valores de stock/precio cargados correctamente en cada celda

### 9.3 Modificar Valores Existentes
- [ ] Modifica el stock de **Azul-XL** de 0 a 5
- [ ] Modifica el precio de **Negro-XL** de 33.00 a 32.00
- [ ] Agrega un nuevo color **"Blanco"**
- [ ] **Resultado esperado:** 
  - Matriz se expande con nueva fila Blanco (4 nuevas celdas)
  - Celdas nuevas tienen stock=0, precio=0
  - Puedes llenarlas o dejarlas vacías

### 9.4 Guardar Cambios
- [ ] Scroll hasta abajo
- [ ] Haz click **"Guardar"** o **"Actualizar"**
- [ ] **Esperado:** Notificación de éxito
- [ ] Modal se cierra

### 9.5 Verificar Cambios en BD
- [ ] En Supabase, ejecuta:
```sql
SELECT * FROM product_variations 
WHERE parent_product_id = 'EL_ID_DEL_PRODUCTO'
ORDER BY color, talla;
```

- [ ] **Esperado:** 
  - [ ] Variaciones antiguas (Rojo-S, etc.) siguen existiendo con valores actualizados
  - [ ] Azul-XL ahora tiene stock=5 (antes era 0)
  - [ ] Negro-XL ahora tiene price=32.00 (antes era 33.00)
  - [ ] Nuevas variaciones Blanco-S, Blanco-M, Blanco-L, Blanco-XL aparecen (probablemente con stock=0, price=0)

---

## FASE 10: Pruebas de Casos Borde

### 10.1 Producto con 1 Color, 1 Talla
- [ ] Crea nuevo producto
- [ ] Agrega solo **1 color:** "Verde"
- [ ] Agrega solo **1 talla:** "Única"
- [ ] Matriz debe tener **1 celda** (1×1)
- [ ] Llena: stock=100, precio=50
- [ ] Guarda
- [ ] Verifica: producto tiene stock=100, price=50.00

### 10.2 Producto con Muchos Colores/Tallas
- [ ] Crea nuevo producto
- [ ] Agrega **5 colores:** Rojo, Azul, Verde, Negro, Blanco
- [ ] Agrega **5 tallas:** XS, S, M, L, XL
- [ ] Matriz: 25 celdas (5×5)
- [ ] Llena solo algunos valores (ej: dejar algunos en 0)
- [ ] Guarda
- [ ] Verifica en BD: solo 25 variaciones creadas (no más, no menos)

### 10.3 Producto sin Variaciones
- [ ] Crea nuevo producto
- [ ] **NO agregas colores ni tallas**
- [ ] Completa otros campos (nombre, descripción)
- [ ] Haz click guardar
- [ ] **Comportamiento esperado:**
  - [ ] Producto se crea con price=0, stock=0
  - [ ] NO hay registros en product_variations
  - [ ] En tienda, producto no muestra selectores (o muestra "Sin variaciones")

### 10.4 Remover Todos los Colores
- [ ] Abre producto existente para editar
- [ ] Haz click en "×" de cada color (removerlos todos)
- [ ] La matriz desaparece
- [ ] Guarda
- [ ] **Esperado:** Las variaciones antiguas se eliminan de BD

### 10.5 Números Negativos o Inválidos
- [ ] Intenta ingresar **-5** en stock
  - [ ] **Esperado:** No debería permitir valor negativo (validación HTML)
  - [ ] O debe convertir a 0

- [ ] Intenta ingresar texto en precio
  - [ ] **Esperado:** input type=number debe rechazar texto
  - [ ] O debe mostrar error al guardar

---

## FASE 11: Pruebas de Rendimiento/UX

### 11.1 Matriz Grande (10+ combinaciones)
- [ ] Crea producto con 3 colores y 5 tallas (15 celdas)
- [ ] Matriz se debe renderizar correctamente
- [ ] Verifica que el scroll de la matriz funciona (si hay max-height)
- [ ] Prueba llenar valores rápidamente
- [ ] No debe haber lag o congelación

### 11.2 Entrada y Salida Rápida
- [ ] Abre modal Nuevo Producto
- [ ] Agrega colores rápidamente
- [ ] Agrega tallas rápidamente
- [ ] La matriz aparece y se actualiza sin delays

### 11.3 Responsividad Mobile
- [ ] Abre admin.html en un dispositivo mobile o simula con DevTools
- [ ] Abre formulario de producto
- [ ] Verifica que matriz es legible (no se corta)
- [ ] Inputs son seleccionables y clickeables
- [ ] Scroll horizontal si es necesario (muy ancha)

---

## FASE 12: Debugging (Si algo falla)

### 12.1 Verificar Consola de JavaScript
- [ ] Abre navegador → F12 → Pestaña "Console"
- [ ] Recarga admin.html
- [ ] Busca **errores en rojo** (no debería haber)
- [ ] Busca **logs de ejecución** (ej: "ProductVariationsBuilder initialized")
- [ ] Si hay errores:
  - Copia el texto del error
  - Verifica en archivos js/product-variations-builder.js y js/admin.js

### 12.2 Verificar Elementos del DOM
- [ ] F12 → Pestaña "Elements" o "Inspector"
- [ ] Busca el elemento: `<div class="product-variations-section">`
- [ ] Verifica que existe en HTML
- [ ] Verifica que tiene clases CSS correctas
- [ ] Expande y mira sub-elementos (colors-input, tallas-input, matrix)

### 12.3 Verificar CSS Cargado
- [ ] F12 → Pestaña "Elements"
- [ ] Click derecho en elemento → "Inspect"
- [ ] Mira "Computed Styles" (panel derecha)
- [ ] Verifica que tiene estilos aplicados (color, padding, border, etc.)
- [ ] Si no hay estilos:
  - Verifica que css/admin-orders.css está siendo cargado en admin.html
  - Revisa que las clases CSS están escritas correctamente en HTML

### 12.4 Verificar JavaScript Cargado
- [ ] F12 → Pestaña "Console"
- [ ] Escribe: `window.ProductVariationsBuilder`
- [ ] **Esperado:** Muestra la clase (algo como `ƒ ProductVariationsBuilder()`)
- [ ] Si muestra `undefined`:
  - Verifica que `<script src="js/product-variations-builder.js"></script>` está en admin.html
  - Verifica que el archivo existe: e:\Code\Empacas\js\product-variations-builder.js
  - Verifica que no hay errores de sintaxis con F12

### 12.5 Verificar Supabase Connection
- [ ] F12 → Console
- [ ] Escribe: `supabase`
- [ ] Muestra el cliente Supabase
- [ ] Intenta insertar una variación manualmente:
```javascript
await supabase.from('product_variations').insert([
  {
    parent_product_id: 'test-uuid',
    sku: 'TEST-SKU',
    color: 'Rojo',
    talla: 'S',
    price: 25,
    stock: 10
  }
]).then(r => console.log(r))
```
- [ ] Verifica respuesta (error o éxito)

### 12.6 Verificar Permisos RLS
- [ ] Si guardar falla pero datos parecen correctos, problema podría ser RLS
- [ ] En Supabase → SQL Editor:
```sql
-- Verificar que usuario admin puede insertar
SELECT * FROM product_variations LIMIT 1;

-- Ver políticas RLS
SELECT * FROM pg_policies 
WHERE tablename = 'product_variations';
```

---

## Resumen de Validación Final

- [ ] Fase 1-5: Interfaz carga correctamente, colores/tallas agregables
- [ ] Fase 6: Matriz visible, llena correctamente, guarda sin errores
- [ ] Fase 7: BD refleja cambios (tabla products + product_variations)
- [ ] Fase 8: Tienda.html muestra selectores, precios/stock se actualizan
- [ ] Fase 9: Edición carga datos, permite modificar, guarda cambios
- [ ] Fase 10: Casos borde funcionan sin problemas
- [ ] Fase 11: UX fluida, sin lag, responsive
- [ ] Fase 12 (N/A): No hay errores que debuguear

**✅ Si pasas todas estas pruebas, la implementación está COMPLETA y FUNCIONAL.**

---

## Próximos Pasos Después de Validación

### Si TODO funciona:
1. Prueba flujo completo de compra en tienda.html
2. Verifica carrito personalizado por variación
3. Prueba confirmación y procesamiento de pedidos
4. Documenta las nuevas SKU en guía de productos
5. Capacita a equipo de admin sobre el nuevo formulario

### Si hay problemas:
1. Documenta qué falla exactamente (pantalla/BD/console)
2. Compila mensajes de error
3. Verifica archivos modificados (admin.html, admin.js, product-variations-builder.js)
4. Posibles soluciones en GUIA_FORMULARIO_PRODUCTOS_INTEGRADO.md
5. Contacta si requiere debugging adicional

---

**Última actualización:** Después de implementación completa
**Archivos probados:** admin.html, admin.js, css/admin-orders.css, js/product-variations-builder.js
