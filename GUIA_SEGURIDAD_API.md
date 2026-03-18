# 📚 Guía de Seguridad: Protección de API y Datos

## 1. Validación de Entrada (Input Validation)

### En el Cliente (js/security.js)

```javascript
// Usar funciones de validación
const email = Security.validateEmail(userInput);
if (!email.isValid) {
  showError('Email inválido');
  return;
}

const password = Security.validatePassword(userInput);
if (!password.isValid) {
  showError(password.message);
  return;
}

// Sanitizar HTML
const sanitized = Security.sanitizeHtml(userInput);
element.textContent = sanitized;
```

### En el Servidor (Supabase)

Siempre validar nuevamente en el servidor, NUNCA confiar en validación del cliente:

```sql
-- RLS Policy: Validar email
CREATE POLICY "Validate email format"
ON users
BEFORE INSERT OR UPDATE
FOR EACH ROW
EXECUTE FUNCTION validate_email(NEW.email);

-- Function
CREATE OR REPLACE FUNCTION validate_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN
    RAISE EXCEPTION 'Email inválido';
  END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

---

## 2. Protección contra XSS (Cross-Site Scripting)

### ✅ SEGURO: Usar textContent

```javascript
// ✅ Seguro: usa textContent
document.getElementById('user-name').textContent = userData.name;

// ✅ Seguro: sanitizar si usas innerHTML
const sanitized = Security.sanitizeHtml(userData.name);
document.getElementById('user-name').innerHTML = sanitized;
```

### ❌ INSEGURO: innerHTML sin sanitizar

```javascript
// ❌ NUNCA hagas esto
document.getElementById('user-name').innerHTML = userData.name;
// Si userData.name = "<img src=x onerror=alert('XSS')>"
// Se ejecutaría el javascript
```

---

## 3. Protección contra CSRF (Cross-Site Request Forgery)

### Implementado en security.js

```javascript
// El token se genera automáticamente
const token = Security.getCSRFToken();

// Se añade a las requests automáticamente
fetch('/api/update', {
  method: 'POST',
  headers: Security.addCSRFHeaders(),
  body: JSON.stringify(data)
});
```

### En formularios HTML

```html
<form method="POST" action="/api/update" data-no-cache>
  <!-- Token se añade automáticamente -->
  <input type="hidden" name="csrf_token" id="csrf_token" value="">
  <input type="text" name="username" required>
  <button type="submit">Actualizar</button>
</form>

<script>
  document.getElementById('csrf_token').value = Security.getCSRFToken();
</script>
```

---

## 4. Rate Limiting

### Cliente

```javascript
// Prevenir múltiples clicks
if (Security.checkRateLimit('login-submit', 5, 60000)) {
  // Proceder con login
  performLogin();
} else {
  showError('Demasiados intentos. Intenta en 1 minuto.');
}
```

### Servidor (configurado en .htaccess)

```
# Limitar login a 10 requests/hora por IP
<Location /api/auth/login>
  SetEnvIf Request_URI "/api/auth/login" RATE_LIMIT=10/hour
</Location>
```

---

## 5. Protección de Datos Sensibles

### ✅ Almacenamiento Seguro

```javascript
// ✅ Usar sessionStorage para tokens (máximo 1 sesión)
sessionStorage.setItem('user_token', token);

// ✅ Encriptar antes de guardar
Security.setSecureStorage('sensitive_data', {
  userId: 123,
  ssn: '***-**-1234'
});

// ✅ Obtener desencriptado
const data = Security.getSecureStorage('sensitive_data');

// ✅ Limpiar al logout
Security.clearSecureSession();
```

### ❌ NUNCA hagas esto

```javascript
// ❌ NUNCA guardes datos sensibles en localStorage
localStorage.setItem('api_key', secretKey);

// ❌ NUNCA guardes números de tarjeta
localStorage.setItem('card', '4532-1234-5678-9010');

