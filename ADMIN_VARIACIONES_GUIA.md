# Guía: Panel Admin de Variaciones

## Descripción General

El panel admin de variaciones permite gestionar de forma centralizada todas las variaciones de productos (colores, tallas, precios y stock independientes). Es la interfaz que complementa la integración del sistema de variaciones en tu tienda.

## Ubicación

**URL:** `admin.html` → Pestaña **"Variaciones"**

## Funcionalidades Principales

### 1. Seleccionar Producto
- Abre la pestaña "Variaciones"
- Usa el dropdown **"Selecciona un producto..."** para elegir el producto base
- Se cargarán automáticamente todas sus variaciones

### 2. Listar Variaciones
Una vez seleccionado el producto, verás una lista de tarjetas que muestran:
- **SKU**: Código único de la variación (ej: TSHIRT-RED-M)
- **Color y Talla**: Atributos de la variación
- **Stock**: Cantidad disponible (verde si hay stock, rojo si está agotado)
- **Precio**: Precio en CUP
- **Fecha de creación**: Cuándo se agregó la variación

### 3. Crear Nueva Variación
**Proceso:**
1. Selecciona un producto del dropdown
2. Haz clic en **"Nueva variación"**
3. Se abrirá un modal con este formulario:
   - **SKU** (requerido): Código único, ej: `JEANS-DARK-W32`
   - **Color** (requerido): Nombre del color, ej: `Azul Oscuro`
   - **Talla** (requerido): Talla/tamaño, ej: `M`, `L`, `W32`, `US 8`
   - **Precio** (requerido): Precio en CUP, ej: `45.00`
   - **Stock** (requerido): Cantidad disponible, ej: `15`
   - **URL imagen** (opcional): Link a imagen específica de esta variación

4. Haz clic en **"Guardar variación"**

### 4. Editar Variación
**Proceso:**
1. En la tarjeta de la variación que quieres editar, haz clic en **"Editar"**
2. Se abrirá el modal con los datos actuales
3. Modifica los campos necesarios
4. Haz clic en **"Guardar variación"**

**Casos comunes de edición:**
- **Actualizar stock**: Después de una venta o reposición
- **Cambiar precio**: Por promociones o cambios de costo
- **Corregir datos**: Si hay errores en SKU, color o talla

### 5. Eliminar Variación
**Proceso:**
1. En la tarjeta de la variación, haz clic en **"Eliminar"**
2. Se pedirá confirmación
3. La variación se eliminará permanentemente

⚠️ **Advertencia**: Esta acción no se puede deshacer. Asegúrate de que realmente quieres eliminar la variación.

## Casos de Uso Comunes

### Caso 1: Agregar Stock a una Variación Existente
1. Abre Admin → Variaciones
2. Selecciona el producto
3. Busca la variación en la lista
4. Haz clic en "Editar"
5. Cambia el valor de **Stock** (ej: de 10 a 25)
6. Guarda

### Caso 2: Crear Variaciones para un Producto Nuevo
1. Primero **crea el producto** en la pestaña "Productos" (nombre, descripción, imagen principal)
2. Luego ve a **Admin → Variaciones**
3. Selecciona el producto que acabas de crear
4. Agrega todas las variaciones necesarias (color+talla+precio+stock)

**Ejemplo para una camiseta:**
- TSHIRT-RED-XS | Rojo | XS | 25.00 | 5
- TSHIRT-RED-S  | Rojo | S  | 25.00 | 15
- TSHIRT-RED-M  | Rojo | M  | 25.00 | 20
- TSHIRT-BLUE-XS | Azul | XS | 25.00 | 8
- ... y así sucesivamente

### Caso 3: Manejar Productos con Precios Diferentes
Algunos colores pueden tener precios distintos (ediciones limitadas, materiales premium, etc.):

1. Crear variaciones: SHOES-BLACK-8 | Negro | US 8 | **65.00**
2. Crear variación premium: SHOES-RED-8 | Rojo | US 8 | **75.00**

En la tienda, el precio se actualizará dinámicamente según la variación seleccionada.

### Caso 4: Marcar Variación como Agotada
1. Edita la variación
2. Cambia **Stock** a `0`
3. Guarda

En la tienda, esa combinación color+talla aparecerá deshabilitada visualmente con opacidad reducida.

## Datos Que Se Guardan

Cada variación almacena:

