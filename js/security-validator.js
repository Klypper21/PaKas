/**
 * VALIDADOR DE SEGURIDAD
 * Ejecuta verificaciones de seguridad en tu sitio
 * 
 * Uso en consola del navegador:
 * await SecurityValidator.runAll()
 */

const SecurityValidator = {
  results: [],

  /**
   * Validar HTTPS
   */
  checkHTTPS() {
    const pass = window.location.protocol === 'https:';
    this.results.push({
      name: 'HTTPS Required',
      pass,
      severity: 'critical',
      message: pass 
        ? '✅ Sitio usando HTTPS' 
        : '❌ HTTPS no está habilitado'
    });
    return pass;
  },

  /**
   * Validar headers de seguridad
   */
  async checkSecurityHeaders() {
    try {
      const response = await fetch(window.location.href, { method: 'HEAD' });
      const headers = response.headers;

      const checks = [
        {
          key: 'strict-transport-security',
          name: 'HSTS Header',
          severity: 'high'
        },
        {
          key: 'x-content-type-options',
          name: 'X-Content-Type-Options',
          severity: 'high'
        },
        {
          key: 'x-frame-options',
          name: 'X-Frame-Options (Clickjacking)',
          severity: 'high'
        },
        {
          key: 'content-security-policy',
          name: 'Content Security Policy',
          severity: 'critical'
        },
        {
          key: 'x-xss-protection',
          name: 'X-XSS-Protection',
          severity: 'medium'
        }
      ];

      for (const check of checks) {
        const value = headers.get(check.key);
        const pass = !!value;
        this.results.push({
          name: check.name,
          pass,
          severity: check.severity,
          message: pass
            ? `✅ ${check.key}: ${value}`
            : `❌ Missing ${check.key}`
        });
      }
    } catch (error) {
      console.error('Error checking headers:', error);
    }
  },

  /**
   * Validar que no hay credenciales en el código
   */
  checkCredentials() {
    const scripts = Array.from(document.querySelectorAll('script'));
    let found = false;

    const patterns = [
      /supabase_key[\s=:]+['\"][\w\-\.]+['\"]|'?[a-z0-9]{40,}['\"]?/gi,
      /api[\s_-]?key[\s=:]+['\"].*?['\"]|token[\s=:]+['\"].*?['\"]|secret[\s=:]+['\"].*?['\"]|password[\s=:]+['\"].*?['\"]|pass[\s=:]+['\"].*?['\"]|apikey|api-key|authorization/gi
    ];

    for (const script of scripts) {
      if (script.src) continue; // Skip external scripts
      const content = script.textContent;

      for (const pattern of patterns) {
        if (pattern.test(content)) {
          found = true;
          break;
        }
      }
    }

    this.results.push({
      name: 'Hardcoded Credentials',
      pass: !found,
      severity: 'critical',
      message: found
        ? '❌ Posibles credenciales en el código'
        : '✅ No se detectaron credenciales hardcodeadas'
    });
  },

  /**
   * Validar CSP
   */
  checkCSP() {
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const pass = !!cspMeta;
    this.results.push({
      name: 'CSP Meta Tag',
      pass,
      severity: 'medium',
      message: pass
        ? '✅ CSP configurada'
        : '⚠️ CSP no configurada en meta tag'
    });
  },

  /**
   * Validar localStorage/sessionStorage
   */
  checkStorageUsage() {
    let findings = [];

    // Check localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);

      if (this.containsSensitiveData(key, value)) {
        findings.push(`localStorage.${key}`);
      }
    }

    // Check sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      const value = sessionStorage.getItem(key);

      if (this.containsSensitiveData(key, value)) {
        findings.push(`sessionStorage.${key}`);
      }
    }

    const pass = findings.length === 0;
    this.results.push({
      name: 'Sensitive Data Storage',
      pass,
      severity: 'high',
      message: pass
        ? '✅ No se detectó data sensible en storage'
        : `❌ Data sensible encontrada: ${findings.join(', ')}`
    });
  },

  /**
   * Detectar si contiene datos sensibles
   */
  containsSensitiveData(key, value) {
    if (!value || typeof value !== 'string') return false;

    const sensitivePatterns = [
      /password|passwd|pwd|secret|token|api.?key|auth|bearer|credential|jwt|session.?id/i,
      /^[a-z0-9]{32,}$/i, // Potential hash/token
      /:\d{3}:\d+/  // Potential hash format
    ];

    const keyLower = key.toLowerCase();
    for (const pattern of sensitivePatterns) {
      if (pattern.test(keyLower) || pattern.test(value)) {
        return true;
      }
    }

    return false;
  },

  /**
   * Validar form autocomplete
   */
  checkForms() {
    const forms = document.querySelectorAll('form[data-no-cache], form[autocomplete="off"]');
    const pass = forms.length > 0 || document.querySelectorAll('input[type="password"]').length === 0;

    this.results.push({
      name: 'Form Security',
      pass,
      severity: 'medium',
      message: pass
        ? '✅ Controles de autocomplete configurados'
        : '⚠️ Considera desabilitar autocomplete en formularios sensibles'
    });
  },

  /**
   * Validar módulo de seguridad
   */
  checkSecurityModule() {
    const pass = typeof Security !== 'undefined' && typeof Security.init === 'function';
    this.results.push({
      name: 'Security Module',
      pass,
      severity: 'high',
      message: pass
        ? '✅ Módulo de seguridad cargado'
        : '❌ Módulo de seguridad no encontrado (security.js)'
    });
  },

  /**
   * Validar CSRF token
   */
  checkCSRFToken() {
    const token = sessionStorage.getItem('csrf_token');
    const pass = !!token;
    this.results.push({
      name: 'CSRF Token',
      pass,
      severity: 'high',
      message: pass
        ? '✅ Token CSRF presente'
        : '❌ Token CSRF no inicializado'
    });
  },

  /**
   * Validar Dependencies
   */
  checkDependencies() {
    // Check for known vulnerable patterns
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    let vulnerableFound = false;

    const vulnerableLibraries = [
      /jquery[.-]?([0-9.]+)?\.js/i, // Old jQuery versions
    ];

    for (const script of scripts) {
      const src = script.src.toLowerCase();
      for (const pattern of vulnerableLibraries) {
        if (pattern.test(src)) {
          vulnerableFound = true;
          break;
        }
      }
    }

    this.results.push({
      name: 'Dependencies',
      pass: !vulnerableFound,
      severity: 'medium',
      message: vulnerableFound
        ? '⚠️ Posiblemente librerías vulnerables detectadas'
        : '✅ Dependencias parecen seguras'
    });
  },

  /**
   * Mostrar reporte
   */
  printReport() {
    console.clear();
    console.log('%c🔒 SECURITY AUDIT REPORT', 'font-size: 18px; font-weight: bold; color: #0066cc;');
    console.log(`%cFecha: ${new Date().toLocaleString()}`, 'font-size: 12px; color: #666;');
    console.log('\n');

    // Agrupar por severidad
    const critical = this.results.filter(r => r.severity === 'critical' && !r.pass);
    const high = this.results.filter(r => r.severity === 'high' && !r.pass);
    const medium = this.results.filter(r => r.severity === 'medium' && !r.pass);
    const pass = this.results.filter(r => r.pass);

    if (critical.length > 0) {
      console.log('%c🚨 CRITICAL ISSUES', 'font-size: 14px; font-weight: bold; color: #cc0000;');
      critical.forEach(r => console.log(`  ${r.message}`));
      console.log('\n');
    }

    if (high.length > 0) {
      console.log('%c⚠️ HIGH PRIORITY', 'font-size: 14px; font-weight: bold; color: #ff6600;');
      high.forEach(r => console.log(`  ${r.message}`));
      console.log('\n');
    }

    if (medium.length > 0) {
      console.log('%c⚡ MEDIUM PRIORITY', 'font-size: 14px; font-weight: bold; color: #ffaa00;');
      medium.forEach(r => console.log(`  ${r.message}`));
      console.log('\n');
    }

    console.log('%c✅ PASSED CHECKS', 'font-size: 14px; font-weight: bold; color: #00cc00;');
    pass.forEach(r => console.log(`  ${r.message}`));

    // Resumen
    console.log('\n%c───────────────────────────────────', 'color: #ccc;');
    console.log(`Passed: ${pass.length}/${this.results.length}`);
    console.log(`Issues: ${critical.length + high.length + medium.length}`);
    console.log('───────────────────────────────────\n');

    return {
      total: this.results.length,
      passed: pass.length,
      issues: critical.length + high.length + medium.length,
      critical: critical.length,
      high: high.length,
      medium: medium.length,
      details: this.results
    };
  },

  /**
   * Ejecutar todas las validaciones
   */
  async runAll() {
    console.log('🔄 Starting security audit...\n');

    this.checkHTTPS();
    await this.checkSecurityHeaders();
    this.checkCredentials();
    this.checkCSP();
    this.checkStorageUsage();
    this.checkForms();
    this.checkSecurityModule();
    this.checkCSRFToken();
    this.checkDependencies();

    return this.printReport();
  }
};

// Hacer disponible en consola
window.SecurityValidator = SecurityValidator;
console.log('🔒 SecurityValidator loaded. Run: await SecurityValidator.runAll()');
