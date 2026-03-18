-- ============================================
-- 🔒 ROW LEVEL SECURITY (RLS) - SUPABASE
-- ============================================

-- Ejecutar esto en el editor SQL de Supabase

-- 1. USUARIOS - Cada usuario solo ve su info
CREATE POLICY "Users can view their own data"
ON users
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
ON users
FOR UPDATE
USING (auth.uid() = id);

-- 2. PEDIDOS - Usuarios solo ven sus propios pedidos
CREATE POLICY "Users can view own orders"
ON pedidos
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
ON pedidos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
ON pedidos
FOR UPDATE
USING (auth.uid() = user_id);

-- 3. CARRITO - Cada usuario su carrito
CREATE POLICY "Users can view own cart"
ON carrito
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert items to own cart"
ON carrito
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart items"
ON carrito
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from own cart"
ON carrito
FOR DELETE
USING (auth.uid() = user_id);

-- 4. DIRECCIONES - Cada usuario sus direcciones
CREATE POLICY "Users can view own addresses"
ON direcciones
FOR SELECT
USING (auth.uid() = user_id);

-- 5. ADMIN - Solo admins pueden ver todos los pedidos
CREATE POLICY "Admins can view all orders"
ON pedidos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- FUNCIONES DE SEGURIDAD
-- ============================================

-- Función: Validar email único
CREATE OR REPLACE FUNCTION email_exists(email_address VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(SELECT 1 FROM users WHERE email = email_address);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Hash de contraseña (usa pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION hash_password(password VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Verificar contraseña
CREATE OR REPLACE FUNCTION verify_password(password VARCHAR, password_hash VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN password_hash = crypt(password, password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Sanitizar inputs
CREATE OR REPLACE FUNCTION sanitize_text(input_text VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  -- Remover HTML tags
  RETURN regexp_replace(input_text, '<[^>]*>', '', 'g');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Validar email
CREATE OR REPLACE FUNCTION validate_email(email_address VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  IF email_address !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN
    RAISE EXCEPTION 'Email inválido';
  END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS DE AUDITORÍA
-- ============================================

-- Tabla de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR NOT NULL,
  operation VARCHAR NOT NULL, -- INSERT, UPDATE, DELETE
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para performance
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

-- Trigger function para auditar cambios
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    table_name,
    operation,
    user_id,
    old_values,
    new_values
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar triggers a tablas importantes
CREATE TRIGGER audit_users_changes AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_pedidos_changes AFTER INSERT OR UPDATE OR DELETE ON pedidos
FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_pagos_changes AFTER INSERT OR UPDATE OR DELETE ON pagos
FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- ============================================
-- FUNCIONES DE RATE LIMITING
-- ============================================

-- Tabla de rate limiting
CREATE TABLE IF NOT EXISTS rate_limiting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  action VARCHAR NOT NULL, -- 'login', 'register', etc
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rate_limiting_user_action ON rate_limiting(user_id, action, created_at);

-- Función: Verificar rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_action VARCHAR,
  p_max_attempts INTEGER,
  p_time_window_minutes INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM rate_limiting
  WHERE user_id = auth.uid()
    AND action = p_action
    AND created_at > NOW() - (p_time_window_minutes || ' minutes')::INTERVAL;
  
  IF v_count >= p_max_attempts THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Registrar intento
CREATE OR REPLACE FUNCTION log_activity(p_action VARCHAR)
RETURNS VOID AS $$
BEGIN
  INSERT INTO rate_limiting (user_id, action)
  VALUES (auth.uid(), p_action);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- POLÍTICAS RLS MEJORADAS
-- ============================================

-- Habilitador RLS en tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE carrito ENABLE ROW LEVEL SECURITY;
ALTER TABLE direcciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: Solo admins ven logs de auditoría
CREATE POLICY "Admins can view audit logs"
ON audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- SEGURIDAD DE COLUMNAS
-- ============================================

-- Encriptar columnas sensibles (si lo implementa el app)
-- ALTER TABLE users ALTER COLUMN phone USING pgp_sym_encrypt(phone, current_setting('app.encryption_key'));

-- Remover permisos innecesarios
REVOKE ALL ON users FROM public;
REVOKE ALL ON pedidos FROM public;
REVOKE ALL ON carrito FROM public;

-- ============================================
-- SCRIPT DE INICIALIZACIÓN COMPLETA
-- ============================================

-- Ejecutar esto después de crear las tablas:
-- 1. Copiar y pegar todo el archivo
-- 2. Ir a SQL Editor en Supabase Dashboard
-- 3. Pegar todo
-- 4. Click en "RUN"

-- Verificar que todo está bien:
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;

-- Output esperado: public | users | true
--                 public | pedidos | true
--                 public | carrito | true
--                 etc.