| Campo | Descripción |
|-------|-------------|
| `parent_product_id` | ID del producto base (auto-rellenado) |
| `sku` | Código único identificador |
| `color` | Nombre del color |
| `talla` | Tamaño (S/M/L, W28-W36, US 6-12, etc.) |
| `price` | Precio en CUP (puede diferir del producto) |
| `stock` | Cantidad disponible |
| `image_url` | URL de imagen específica (opcional) |
| `created_at` | Fecha de creación (automática) |
| `updated_at` | Fecha de última actualización (automática) |

## Integración con la Tienda

**En la tienda (tienda.html):**
- Cuando un cliente abre el modal de un producto con variaciones
- Ve selectores de Color y Talla
- Los selectores se **filtran dinámicamente** según disponibilidad
- El **stock y precio se actualizan** según la combinación seleccionada
- Si stock es 0, esa opción aparece **visualmente deshabilitada**

**En el carrito:**
- Se guarda tanto el producto como el SKU de la variación
- Permite saber exactamente qué variación compró cada cliente

## Consejos y Mejores Prácticas

### 1. Nomenclatura de SKU
Usa un patrón consistente para fácil identificación:
```
[PRODUCTO]-[COLOR]-[TALLA]
TSHIRT-RED-M
JEANS-DARK-W32
SHOES-BLACK-US10
```

### 2. Nombres de Color Estandarizados
Mantén consistencia en cómo nombras colores:
- ✅ "Rojo", "Rojo Oscuro", "Rojo Claro"
- ❌ "rojo", "ROJO", "red", "RED", "R"

### 3. Tallas Estandarizadas
Usa formatos reconocibles:
- Ropa: XS, S, M, L, XL, XXL
- Jeans: W28, W30, W32, W34, W36
- Zapatillas: US 6, US 7, US 8, US 9, US 10
- Uno: One Size

### 4. Actualización de Stock
- **Después de una venta**: Edita la variación y reduce el stock
- **Durante reposición**: Aumenta el stock según lo recibido
- **Para agotados**: Establece stock en `0` (no elimines la variación)

### 5. Precios Dinámicos
Si un color tiene un precio diferente (edición limitada, premium):
- Crea la variación con el precio específico
- En la tienda, el precio se mostrará automáticamente

## Solución de Problemas

### "No aparece el dropdown de productos"
- Verifica que exista al menos un producto en la tienda
- Recarga la página (F5)
- Comprueba la consola (F12) por errores

### "No puedo agregar una variación"
- ¿Has seleccionado un producto? (debe mostrar contenido)
- ¿Los campos están completos? (SKU, Color, Talla, Precio, Stock)
- ¿El precio y stock son números válidos?

### "La variación no aparece en la tienda"
- La tienda usará JSON de atributos en el producto si no hay variaciones en BD
- Si creaste variaciones en BD, asegúrate de que:
  - El `parent_product_id` coincida con el ID del producto
  - La variación se haya guardado (recarga el admin para confirmar)

### "Puedo editar pero no guarda"
- Revisa permisos en Supabase (RLS policies)
- Verifica que tu usuario esté en tabla `admin_users`
- Comprueba consola (F12) por mensajes de error

## Formato de Importación (Para Datos Masivos)

Si quieres agregar muchas variaciones a la vez, puedes usar la SQL que está en:
**`sql/DATOS_EJEMPLO_VARIACIONES.sql`**

1. Abre Supabase → SQL Editor
2. Copia la sentencia INSERT con tus variaciones
3. Ejecuta
4. Recarga el admin

Ejemplo:
```sql
INSERT INTO product_variations (parent_product_id, sku, color, talla, stock, price)
VALUES 
  ('UUID-DE-PRODUCTO', 'TSHIRT-RED-S', 'Rojo', 'S', 15, 25.00),
  ('UUID-DE-PRODUCTO', 'TSHIRT-RED-M', 'Rojo', 'M', 20, 25.00),
  ('UUID-DE-PRODUCTO', 'TSHIRT-BLUE-S', 'Azul', 'S', 8, 25.00);
```

## Contacto y Soporte

Si encuentras un problema:
1. Revisa la consola del navegador (F12 → Console)
2. Copia el mensaje de error
3. Verifica los datos en Supabase directamente
4. Consulta la sección "Solución de Problemas" arriba

---

**Versión:** 1.0 | Panel Admin de Variaciones  
**Última actualización:** Marzo 2026
