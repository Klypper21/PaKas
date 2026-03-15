-- Perfiles de usuario (nombre y teléfono obligatorios para reseñas y pedidos)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario ve su perfil" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuario inserta su perfil" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuario actualiza su perfil" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- Nombre del usuario en reseñas (para mostrar en listado)
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Nombre y teléfono del usuario en pedidos (para admin y listados)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_phone TEXT;
