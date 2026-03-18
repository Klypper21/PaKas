# ✅ Checklist de Seguridad Pre-Lanzamiento

## 🔐 CONFIGURACIÓN INICIAL

- [ ] **Variables de Entorno**
  - [ ] Copiar `.env.example` a `.env`
  - [ ] Llenar todas las variables con valores reales
  - [ ] Verificar que `.env` está en `.gitignore`
  - [ ] NO commitear `.env` a repositorio

- [ ] **Credenciales de Supabase**
  - [ ] Cambiar de hardcode a variables de entorno
  - [ ] Usar solo el ANON_KEY en el cliente
  - [ ] Mantener SERVICE_ROLE_KEY solo en servidor
  - [ ] Rotar keys regularmente

- [ ] **HTTPS/SSL**
  - [ ] Certificado SSL válido instalado
  - [ ] Redireccionamiento HTTP → HTTPS en servidor
  - [ ] HSTS habilitado (`.htaccess` o config del servidor)
  - [ ] Verificar con: https://www.ssl-labs.com

## 🛡️ AUTENTICACIÓN Y AUTORIZACIÓN

- [ ] **Contraseñas**
  - [ ] Validación mínima 8 caracteres
  - [ ] Requerir mayúsculas, minúsculas, números, símbolos
  - [ ] Hash con bcrypt (12+ rounds)
  - [ ] Never store plain text passwords

- [ ] **Sesiones**
  - [ ] JWT tokens con expiración (30 minutos)
  - [ ] Refresh tokens con mayor expiración
  - [ ] Logout limpia tokens del cliente y servidor
  - [ ] Session timeout automático

- [ ] **2FA (Two-Factor Authentication)**
  - [ ] Implementado para admin users (obligatorio)
  - [ ] Implementado opcional para usuarios regulares
  - [ ] Usar TOTP (Time-based One-Time Password)

- [ ] **Rate Limiting**
  - [ ] Login: 5 intentos / 30 minutos
  - [ ] API: 100 requests / minuto por usuario
  - [ ] Register: 3 cuentas / 24 horas por IP

## 🌐 API Y DATOS

- [ ] **Validación**
  - [ ] Todas las entradas validadas en servidor
  - [ ] Validación de tipos de datos
  - [ ] Sanitización de strings (prevenir XSS)
  - [ ] Límites de tamaño en inputs

- [ ] **CORS**
  - [ ] Solo dominios permitidos
  - [ ] Métodos explícitos (GET, POST, etc)
  - [ ] Credenciales restringidas

- [ ] **CSRF Protection**
  - [ ] Tokens CSRF en formularios
  - [ ] Validación en servidor
  - [ ] SameSite cookies: 'Strict'

- [ ] **Encriptación de Datos**
  - [ ] En tránsito: TLS 1.2+ (HTTPS)
  - [ ] En reposo: PII encriptado
  - [ ] Contraseñas: bcrypt
  - [ ] Números de tarjeta: nunca almacenar (solo tokens)

## 📊 LOGGING Y MONITORING

- [ ] **Logs**
  - [ ] Almacenar logs de eventos de seguridad
  - [ ] Enmascarar datos sensibles en logs
  - [ ] Rotación de logs (7 días mínimo)
  - [ ] Acceso a logs restringido

- [ ] **Alertas**
  - [ ] Detectar múltiples fallos de login
  - [ ] Detectar cambios en datos sensibles
  - [ ] Alertar sobre accesos de admin
  - [ ] Monitoreo de performance

## 📦 DEPENDENCIES

- [ ] **Auditoría de seguridad**
  ```bash
  npm audit
  npm audit fix
  ```
- [ ] **Versiones actualizadas**
  - [ ] Node.js LTS mínimo
  - [ ] Dependencias sin vulnerabilidades conocidas
  - [ ] `npm install` solo en entorno confiable

## 🔍 CÓDIGO

- [ ] **Code Review**
  - [ ] Revisión de seguridad por dos personas
  - [ ] No hay hardcode de credenciales
  - [ ] No hay comentarios con datos sensibles
  - [ ] No hay console.log() en producción

- [ ] **Testing**
  - [ ] Tests de validación de entrada
  - [ ] Tests de autenticación/autorización
  - [ ] Tests de inyección XSS
  - [ ] Tests de inyección SQL (si aplica)

## 🗄️ BASE DE DATOS

- [ ] **Supabase**
  - [ ] Row Level Security (RLS) habilitado
  - [ ] Políticas RLS correctas
  - [ ] Backups automáticos habilitados
  - [ ] Acceso a BD restringido por IP

- [ ] **Datos**
  - [ ] Información sensible (PII) encriptada
  - [ ] Políticas de retención de datos
  - [ ] GDPR compliance checklist
  - [ ] Derecho al olvido implementado

## 🖥️ INFRAESTRUCTURA

- [ ] **Servidor/Host**
  - [ ] Firewall configurado
  - [ ] WAF (Web Application Firewall) activo
  - [ ] DDoS protection habilitado
  - [ ] Backup del servidor: diario

- [ ] **Headers HTTP**
  - [ ] HSTS
  - [ ] X-Frame-Options: DENY
  - [ ] X-Content-Type-Options: nosniff
  - [ ] Content-Security-Policy
  - [ ] Referrer-Policy
  - [ ] X-XSS-Protection

- [ ] **DNS**
  - [ ] DNSSEC habilitado
  - [ ] SPF configurado
  - [ ] DKIM configurado
  - [ ] DMARC configurado

## 📱 FRONTEND

- [ ] **XSS Prevention**
  - [ ] Sanitizar inputs del usuario
  - [ ] Usar `textContent` en lugar de `innerHTML`
  - [ ] Validar URLs antes de redirigir
  - [ ] CSP strict headers

- [ ] **Almacenamiento Cliente**
  - [ ] No almacenar tokens en localStorage
  - [ ] Usar sessionStorage para datos temporales
  - [ ] Limpiar datos al logout
  - [ ] No guardar datos PII

## 🚀 DEPLOYMENT

- [ ] **Antes de publicar**
  - [ ] `.env` NO está en git
  - [ ] `.gitignore` tiene todo sensible
  - [ ] Certificado SSL válido
  - [ ] DNS apuntando correctamente
  - [ ] Test HTTPS funciona

- [ ] **Post-Deployment**
  - [ ] Verificar HTTPS en todos los dominios
  - [ ] Probar login y autenticación
  - [ ] Revisar logs del servidor
  - [ ] Escanear con https://www.ssl-labs.com
  - [ ] Verificar headers HTTP: https://securityheaders.com

## 📋 DOCUMENTACIÓN

- [ ] Documento de Política de Seguridad (SECURITY.md)
- [ ] Guía de respuesta a incidentes
- [ ] Documento de retención de datos
- [ ] Política de privacidad actualizada
- [ ] Términos de servicio incluyen clausulas de seguridad

## 🔄 MANTENIMIENTO CONTINUO

- [ ] **Revisiones periódicas**
  - [ ] Mensual: npm audit fix
  - [ ] Trimestral: code security review
  - [ ] Anual: penetration testing

- [ ] **Respuesta a vulnerabilidades**
  - [ ] Proceso de reporte definido
  - [ ] Proceso de patch definido
  - [ ] Timeline de response < 24h

---

**Última revisión:** [FECHA]
**Revisado por:** [NOMBRE]
**Próxima revisión:** [FECHA]

✅ = Completado
⏳ = En progreso
❌ = No completado / Bloqueado
