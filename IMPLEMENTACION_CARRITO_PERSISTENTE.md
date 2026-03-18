# Implementación: Carrito Persistente y Modal de Carga

## Cambios Realizados

### 1. **Base de Datos (Supabase)**
Se ha creado un script SQL para agregar la tabla de carritos persistentes:

**Archivo:** `sql/cart_schema.sql`

Ejecuta este script en Supabase:
1. Ve a tu proyecto de Supabase
2. Abre **SQL Editor**
3. Copia y pega el contenido de `sql/cart_schema.sql`
4. Ejecuta el script

Esto crea:
- Tabla `user_carts` para guardar el carrito de cada usuario
- Funciones RPC para verificar emails y teléfonos
- Trigger automático para actualizar `updated_at`

### 2. **JavaScript - Sincronización del Carrito**
Se ha modificado `js/app.js` agregando:

#### Funciones principales:
- `showLoadingModal(message)` - Muestra el modal de carga
- `hideLoadingModal()` - Oculta el modal de carga
- `loadUserCartFromDB(userId)` - Carga el carrito desde Supabase
- `saveUserCartToDB(userId, items)` - Guarda el carrito en Supabase
- `syncUserCart(userId)` - Sincroniza automáticamente
- `initCartSync()` - Inicializa la sincronización al cargar la página

#### Comportamiento:
- Cuando un usuario **inicia sesión**: se carga su carrito guardado
- Cuando el usuario **añade/quita productos**: se guardan automáticamente en Supabase
- El modal de carga aparece durante las operaciones de sincronización
- Si el usuario cierra sesión: el carrito local se mantiene (opcional, modifica `initCartSync()` si quieres borrarlo)

### 3. **CSS - Modal de Carga**
Se ha agregado estilos en `css/style.css`:

```css
.loading-modal { /* Fondo semi-transparente */}
.loading-modal-content { /* Contenedor del modal */}
.loading-spinner { /* Animación de carga */}
.loading-modal-text { /* Texto informativo */}
```

El modal tiene:
- Spinner animado en rotación continua
- Mensaje "Cargando..." personalizable
- Animaciones suave (fade in/up)
- Z-index alto para aparecer sobre todo

## Cómo Usar

### Para los usuarios:
1. **Iniciar sesión**: El carrito se carga automáticamente
2. **Agregar productos**: Se guardan automáticamente en la BD
3. **Navegar a otra página**: El carrito persiste
4. **Cerrar la pestaña y volver**: El carrito estará igual

### Para el desarrollador:
Si necesitas mostrar el modal manualmente:
```javascript
showLoadingModal('Procesando pedido...');
// Hacer algo...
hideLoadingModal();
```

## Verificar que funciona

1. **Abre DevTools** (F12)
2. **Inicia sesión** con un usuario
3. **Agrega productos al carrito** - verás el modal de carga
4. **Abre la BD de Supabase** y verifica que `user_carts` se está actualizando
5. **Cierra la pestaña y recarga** - el carrito debe estar igual

## Requisitos

✅ Supabase configurado en `js/config.js`
✅ Auth funcionando (`js/auth.js` actualizado)
✅ Script SQL ejecutado en Supabase
✅ Tabla `user_carts` creada

## Archivos Modificados

- ✏️ `js/app.js` - Agregadas funciones de sincronización
- ✏️ `css/style.css` - Agregados estilos del modal de carga
- ✨ `sql/cart_schema.sql` - **NUEVO** - Script de DB

## Archivo de Configuración

Nada nuevo que configurar, todo es automático. Solo ejecuta el SQL y listo!

## Notas importantes

⚠️ **Antes de ejecutar el SQL**, asegúrate de:
- Estar conectado a tu proyecto Supabase correcto
- Haber ejecutado el script SQL de usuarios (`profiles` tabla)

💡 **Tips:**
- El carrito se sincroniza cuando el usuario inicia/cierra sesión
- Los productos se guardan cuando se cambia el carrito
- El modal de carga muestra "Sincronizando carrito..." durante la operación
- Si hay error de conexión, el carrito sigue en localStorage (fallback automático)

## Solución de Problemas

### El carrito no se guarda
- ✅ Verifica que el SQL fue ejecutado
- ✅ Comprueba que `SUPABASE_URL` y `SUPABASE_ANON_KEY` son correctas
- ✅ Abre DevTools y mira la consola para errores

### El modal de carga no aparece
- ✅ Verifica que `hideLoadingModal()` se ejecuta correctamente
- ✅ Comprueba que los estilos CSS se cargaron

### El usuario ve su carrito viejo
- ✅ El merge de carritos favorece los datos de BD
- ✅ Si quieres priorizar el carrito local, modifica `syncUserCart()`

