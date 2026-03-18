/**
 * GUÍA DE PROTECCIÓN CONTRA ATAQUES COMUNES
 */

// ============================================
// 1. INYECCIÓN SQL (SQL Injection)
// ============================================

// ❌ INSEGURO - ¡NUNCA hagas esto!
const query = `SELECT * FROM users WHERE email = '${userInput}'`;
// Si userInput = "' OR '1'='1", devuelve TODOS los usuarios

// ✅ SEGURO - Usar parámetros
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('email', userInput); // Parámetro separado

// ✅ SEGURO - Si usas API propia
const response = await fetch('/api/getUserByEmail', {
  method: 'POST',
  body: JSON.stringify({ email: userInput }),
  headers: Security.addCSRFHeaders()
});

// ============================================
// 2. CROSS-SITE SCRIPTING (XSS)
// ============================================

// ❌ INSEGURO - Renderizar HTML sin sanitizar
document.getElementById('output').innerHTML = userInput;

// ✅ SEGURO - Usar textContent
document.getElementById('output').textContent = userInput;

// ✅ SEGURO - Sanitizar si necesitas innerHTML
const sanitized = Security.sanitizeHtml(userInput);
document.getElementById('output').innerHTML = sanitized;

// ✅ SEGURO - Template literals
const safe = `<div>${userInput}</div>`;
// El contenido se escapa automáticamente

// ============================================
// 3. CROSS-SITE REQUEST FORGERY (CSRF)
// ============================================

// ❌ INSEGURO - Sin protección CSRF
await fetch('/api/deleteUser', {
  method: 'POST',
  body: JSON.stringify({ userId })
});

// ✅ SEGURO - Con token CSRF
await fetch('/api/deleteUser', {
  method: 'POST',
  headers: Security.addCSRFHeaders(),
  body: JSON.stringify({ userId })
});

// ✅ SEGURO - En formularios
<form method="POST">
  <input type="hidden" name="csrf_token" value="">
  <button>Eliminar</button>
</form>

// ============================================
// 4. ATAQUES DE FUERZA BRUTA
// ============================================

// ❌ INSEGURO - Sin rate limiting
async function handleLogin(email, password) {
  return await Auth.login(email, password);
}

// ✅ SEGURO - Con rate limiting
async function handleLogin(email, password) {
  if (!Security.checkRateLimit(`login_${email}`, 5, 1800000)) {
    throw new Error('Demasiados intentos. Intenta más tarde.');
  }

  return await Auth.login(email, password);
}

// ============================================
// 5. ACCESO NO AUTORIZADO (Authorization)
// ============================================

// ❌ INSEGURO - Confiar en cliente
const isAdmin = localStorage.getItem('isAdmin') === 'true';
if (isAdmin) {
  // Mostrar panel admin
}

// ✅ SEGURO - Verificar en servidor
const { data } = await supabase
  .from('users')
  .select('role')
  .eq('id', userId)
  .single();

if (data.role === 'admin') {
  // Mostrar panel admin - Verificado en servidor
}

// ============================================
// 6. INFORMACIÓN SENSIBLE EXPUESTA
// ============================================

// ❌ INSEGURO - Exponer en cliente
const userData = {
  id: 123,
  ssn: '123-45-6789',
  creditCard: '4532-1234-5678-9010',
  password: 'hashedPassword'
};
console.log(userData);

// ✅ SEGURO - Ocultar datos sensibles
const userData = {
  id: 123,
  ssn: '***-**-6789',
  creditCard: '****-****-****-9010',
  // password NO enviado al cliente
};

// ============================================
// 7. INSECURE DIRECT OBJECT REFERENCES (IDOR)
// ============================================

// ❌ INSEGURO - Confiar en ID del cliente
fetch(`/api/getUserData/${userIdFromUrl}`)
  .then(r => r.json())
  .then(data => console.log(data));
// Si otro usuario cambia la URL, ¡ve sus datos!

// ✅ SEGURO - Verificar autorización en servidor
fetch(`/api/getUserData/${userIdFromUrl}`, {
  method: 'GET',
  headers: Security.addCSRFHeaders()
})
// En servidor: verificar que auth.uid() == userIdFromUrl

// ============================================
// 8. PROTECCIÓN DE ARCHIVOS SENSIBLES
// ============================================

// ❌ INSEGURO - .env en repositorio
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

// ✅ SEGURO - Variables de entorno
VITE_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
// En .gitignore - nunca commitear .env

// ============================================
// 9. VALIDACIÓN DE ENTRADA
// ============================================

// ❌ INSEGURO - Confiar en cliente
const email = document.getElementById('email').value;
await Auth.register(email, password);

// ✅ SEGURO - Validar cliente Y servidor
const emailValidation = Security.validateEmail(userInput);
if (!emailValidation.isValid) {
  showError(emailValidation.message);
  return;
}

// En servidor:
if (!isValidEmail(email)) {
  throw new Error('Email inválido');
}

// ============================================
// 10. PROTECCIÓN DE SESIÓN
// ============================================

// ❌ INSECURO - Token en localStorage
localStorage.setItem('authToken', token);

// ✅ SEGURO - Token en sessionStorage
sessionStorage.setItem('authToken', token);
// Cookies con HttpOnly:
Set-Cookie: authToken=xyz; HttpOnly; Secure; SameSite=Strict

// ✅ SEGURO - Timeout de sesión
setTimeout(() => {
  Security.clearSecureSession();
  window.location.href = '/login';
}, 30 * 60 * 1000); // 30 minutos

// ============================================
// CHECKLIST DE SEGURIDAD
// ============================================

const SecurityChecklist = {
  // Entrada
  validateAllInputs: true,           // ✅
  sanitizeHTML: true,                // ✅
  useParameterizedQueries: true,     // ✅

  // Salida
  noConsoleLogSecrets: true,         // ✅
  escapeSpecialChars: true,          // ✅
  useTextContentNotHTML: true,       // ✅

  // Autenticación
  hashPasswords: true,               // ✅
  rate_limit_login: true,            // ✅
  session_timeout: true,             // ✅

  // Autorización
  verifyUserPermissions: true,       // ✅
  checkRLSPolicies: true,            // ✅
  no_client_side_auth_check: true,   // ✅

  // Datos
  https_only: true,                  // ✅
  encryptSensitive: true,            // ✅
  no_hardcoded_secrets: true,        // ✅

  // CSRF
  useCSRFTokens: true,               // ✅
  sameSiteCookies: true,             // ✅

  // Headers
  securityHeaders: true,             // ✅ (CSP, HSTS, X-Frame-Options)
  HTTPS_enforced: true,              // ✅

  // Logging
  logSecurityEvents: true,           // ✅
  maskSensitiveData: true            // ✅
};

// Ejemplo: Log seguro
Security.logSecurityEvent('failed_login_attempt', {
  email: email.replace(/.(?=.*@)/g, '*'), // Enmascarar email
  timestamp: new Date().toISOString()
  // NO incluir contraseña, token, etc.
});
