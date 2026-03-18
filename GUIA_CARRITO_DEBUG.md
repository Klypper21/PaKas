# 🔧 Guía de Diagnóstico: Carrito No Se Guarda

## Paso 1: Verifica la Tabla en Supabase

**Opción A: Verificar Manualmente**
1. Ve a tu proyecto Supabase
2. Ve a **Database** → **Tables**
3. ¿Ves una tabla llamada `user_carts`?
   - ❌ **NO existe**: Salta al Paso 2 (Crear tabla)
   - ✅ **Sí existe**: Salta al Paso 3 (Test de debug)

**Opción B: Verificar con Query**
1. Ve a **SQL Editor** en Supabase
2. Copia y ejecuta:
```sql
SELECT * FROM user_carts LIMIT 10;
```
- Si dice "relation does not exist" → **no existe la tabla**
- Si muestra un error de permisos → **problema de RLS**
- Si muestra registros o está vacía → **la tabla existe**

---

## Paso 2: Crear la Tabla (Si No Existe)

1. Abre el archivo `sql/setup_user_carts.sql` en tu editor
2. **Copia TODO el contenido**
3. Ve a tu proyecto Supabase
4. **SQL Editor** → **New Query**
5. **Pega** todo el SQL
6. **Ejecuta**

**Resultado esperado:**
- Se ejecuta sin errores
- La tabla `user_carts` aparece en **Database** → **Tables**

---

## Paso 3: Test de Debug (Crítico)

1. Abre `debug-cart.html` en tu navegador
   - Si trabajas localmente: `http://localhost:3000/debug-cart.html`
   - Si está en servidor: `https://tudominio.com/debug-cart.html`

2. **Inicia sesión** con tu usuario de prueba

3. Haz clic en el botón rojo: **"🔴 TEST CRÍTICO: Insertar Directo"**

4. Lee el resultado:
   - ✅ **Inserción exitosa**: Todo está bien, ve al Paso 4
   - ❌ **Error de RLS**: Necesitas ejecutar el SQL nuevamente
   - ❌ **Tabla no existe**: Ejecuta el SQL

---

## Paso 4: Test de Sincronización Automática

Si el test del Paso 3 pasó:

1. En la misma página `debug-cart.html`:
2. Haz clic en **"Verificar que funciones existen"**
   - Todas deben estar ✅
   - Si alguna es ❌, recarga la página

3. Haz clic en **"Test: Agregar Producto"**
   - Verás un producto "Producto Test" agregado

4. Haz clic en **"Verificar Tabla user_carts"**
   - Debe mostrar el producto que acabas de agregar

5. **Si todo funciona**: ¡Listo! Ya puedes ir a la tienda y agregar productos

---

## Paso 5: Prueba en la Tienda Real

1. Abre `index.html` (la tienda)
2. Inicia sesión
3. Agrega un producto
4. Abre `debug-cart.html` nuevamente
5. Haz clic en **"Verificar Tabla user_carts"**
   - Debe mostrar el producto que agregaste

6. **Recarga la tienda** `index.html`
   - El carrito debe persistir

---

## 🚑 Solución de Problemas

### Problema: "relation user_carts does not exist"
**Solución**: Ejecuta el SQL en `sql/setup_user_carts.sql`

### Problema: "permission denied for schema public"
**Solución**: Hay un problema de RLS. Ejecuta el SQL nuevamente, pero primero vuelve a ejecutar:
```sql
DROP TABLE IF EXISTS user_carts CASCADE;
```

### Problema: El test funciona pero la tienda sigue sin guardar
1. Abre la consola del navegador (F12)
2. Ve a la pestaña **Console**
3. Agrega un producto en la tienda
4. **¿Ves algún error rojo?** Copiar y mostrarme

### Problema: El carrito se guarda pero se pierde al recargar
**Probablemente funciona pero necesitas verificar que `initCartSync()` se ejecuta** 

---

## 📝 Checklist Final

- [ ] Tabla `user_carts` existe en Supabase
- [ ] Ejecuté todo el SQL en `setup_user_carts.sql`
- [ ] Test "🔴 TEST CRÍTICO: Insertar Directo" funciona
- [ ] "Verificar que funciones existen" muestra todos ✅
- [ ] "Test: Agregar Producto" muestra datos en BD
- [ ] Agregué productos en tienda y se guardan
- [ ] Recargué tienda y el carrito persiste

---

## ¿Aún no funciona?

1. Comparte la captura del error en el test crítico
2. Abre la consola (F12) y agrega un producto
3. Copia el error que ves en rojo
4. Pégalo en chat

✅ Con eso puedo ayudarte mejor.
