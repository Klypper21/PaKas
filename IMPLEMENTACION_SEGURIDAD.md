# 📋 Pasos para Implementar Seguridad en tu Sitio

## PASO 1: Configurar Variables de Entorno (5 min)

### 1.1 Crear archivo .env

```bash
# Windows - En VS Code Terminal
```

```
VITE_SUPABASE_URL=https://lkzhepmxziliwvlxojqz.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
VITE_SUPABASE_SERVICE_ROLE_KEY=tu_service_key_aqui

VITE_APP_URL=https://empacas.com
VITE_API_URL=https://api.empacas.com

VITE_ENABLE_CSRF_PROTECTION=true
VITE_SESSION_TIMEOUT_MS=1800000
VITE_MAX_LOGIN_ATTEMPTS=5
VITE_LOCKOUT_TIME_MS=1800000

NODE_ENV=production
```

### 1.2 Verificar .gitignore

```bash
# Comprobar que .env está en .gitignore
cat .gitignore | grep ".env"

# Output debe incluir:
# .env
# .env.local
# .env.*.local
# .env.production
```

---

## PASO 2: Reemplazar config.js con config-secure.js (10 min)

### 2.1 En cada archivo HTML que use config.js

**Antes:**
```html
<script src="js/config.js"></script>
<script src="js/auth.js"></script>
```

**Después:**
```html
<!-- Carga segura con variables de entorno -->
<script src="js/config-secure.js"></script>
<script src="js/security.js"></script>
<script src="js/security-validator.js"></script>
<script src="js/auth.js"></script>
```

### 2.2 Verificar que credenciales están en variables

✅ CORRECTO:
```javascript
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
```

❌ INCORRECTO (ELIMINAR):
```javascript
const SUPABASE_URL = 'https://lkzhepmxziliwvlxojqz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

---

## PASO 3: Agregar Módulo de Seguridad (5 min)

### 3.1 Incluir en archivo HTML principal

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  
  <!-- 🔒 HEADERS DE SEGURIDAD -->
  <meta http-equiv="Content-Security-Policy" 
        content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  
  <title>Empacas</title>
</head>
<body>
  <!-- ... contenido ... -->

  <!-- 🔒 SCRIPTS DE SEGURIDAD -->
  <script src="js/config-secure.js"></script>
  <script src="js/security.js"></script>
  <script src="js/security-validator.js"></script>
  <script src="js/auth.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

---

## PASO 4: Proteger Formularios contra CSRF (10 min)

### 4.1 Agregar token CSRF a formularios de login

**Archivo:** login.html

```html
<form id="login-form" method="POST" data-no-cache>
  <div class="form-group">
    <label for="email">Email</label>
    <input 
      type="email" 
      id="email" 
      name="email" 
      required 
      autocomplete="off"
      data-sensitive>
  </div>
  
  <div class="form-group">
    <label for="password">Contraseña</label>
    <input 
      type="password" 
      id="password" 
      name="password" 
      required 
      autocomplete="off">
  </div>

  <!-- Token CSRF -->
  <input type="hidden" name="csrf_token" id="csrf_token" value="">
  
  <button type="submit" class="btn-primary">Ingresar</button>
</form>

<script>
  // Llenar token CSRF
  document.getElementById('csrf_token').value = Security.getCSRFToken();

  // Proteger con rate limiting
  document.getElementById('login-form').addEventListener('submit', (e) => {
    if (!Security.checkRateLimit('login', 5, 60000)) {
      e.preventDefault();
      alert('Demasiados intentos. Intenta en 1 minuto.');
    }
  });
</script>
```

---

## PASO 5: Validar Entradas de Usuario (15 min)

### 5.1 Email

```javascript
const emailInput = document.getElementById('email');

emailInput.addEventListener('blur', function() {
  const result = Security.validateEmail(this.value);
  
  if (!result.isValid) {
    this.classList.add('error');
    showErrorMessage('Email inválido');
  } else {
    this.classList.remove('error');
    this.value = result.value; // Email normalizado
  }
});
```

### 5.2 Contraseña

```javascript
const passwordInput = document.getElementById('password');

