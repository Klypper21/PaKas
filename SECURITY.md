# 🔒 Política de Seguridad - Empacas

## 1. Reportar Vulnerabilidades

Si encuentras una vulnerabilidad de seguridad, **NO** la publiques en issues públicos.

Envía un email privado a: **security@empacas.com** con:
- Descripción de la vulnerabilidad
- Pasos para reproducirla
- Impacto potencial

## 2. Estándares de Seguridad Implementados

### HTTPS/TLS
✅ HTTPS obligatorio en producción
✅ Certificado SSL/TLS válido
✅ HSTS habilitado (Strict-Transport-Security)

### Autenticación
✅ Contraseñas hasheadas con bcrypt (mín. 12 rondas)
✅ 2FA disponible para usuarios
✅ Sessiones seguras con tokens JWT
✅ Timeout de sesión: 30 minutos

### Protección contra Ataques
✅ CSRF tokens en formularios
✅ CSP (Content Security Policy) configurada
✅ X-Frame-Options: DENY
✅ X-Content-Type-Options: nosniff
✅ Rate limiting: 100 requests/minuto
✅ Validación de entrada en servidor y cliente

### Datos Sensibles
✅ Credenciales en variables de entorno (.env)
✅ Datos PII encriptados en base de datos
✅ Números de tarjeta nunca almacenados (solo tokens)
✅ Logs sensibles enmascarados

### API
✅ Autenticación en todos los endpoints
✅ Validación de CORS
✅ Rate limiting por usuario
✅ Versionado de API (/api/v1/)

## 3. Checklist Pre-Producción

- [ ] HTTPS configurado
- [ ] Certificado SSL válido
- [ ] Variables .env configuradas
- [ ] Base de datos con backups diarios
- [ ] Monitoreo de seguridad activo
- [ ] Logs centralizados
- [ ] WAF (Web Application Firewall) configurado
- [ ] Backups encriptados
- [ ] 2FA obligatorio para admins
- [ ] Auditoría de código completada

## 4. Dependencias y Actualizaciones

```bash
# Verificar vulnerabilidades
npm audit

# Actualizar dependencias
npm update
npm audit fix
```

## 5. Endpoints Críticos

Requieren autenticación + HTTPS + Rate limiting:
- `/api/auth/login`
- `/api/auth/register`
- `/api/usuarios/*`
- `/api/pedidos/*`
- `/api/pagos/*`

## 6. Encriptación

- **En tránsito:** TLS 1.2+
- **En reposo:** AES-256 para datos PII
- **Contraseñas:** bcrypt (12+ rounds)

## 7. Respuesta a Incidentes

1. **Detección:** Alertas en tiempo real
2. **Aislamiento:** Desconectar el componente afectado
3. **Investigación:** Revisar logs
4. **Notificación:** A usuarios afectados en 24h
5. **Remediación:** Patch y redeploy
6. **Post-mortem:** Análisis de raíz

## 8. Contacto de Seguridad

- Email: security@empacas.com
- Teléfono: +XX XXXX XXXX
- PGP Key: [disponible aquí]

**Última actualización:** 2026-03-18
