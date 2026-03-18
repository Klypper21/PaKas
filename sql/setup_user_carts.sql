-- ============================================
-- ELIMINACIÓN (CUIDADO: ESTO BORRA LOS DATOS)
-- ============================================
DROP TABLE IF EXISTS user_carts CASCADE;

-- ============================================
-- CREAR TABLA user_carts
-- ============================================
CREATE TABLE user_carts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  items JSONB DEFAULT '[]'::JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_user_carts_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Crear índice para búsquedas rápidas
CREATE INDEX idx_user_carts_user_id ON user_carts(user_id);

-- Crear trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_user_carts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_carts_timestamp
BEFORE UPDATE ON user_carts
FOR EACH ROW
EXECUTE FUNCTION update_user_carts_timestamp();

-- ============================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE user_carts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREAR POLÍTICAS RLS
-- ============================================

-- Permitir que los usuarios vean su propio carrito
CREATE POLICY "Ver carrito propio" ON user_carts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Permitir que los usuarios inserten su propio carrito
CREATE POLICY "Insertar carrito propio" ON user_carts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Permitir que los usuarios actualicen su propio carrito
CREATE POLICY "Actualizar carrito propio" ON user_carts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Permitir que los usuarios eliminen su propio carrito
CREATE POLICY "Eliminar carrito propio" ON user_carts
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- NOTA: Ejecuta este script en orden:
-- 1. Ve a tu proyecto Supabase
-- 2. SQL Editor
-- 3. Copia TODO este script
-- 4. Ejecuta
-- 5. Recarga la página de tu tienda
-- 6. Agrega un producto y debería guardarse
-- ============================================
