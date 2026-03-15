-- Migración: imágenes extras, calificaciones y reseñas de productos
-- Ejecuta en SQL Editor de Supabase si ya tienes el schema base

-- Columna para imágenes adicionales (array de URLs en JSON)
ALTER TABLE products ADD COLUMN IF NOT EXISTS extra_images JSONB DEFAULT '[]';

-- Tabla de reseñas de productos
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- RLS
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer reseñas
CREATE POLICY "Reseñas visibles para todos" ON product_reviews FOR SELECT USING (true);

-- Usuarios autenticados pueden crear reseñas (una por producto)
CREATE POLICY "Usuario puede crear reseña" ON product_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuarios solo pueden editar/borrar su propia reseña
CREATE POLICY "Usuario edita su reseña" ON product_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuario borra su reseña" ON product_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);
