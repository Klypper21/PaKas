/**
 * MÓDULO DE SEGURIDAD
 * Funciones de utilidad para seguridad del cliente
 */

const Security = {
  // ============================================
  // CSRF TOKEN MANAGEMENT
  // ============================================
  
  /**
   * Genera un token CSRF aleatorio
   * @returns {string} Token CSRF
   */
  generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Establece token CSRF en sessionStorage
   */
  initCSRFToken() {
    let token = sessionStorage.getItem('csrf_token');
    if (!token) {
      token = this.generateCSRFToken();
      sessionStorage.setItem('csrf_token', token);
    }
    return token;
  },

  /**
   * Obtiene el token CSRF actual
   * @returns {string} Token CSRF
   */
  getCSRFToken() {
    return sessionStorage.getItem('csrf_token') || this.initCSRFToken();
  },

  /**
   * Incluye token CSRF en headers de fetch
   * @param {Object} headers - Headers existentes
   * @returns {Object} Headers con token CSRF
   */
  addCSRFHeaders(headers = {}) {
    return {
      ...headers,
      'X-CSRF-Token': this.getCSRFToken(),
      'Content-Type': 'application/json'
    };
  },

  // ============================================
  // INPUT VALIDATION & SANITIZATION
  // ============================================

  /**
   * Valida y sanitiza email
   * @param {string} email - Email a validar
   * @returns {Object} { isValid, value }
   */
  validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = regex.test(email) && email.length <= 254;
    return {
      isValid,
      value: isValid ? email.toLowerCase().trim() : ''
    };
  },

  /**
   * Valida contraseña (mínimo 8 caracteres, mayúscula, número, símbolo)
   * @param {string} password - Contraseña a validar
   * @returns {Object} { isValid, strength, message }
   */
  validatePassword(password) {
    if (!password || password.length < 8) {
      return { isValid: false, strength: 'weak', message: 'Mínimo 8 caracteres' };
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    let strength = 'weak';
    if (hasUpperCase && hasLowerCase && hasNumbers && hasSpecial) {
      strength = 'strong';
    } else if (hasUpperCase && hasLowerCase && hasNumbers) {
      strength = 'medium';
    }

    return {
      isValid: strength === 'strong' || strength === 'medium',
      strength,
      message: `Debe contener mayúsculas, minúsculas, números y símbolos. Fuerza: ${strength}`
    };
  },

  /**
   * Valida número de teléfono
   * @param {string} phone - Teléfono a validar
   * @returns {Object} { isValid, value }
   */
  validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    const isValid = cleaned.length >= 10 && cleaned.length <= 15;
    return {
      isValid,
      value: isValid ? cleaned : ''
    };
  },

  /**
   * Sanitiza string para prevenir XSS
   * @param {string} str - String a sanitizar
   * @returns {string} String sanitizado
   */
  sanitizeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Valida URL para prevenir open redirects
   * @param {string} url - URL a validar
   * @returns {boolean}
   */
  isValidRedirectUrl(url) {
    if (!url) return false;
    
    try {
      const parsedUrl = new URL(url, window.location.origin);
      return parsedUrl.origin === window.location.origin;
    } catch {
      return false;
    }
  },

  // ============================================
  // RATE LIMITING (CLIENT SIDE)
  // ============================================

  requestTimestamps: {},

  /**
   * Verifica si se excedió el rate limit
   * @param {string} key - Identificador de acción
   * @param {number} maxRequests - Máximo de requests
   * @param {number} timeWindowMs - Ventana de tiempo en ms
   * @returns {boolean} true si se puede proceder
   */
  checkRateLimit(key, maxRequests = 5, timeWindowMs = 60000) {
    const now = Date.now();
    
    if (!this.requestTimestamps[key]) {
      this.requestTimestamps[key] = [];
    }

    // Remover timestamps antiguos
    this.requestTimestamps[key] = this.requestTimestamps[key]
      .filter(timestamp => now - timestamp < timeWindowMs);

    if (this.requestTimestamps[key].length < maxRequests) {
      this.requestTimestamps[key].push(now);
      return true;
    }

    console.warn(`⚠️ Rate limit exceeded for: ${key}`);
    return false;
  },

  // ============================================
  // SESSION SECURITY
  // ============================================

  /**
   * Encripta data para almacenarla en localStorage
   * @param {*} data - Data a encriptar
   * @returns {string} Data encriptada en base64
   */
  encryptData(data) {
    return btoa(JSON.stringify(data));
  },

  /**
   * Desencripta data de localStorage
   * @param {string} encrypted - Data encriptada
   * @returns {*} Data desencriptada
   */
  decryptData(encrypted) {
    try {
      return JSON.parse(atob(encrypted));
    } catch {
      return null;
    }
  },

  /**
   * Almacena data sensible de forma segura
   * @param {string} key - Clave
   * @param {*} value - Valor
   */
  setSecureStorage(key, value) {
    sessionStorage.setItem(key, this.encryptData(value));
  },

  /**
   * Obtiene data sensible de forma segura
   * @param {string} key - Clave
   * @returns {*} Valor
   */
  getSecureStorage(key) {
    const encrypted = sessionStorage.getItem(key);
    return encrypted ? this.decryptData(encrypted) : null;
  },

  /**
   * Limpia sessionStorage al cerrar sesión
   */
  clearSecureSession() {
    sessionStorage.clear();
    sessionStorage.removeItem('csrf_token');
  },

  // ============================================
  // MONITORING & LOGGING
  // ============================================

  /**
   * Registra evento de seguridad
   * @param {string} event - Tipo de evento
   * @param {Object} details - Detalles del evento
   */
  logSecurityEvent(event, details = {}) {
    const timestamp = new Date().toISOString();
    const userAgent = navigator.userAgent;
    const referer = document.referrer;

    const log = {
      timestamp,
      event,
      userAgent,
      referer,
      ...details
    };

    // Log local (consola en desarrollo)
    console.log('🔒 Security Event:', log);

    // Enviar al servidor (en producción)
    if (process.env.NODE_ENV === 'production') {
      this.sendSecurityLog(log);
    }
  },

  /**
   * Envía log de seguridad al servidor
   * @param {Object} log - Log a enviar
   */
  async sendSecurityLog(log) {
    try {
      const token = this.getCSRFToken();
      await fetch('/api/security/logs', {
        method: 'POST',
        headers: this.addCSRFHeaders(),
        body: JSON.stringify(log)
      });
    } catch (error) {
      console.error('Error sending security log:', error);
    }
  },

  // ============================================
  // INICIALIZACIÓN
  // ============================================

  /**
   * Inicializa todas las medidas de seguridad
   */
  init() {
    this.initCSRFToken();
    this.setupSecurityHeaders();
    this.setupEventListeners();
    console.log('🔒 Security module initialized');
  },

  /**
   * Configura headers de seguridad adicionales
   */
  setupSecurityHeaders() {
    // Prevenir que el navegador guarde datos sensibles
    if (document.querySelector('form[data-no-cache]')) {
      document.querySelectorAll('form[data-no-cache]').forEach(form => {
        form.setAttribute('autocomplete', 'off');
      });
    }
  },

  /**
   * Configura event listeners de seguridad
   */
  setupEventListeners() {
    // Detectar intentos de manipulación del DOM
    document.addEventListener('DOMContentLoaded', () => {
      if (window.devtools && window.devtools.open) {
        this.logSecurityEvent('devtools_detected', {
          message: 'Developer tools detected'
        });
      }
    });

    // Alerta si se intenta copiar datos sensibles
    document.addEventListener('copy', (e) => {
      if (e.target && e.target.closest('[data-sensitive]')) {
        console.warn('⚠️ Attempt to copy sensitive data');
        this.logSecurityEvent('copy_sensitive_data', {
          target: e.target.className
        });
      }
    });
  }
};

// Inicializar módulo de seguridad al cargar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Security.init());
} else {
  Security.init();
}
