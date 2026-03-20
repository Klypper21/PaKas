# Guía: Nuevo Formulario Integrado de Productos con Variaciones

## Resumen de Cambios

El formulario de "Nuevo Producto" / "Editar Producto" en el panel admin ha sido **completamente rediseñado** para permitir especificar colores, tallas, y para cada combinación: **stock y precio independientes**.

### Antes vs Después

**ANTES:**
- Campo SKU: No existía
- Campo Talla: Un solo valor de texto
- Campo Colores: Selector visual
- Campo Precio: Un solo valor
- Campo Stock: Un solo valor
- ❌ No se podía especificar variaciones dentro del formulario

**AHORA:**
- Sección "Colores y Tallas": Interfaz dinámica
- Lista de colores: Agregar/quitar colores individuales
- Lista de tallas: Agregar/quitar tallas individuales  
- Matriz interactiva: Color × Talla con stock y precio para cada combinación
- ✅ Todo integrado: Al guardar, se crean colores, tallas y variaciones automáticamente

## Flujo de Uso

### Paso 1: Abre el Modal de Producto

En el panel Admin → Pestaña "Productos" → Click **"Nuevo producto"**

### Paso 2: Completa los Datos Básicos

```
Nombre:          Camiseta Premium         (REQUERIDO)
Material:        100% Algodón             (Opcional)
Recomendaciones: Lavar a 30°C             (Opcional)
Descripción:     Camiseta de algodón...   (Opcional)
Categoría:       Camisetas               (Opcional)
```

_Los campos Precio y Stock ya NO existen. Se calculan automáticamente de las variaciones._

### Paso 3: Agregar Colores Disponibles

En la sección "Colores y Tallas":

**Entrada de Colores:**
```
└─ Colores disponibles
   ├─ [Ingresa: Rojo]                  [Agregar color]
   ├─ Colores agregados:
   │  ├─ [Rojo] ×
   │  ├─ [Azul] ×
   │  └─ [Negro] ×
```

**Instrucciones:**
1. Escribe un color en la caja de entrada (ej: "Rojo")
2. Click en **"Agregar color"** O presiona **Enter**
3. El color aparece como etiqueta azul
4. Repite para cada color disponible
5. Para remover, click en la **×** de la etiqueta

### Paso 4: Agregar Tallas Disponibles

**Entrada de Tallas:**
```
└─ Tallas disponibles
   ├─ [Ingresa: M]                      [Agregar talla]
   ├─ Tallas agregadas:
   │  ├─ [XS] ×
   │  ├─ [S] ×
   │  ├─ [M] ×
   │  ├─ [L] ×
   │  └─ [XL] ×
```

**Instrucciones:**
1. Escribe una talla (ej: "M", "W32", "US 8")
2. Click **"Agregar talla"** O presiona **Enter**
3. La talla aparece como etiqueta azul
4. Repite para todas las tallas

### Paso 5: Especificar Stock y Precio por Variación

**Una vez que agregues colores Y tallas, aparece una MATRIZ:**

```
┌─────────────────────────────────────────────────────┐
│ Stock y Precio por Variación                        │
│                                                     │
│           XS        S         M         L         XL│
│ ┌─────────────────────────────────────────────────┤
│ │ Rojo  [5]      [15]       [20]       [10]      [3] │
│ │       [25.00] [25.00]     [25.00]    [25.00]   [25]│
│ ├─────────────────────────────────────────────────┤
│ │ Azul  [8]      [8]        [12]       [6]       [0] │
│ │       [25.00] [25.00]     [25.00]    [25.00]   [25]│
│ ├─────────────────────────────────────────────────┤
│ │ Negro [18]     [25]       [18]       [12]      [8] │
│ │       [28.00] [28.00]     [28.00]    [28.00]   [28]│
│ └─────────────────────────────────────────────────┘
```

**Cómo llenar la matriz:**

1. **Fila = Color** (ejemplo: "Rojo")
2. **Columna = Talla** (ejemplo: "M")
3. **Celda = Stock + Precio**
   - Casilla superior: Ingresa la cantidad en stock
   - Casilla inferior: Ingresa el precio en CUP

**Ejemplo:**
- Rojo M: Stock 20, Precio 25.00
- Azul L: Stock 6, Precio 25.00
- Negro XL: Stock 8, Precio 28.00 (precio diferente!)

### Paso 6: Agregar Imágenes (Opcional)

```
URL imagen (opcional):        https://...
Imagen principal (subir):     [Seleccionar archivo]
Imágenes extra (galería):     [Seleccionar múltiples]
```

### Paso 7: Guardar

Click en el botón **[Guardar]**

**Qué sucede:**
1. Se crea el producto con nombre, descripción, etc.
2. Se calcula automáticamente:
   - **Precio**: Promedio de todos los precios de variaciones
   - **Stock**: Total de stock de todas las variaciones
3. Se crean TODAS las variaciones en tabla `product_variations`
4. Cada variación incluye: SKU, Color, Talla, Stock, Precio

## Ejemplos Prácticos

### Ejemplo 1: Camiseta Simple

**Producto:** "Camiseta Básica"

**Colores:**
- Rojo
- Azul
- Negro

**Tallas:**
- S
- M
- L

**Matriz:**
```
         S      M      L
Rojo   [10]   [15]   [8]
       [20]   [20]   [20]

Azul   [0]    [12]   [5]
       [20]   [20]   [20]

Negro  [20]   [18]   [12]
       [20]   [20]   [20]
```

