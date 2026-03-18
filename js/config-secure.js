/**
 * CONFIGURACIÓN SEGURA - Reemplaza config.js
 * 
 * IMPORTANTE: Usa variables de entorno, NO hardcodea credenciales
 * En desarrollo: carga desde .env
 * En producción: las variables vienen del servidor/host
 */

// ============================================
// VALIDAR ENTORNO DE PRODUCCIÓN
// ============================================

const isProduction = window.location.protocol === 'https:' || 
                     process.env?.NODE_ENV === 'production';

if (isProduction && window.location.protocol !== 'https:') {
  console.error('❌ SEGURIDAD CRÍTICA: Sitio debe usar HTTPS en producción');
  // Redirigir a HTTPS
  window.location.protocol = 'https:';
}

// ============================================
// CONFIGURACIÓN
// ============================================

const CONFIG = {
  // URLs de Supabase - Obtén de variables de entorno
  SUPABASE_URL: import.meta.env?.VITE_SUPABASE_URL || 
                process.env?.VITE_SUPABASE_URL,
  
  SUPABASE_ANON_KEY: import.meta.env?.VITE_SUPABASE_ANON_KEY || 
                     process.env?.VITE_SUPABASE_ANON_KEY,

  // APP URLs
  APP_URL: import.meta.env?.VITE_APP_URL || 
           (isProduction ? 'https://empacas.com' : 'http://localhost:5173'),

  API_URL: import.meta.env?.VITE_API_URL || 
           (isProduction ? 'https://api.empacas.com' : 'http://localhost:3000'),

  // SEGURIDAD
  CSRF_PROTECTION_ENABLED: import.meta.env?.VITE_ENABLE_CSRF_PROTECTION !== 'false',
  SESSION_TIMEOUT_MS: parseInt(import.meta.env?.VITE_SESSION_TIMEOUT_MS || '1800000'),
  MAX_LOGIN_ATTEMPTS: parseInt(import.meta.env?.VITE_MAX_LOGIN_ATTEMPTS || '5'),
  LOCKOUT_TIME_MS: parseInt(import.meta.env?.VITE_LOCKOUT_TIME_MS || '1800000'),

  // FEATURE FLAGS
  ENABLE_ANALYTICS: import.meta.env?.VITE_ENABLE_ANALYTICS === 'true',
  DEBUG_MODE: !isProduction && import.meta.env?.VITE_DEBUG_MODE === 'true',

  // VALIDAR CONFIGURACIÓN CRÍTICA
  validate() {
    const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
    
    for (const key of required) {
      if (!this[key]) {
        throw new Error(
          `❌ CONFIGURACIÓN FALTANTE: ${key}\n` +
          `Asegúrate que .env tenga la variable VITE_${key}`
        );
      }
    }

    if (isProduction && !this.SUPABASE_URL.startsWith('https://')) {
      throw new Error('❌ URL de Supabase debe usar HTTPS en producción');
    }

    console.log('✅ Configuración validada correctamente');
  }
};

// Validar en tiempo de carga
try {
  CONFIG.validate();
} catch (error) {
  console.error(error.message);
  if (isProduction) {
    // En producción, mostrar error genérico
    document.body.innerHTML = '<p>Error de configuración. Contacta al administrador.</p>';
  }
}

// ============================================
// SUPABASE CONFIG - PARA config.js LEGACY
// ============================================

const SUPABASE_URL = CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = CONFIG.SUPABASE_ANON_KEY;

export default CONFIG;
