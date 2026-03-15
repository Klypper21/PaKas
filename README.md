# PaKas - Tienda de Ropa

Tienda de ropa con login, carrito y sistema de pedidos por transferencia bancaria (validación manual).

## Características

- **Login/Registro** con Supabase Auth
- **Catálogo de productos** desde Supabase
- **Carrito** en localStorage
- **Pedidos semiautomáticos**: el cliente crea el pedido con estado "Pago pendiente", realiza la transferencia y tú validas desde el panel admin marcando como "Completado"
- **Panel admin** para ver pedidos pendientes y marcarlos como pagados
- **Redirección automática**: si inicias sesión con un email de admin, vas al panel admin; si no, a la tienda

## Configuración

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto
2. En **Project Settings > API** copia:
   - **Project URL**
   - **anon public** key

### 2. Configurar credenciales

Edita `js/config.js`:

```js
const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = 'tu_anon_key';
```

### 3. Ejecutar el schema SQL

1. En el dashboard de Supabase, abre **SQL Editor**
2. Copia y ejecuta todo el contenido de `sql/schema.sql`
3. Ejecuta también los scripts en `sql/migrations/` (en orden) si existen
4. En el schema, cambia el email en `INSERT INTO admin_users` por tu email real para acceder al panel admin

### 4. Configurar Auth en Supabase

- En **Authentication > Providers**: asegúrate de que Email está habilitado
- En **Authentication > URL Configuration**: añade tu URL local (ej. `http://localhost:5500`) a Site URL si usas un servidor local

### 5. Datos de transferencia

En `carrito.html` y en `js/carrito.js` actualiza los datos bancarios que verá el cliente:

- IBAN
- Concepto/referencia

## Estructura del proyecto

```
PaKas/
├── index.html      # Página principal
├── login.html      # Login y registro
├── tienda.html     # Catálogo de productos
├── carrito.html    # Carrito y checkout
├── pedidos.html    # Mis pedidos
├── admin.html      # Panel admin (validar pagos)
├── css/
│   └── style.css
├── js/
│   ├── config.js   # Credenciales Supabase
│   ├── auth.js     # Autenticación
│   ├── app.js      # Navegación y carrito
│   ├── tienda.js   # Productos
│   ├── carrito.js  # Checkout
│   ├── pedidos.js  # Lista de pedidos
│   └── admin.js    # Validación de pagos
├── sql/
│   └── schema.sql  # Tablas y datos iniciales
└── README.md
```

## Cómo funciona el flujo de pago

1. El usuario añade productos al carrito y hace clic en "Realizar pedido"
2. Confirma el pedido (estado: **Pendiente**)
3. Se muestran los datos bancarios para transferencia
4. El usuario hace la transferencia
5. Tú entras en **Admin**, ves el pedido pendiente y haces clic en "Marcar como pagado"
6. El pedido pasa a estado **Completado**

## Ejecutar localmente

Puedes usar cualquier servidor estático, por ejemplo:

- **Live Server** (extensión de VS Code)
- `npx serve .`
- `python -m http.server 8000`
