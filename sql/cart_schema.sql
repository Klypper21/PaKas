-- Tabla para guardar carritos por usuario
CREATE TABLE IF NOT EXISTS user_carts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB DEFAULT '[]'::JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índice para búsquedas rápidas por usuario
CREATE INDEX IF NOT EXISTS idx_user_carts_user_id ON user_carts(user_id);

-- Retorna 1 si el email ya existe
CREATE OR REPLACE FUNCTION email_exists(email_address TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(SELECT 1 FROM auth.users WHERE email = email_address);
END $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Retorna 1 si el teléfono ya existe
CREATE OR REPLACE FUNCTION phone_exists(phone_number TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(SELECT 1 FROM auth.users WHERE phone = phone_number);
END $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar timestamp updated_at automáticamente
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