passwordInput.addEventListener('input', function() {
  const result = Security.validatePassword(this.value);
  
  const strengthBar = document.getElementById('password-strength');
  strengthBar.className = `strength-${result.strength}`;
  
  if (!result.isValid) {
    showErrorMessage(result.message);
  }
});
```

### 5.3 Teléfono

```javascript
const phoneInput = document.getElementById('phone');

phoneInput.addEventListener('blur', function() {
  const result = Security.validatePhone(this.value);
  
  if (result.isValid) {
    this.value = result.value; // Formato normalizado
  }
});
```

---

## PASO 6: Proteger Datos Sensibles (10 min)

### 6.1 NO guardes en localStorage

❌ NUNCA:
```javascript
localStorage.setItem('api_key', secretKey);
localStorage.setItem('user_password', password);
localStorage.setItem('credit_card', '4532-1234-5678-9010');
```

### 6.2 SÍ usa sessionStorage

✅ CORRECTO:
```javascript
// Token de sesión (expira cuando cierras el navegador)
sessionStorage.setItem('user_token', jwtToken);

// Data sensible encriptada
Security.setSecureStorage('user_data', {
  id: 123,
  email: 'user@example.com'
});

// Limpiar al logout
Security.clearSecureSession();
```

---

## PASO 7: Configurar HTTPS (Según tu hosting)

### 7.1 Si usas Vercel
✅ Automático - Solo pusheate a git

### 7.2 Si usas Netlify
✅ Automático - Solo pusheate a git

### 7.3 Si usas hosting tradicional
1. Obtener certificado SSL (Let's Encrypt gratuito)
2. Crear archivo `.htaccess`
3. Forzar HTTPS con reglas de rewrite

---

## PASO 8: Verificar Seguridad con Validador (5 min)

### 8.1 Abrir consola del navegador

Press: `F12` → Pestaña "Console"

### 8.2 Ejecutar validador

```javascript
await SecurityValidator.runAll()
```

### 8.3 Output esperado

```
🔒 SECURITY AUDIT REPORT
Fecha: 3/18/2026 10:30:45 AM

✅ PASSED CHECKS
  ✅ HTTPS Required: Sitio usando HTTPS
  ✅ HSTS Header: strict-transport-security: max-age=31536000...
  ✅ X-Content-Type-Options: X-Content-Type-Options: nosniff
  ✅ Content Security Policy: configurada
  ✅ Security Module: Módulo de seguridad cargado

---────────────────────────────────
Passed: 8/10
Issues: 2
critical: 0
high: 2
medium: 0
```

---

## PASO 9: Checklist Final (Antes de Producción)

- [ ] `.env` está en `.gitignore`
- [ ] `.env` NO tiene datos hardcodeados
- [ ] `config.js` original fue seguido con `config-secure.js`
- [ ] Módulos de seguridad incluidos en HTML
- [ ] Formularios tienen tokens CSRF
- [ ] Validación de entrada en lugar
- [ ] HTTPS forzado (`.htaccess` o config del hosting)
- [ ] SecurityValidator ejecutado sin errores críticos
- [ ] No hay console.log() con data sensible
- [ ] .gitignore protege archivos sensibles

---

## PASO 10: Deploy Seguro

### 10.1 Antes de pusheate

```bash
# Verificar que .env NO va a git
git status | grep ".env"
# Output debe estar vacío (no debe aparecer .env)

# Verificar credenciales en código
grep -r "eyJhbGci" . --include="*.js" --include="*.html"
# Output debe estar vacío (no debe encontrar keys)

# Auditar dependencias
npm audit
```

### 10.2 Deploy

```bash
# Pusheate a main/master
git push origin main

# Vercel/Netlify automáticamente:
# 1. Construye el proyecto
# 2. Aplica variables de entorno
# 3. Deploy con HTTPS automático
```

---

## 🎯 Resultado Final

Después de completar estos pasos, tu sitio tendrá:

✅ HTTPS obligatorio
✅ Tokens CSRF
✅ Validación de entrada
✅ Protección XSS
✅ Rate limiting
✅ Datos sensibles encriptados
✅ Headers de seguridad
✅ Monitoreo de eventos
✅ Variables de entorno seguras
✅ Auditoría automatizada

---

## 📞 Soporte

Si algo no funciona:
1. Revisar consola del navegador (F12)
2. Ejecutar `SecurityValidator.runAll()`
3. Revisar email en contacto de seguridad

**Última actualización:** 2026-03-18
