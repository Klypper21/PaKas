-- Schema para tienda de ropa PaKas
-- Ejecuta este script en el SQL Editor de Supabase

-- Tabla de productos
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT DEFAULT 'https://placehold.co/400x500/1a1a2e/eaeaea?text=Producto',
  extra_images JSONB DEFAULT '[]',
  category TEXT NOT NULL,
  stock INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reseñas visibles" ON product_reviews FOR SELECT USING (true);
CREATE POLICY "Usuario crea reseña" ON product_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuario edita su reseña" ON product_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuario borra su reseña" ON product_reviews FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);

-- Tabla de pedidos (estado: pendiente = esperando transferencia, completado = pagado)
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'completado')),
  transfer_reference TEXT,
  bank_details TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de items del pedido
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL
);

-- Tabla de administradores (emails con acceso al panel admin)
CREATE TABLE IF NOT EXISTS admin_users (
  email TEXT PRIMARY KEY
);

-- RLS: Habilitar políticas
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Products: todos pueden leer
CREATE POLICY "Productos visibles para todos" ON products FOR SELECT USING (true);

-- Orders: usuario solo ve sus pedidos
CREATE POLICY "Usuario ve sus pedidos" ON orders FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Usuario puede crear pedidos" ON orders FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Order items: usuario ve items de sus pedidos
CREATE POLICY "Usuario ve items de sus pedidos" ON order_items FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Usuario puede crear order items" ON order_items FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
  ));

-- Admin: puede ver/actualizar todos los pedidos (solo si está en admin_users)
CREATE POLICY "Admin ve todos los pedidos" ON orders FOR ALL 
  USING (EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt()->>'email'));

CREATE POLICY "Admin ve order items" ON order_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt()->>'email'));

-- Insertar admin (reemplaza con tu email)
INSERT INTO admin_users (email) VALUES ('klypper21@gmail.com') ON CONFLICT (email) DO NOTHING;

-- Productos de ejemplo
INSERT INTO products (name, description, price, category) VALUES
  ('Camiseta Básica', 'Camiseta de algodón 100% orgánico', 24.99, 'camisetas'),
  ('Jeans Slim Fit', 'Vaqueros cómodos corte slim', 59.99, 'pantalones'),
  ('Sudadera Oversize', 'Sudadera amplia y suave', 44.99, 'sudaderas'),
  ('Vestido Casual', 'Vestido perfecto para el día a día', 39.99, 'vestidos'),
  ('Chaqueta Denim', 'Chaqueta vaquera clásica', 79.99, 'chaquetas')
ON CONFLICT DO NOTHING;