// ❌ NUNCA hardcodees en el código
const API_KEY = 'sk-1234567890abcdef';
```

---

## 6. HTTPS/TLS - Forzar en todas partes

### Verificar conexión segura

```javascript
if (window.location.protocol !== 'https:') {
  // Redirigir a HTTPS
  window.location.replace('https:' + window.location.href.substring(window.location.protocol.length));
}
```

### Headers HTTP (en .htaccess)

```apache
# Forzar HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# HSTS - Forzar HTTPS por 1 año
Header set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" env=HTTPS
```

---

## 7. Autenticación Segura

### Login con Rate Limiting

```javascript
async function handleLogin(email, password) {
  // Validar entrada
  const validEmail = Security.validateEmail(email);
  const validPass = Security.validatePassword(password);

  if (!validEmail.isValid || !validPass.isValid) {
    showError('Datos inválidos');
    return;
  }

  // Rate limiting
  if (!Security.checkRateLimit(`login_${email}`, 5, 1800000)) {
    showError('Demasiados intentos. Intenta en 30 minutos.');
    return;
  }

  // Log del evento
  Security.logSecurityEvent('login_attempt', {
    email: validEmail.value,
    timestamp: new Date().toISOString()
  });

  // Hacer request segura
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: Security.addCSRFHeaders(),
      body: JSON.stringify({
        email: validEmail.value,
        password: validPass.value
      })
    });

    if (response.ok) {
      const data = await response.json();
      // Guardar token en sessionStorage (no localStorage)
      sessionStorage.setItem('user_token', data.token);
      window.location.href = '/dashboard';
    } else {
      showError('Email o contraseña incorrectos');
    }
  } catch (error) {
    console.error('Login error:', error);
    showError('Error al conectar con el servidor');
  }
}
```

---

## 8. Encriptación de Datos en Tránsito

### Solo HTTPS (TLS 1.2+)

```javascript
// Verificar que la conexión es segura
const isSecure = window.location.protocol === 'https:' &&
                 navigator.appVersion.indexOf('https') !== -1;

if (!isSecure && window.location.hostname !== 'localhost') {
  console.error('❌ Conexión no segura');
}
```

---

## 9. Content Security Policy (CSP)

### En HTML Head

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:; 
               font-src 'self' https://fonts.googleapis.com; 
               connect-src 'self' https://api.empacas.com https://supabase.co;">
```

---

## 10. Monitoreo y Logging

### Registrar eventos de seguridad

```javascript
// Detectar intentos de acceso a admin sin permiso
try {
  const adminData = await fetchAdminData();
} catch (error) {
  Security.logSecurityEvent('unauthorized_admin_access', {
    user: currentUser.email,
    timestamp: new Date().toISOString(),
    error: error.message
  });
}

// Detectar múltiples fallos de login
if (loginAttempts > 5) {
  Security.logSecurityEvent('multiple_login_failures', {
    email: userEmail,
    attempts: loginAttempts,
    lockoutUntil: new Date(Date.now() + 30 * 60000)
  });
}
```

---

## 11. Validator en Consola

### Verificar seguridad del sitio

```javascript
// En la consola del navegador:
await SecurityValidator.runAll()

// Output:
// 🔒 SECURITY AUDIT REPORT
// 🚨 CRITICAL ISSUES
// ⚠️ HIGH PRIORITY
// ✅ PASSED CHECKS
```

---

## ✅ Checklist de Implementación

- [ ] Todas las entradas validadas (cliente Y servidor)
- [ ] HTTPS obligatorio en producción
- [ ] CSRF tokens en formularios
- [ ] XSS protection con sanitización
- [ ] Rate limiting en endpoints críticos
- [ ] Tokens guardados en sessionStorage
- [ ] Datos sensibles encriptados
- [ ] Eventos de seguridad registrados
- [ ] Headers CSP configurados
- [ ] Security validator ejecutado sin errores críticos

---

**Última actualización:** 2026-03-18