**Resultado:**
- 9 variaciones creadas
- Stock total: 100 unidades
- Precio promedio: 20 CUP
- SKU auto-generados: CAMI-RED-S, CAMI-RED-M, etc.

### Ejemplo 2: Jeans con Precios Diferentes

**Producto:** "Jeans Premium"

**Colores:**
- Azul Oscuro (precio normal)
- Azul Claro (precio premium)
- Negro

**Tallas:**
- W32
- W34
- W36

**Matriz:**
```
           W32    W34    W36
Azul Osc  [5]    [8]    [10]
          [45]   [45]   [45]

Azul Cla  [3]    [5]    [7]
          [55]   [55]   [55]  ← PRECIO DIFERENTE

Negro     [12]   [15]   [18]
          [45]   [45]   [45]
```

**Resultado:**
- 9 variaciones
- Stock total: 83
- Precio promedio: 48.89 CUP
- Algunos colores tienen stock 0 (agotados) o precios diferentes

## Comportamiento Automático Al Guardar

### Generación de SKU
Si no especificas un SKU manualmente, se genera automáticamente usando:
```
PREFIX-COLOR-TALLA
Ejemplo: CAMI-RED-M, JEANSPR-BLUECL-W32
```

El PREFIX es los primeros 3 caracteres del nombre del producto.

### Cálculo de Precio y Stock del Producto

Después de guardar las variaciones:

**Precio del producto:**
```
= Promedio de todos los precios de variaciones
Ejemplo: (25+25+28+25+25+28) / 6 = 25.67 CUP
```

**Stock del producto:**
```
= Suma de todos los stocks de variaciones
Ejemplo: 5+15+20+8+8+12 = 68 unidades
```

Estos valores se usan para referencia rápida en listados y búsquedas.

## Edición de Productos Existentes

### Abre un Producto para Editar

1. Panel Admin → "Productos"
2. Click en **"Editar"** en la tarjeta del producto

### ¿Qué ocurre?

- Se carga el nombre, descripción, imágenes, etc.
- Se cargan los colores y tallas del producto anterior
- Se muestra la matriz con stock/precio anterior

### Cambios Que Puedes Hacer

✅ **Permitido:**
- Agregar nuevos colores
- Agregar nuevas tallas
- Cambiar stock de cualquier variación
- Cambiar precio de cualquier variación
- Remover colores/tallas (se eliminarán sus variaciones)

❌ **Importante:**
- Si eliminas una talla, se BORRAN todas sus variaciones
- Si editas, se reemplazan TODAS las variaciones anteriores
- Los datos antiguos de variaciones se pierden

### Ejemplo de Edición

**Producto anterior:**
- Colores: Rojo, Azul, Negro
- Tallas: S, M, L
- Total: 9 variaciones

**Edito y cambio a:**
- Colores: Rojo, Azul, Negro, Verde
- Tallas: S, M, L, XL
- Total: 16 variaciones

**Resultado:**
- Las 9 variaciones antiguas se ELIMINAN
- Se crean 16 variaciones nuevas

## Integración con la Tienda

Cuando un cliente visita la tienda (`tienda.html`):

1. Abre un producto con variaciones
2. Ve selectores de Color y Talla
3. Selecciona color → se filtran las tallas disponibles
4. Selecciona talla → se muestra stock y precio de esa variación
5. Si stock es 0, la opción aparece deshabilitada
6. Al agregar al carrito, se guarda el SKU de la variación específica

## Validación

**Campos Requeridos:**
- Nombre del producto: SÍ REQUERIDO
- Al menos 1 color: NO (opcional)
- Al menos 1 talla: NO (opcional)
- Stock/Precio en matriz: 0 es válido (agotado)

**Si no specificas variaciones:**
- El producto se crea sin variaciones
- Usa la interfaz antigua (panel "Variaciones" aparte)

## Envío de Datos a Supabase

```
Tabla: products
├─ name: "Camiseta Premium"
├─ description: "..."
├─ colores: '["Rojo", "Azul", "Negro"]'  ← JSON
├─ talla: "S, M, L"
├─ price: 25.67  ← Promedio
├─ stock: 100    ← Total
└─ ...

Tabla: product_variations (9 registros creados)
├─ {parent_product_id: UUID, sku: "CAMI-RED-S", color: "Rojo", talla: "S", price: 25.00, stock: 10}
├─ {parent_product_id: UUID, sku: "CAMI-RED-M", color: "Rojo", talla: "M", price: 25.00, stock: 15}
├─ {parent_product_id: UUID, sku: "CAMI-RED-L", color: "Rojo", talla: "L", price: 25.00, stock: 8}
├─ ...
```

## Troubleshooting

### "No veo la matriz de variaciones"
- ¿Agregaste al menos 1 color? ✓
- ¿Agregaste al menos 1 talla? ✓
- Si ambos existen, la matriz debería aparecer automáticamente

### "Cambié los colores pero las variaciones no se actualizaron"
- Al editar, las variaciones ANTIGUAS se eliminan
- Se crean NUEVAS variaciones con los nuevos colores/tallas
- Ten cuidado de no perder datos

### "¿Cómo agrego solo stock a una variación sin crear producto nuevo?"
- Usa el panel "Variaciones" (pestaña separada)
- Ahí puedes editar variaciones individualmente sin tocar el producto

### "Aparece error al guardar"
- Verifica que el nombre del producto NO esté vacío
- Revisa permisos en Supabase (tabla `product_variations` accesible)
- Abre consola (F12) para ver el error específico

---

**Versión:** 1.0 | Formulario Integrado de Productos con Variaciones  
**Última actualización:** Marzo 2026

