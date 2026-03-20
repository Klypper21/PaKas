-- =====================================================
-- TABLA DE VARIACIONES DE PRODUCTOS (Parent-Child)
-- Estilo Amazon: Un producto base puede tener múltiples
-- combinaciones de talla/color con SKU y stock independiente
-- =====================================================

-- Tabla principal de variaciones
CREATE TABLE IF NOT EXISTS product_variations (
  id BIGSERIAL PRIMARY KEY,
  parent_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(50),
  talla VARCHAR(50),
  stock INTEGER DEFAULT 0 NOT NULL,
  price DECIMAL(10, 2),
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices para búsquedas rápidas
  CONSTRAINT fk_parent_product FOREIGN KEY (parent_product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_variations_parent_id ON product_variations(parent_product_id);
CREATE INDEX IF NOT EXISTS idx_variations_sku ON product_variations(sku);
CREATE INDEX IF NOT EXISTS idx_variations_color_talla ON product_variations(parent_product_id, color, talla);

-- Tabla para rastrear atributos disponibles por producto
-- (para acelerar renderizado de selectores)
CREATE TABLE IF NOT EXISTS product_variation_attributes (
  id BIGSERIAL PRIMARY KEY,
  parent_product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  colors JSONB DEFAULT '[]'::JSONB,  -- Array de colores disponibles
  tallas JSONB DEFAULT '[]'::JSONB,  -- Array de tallas disponibles
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variation_attributes_parent_id ON product_variation_attributes(parent_product_id);

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_product_variations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

-- Trigger para actualizar timestamp automáticamente
CREATE TRIGGER trigger_product_variations_timestamp
BEFORE UPDATE ON product_variations
FOR EACH ROW
EXECUTE FUNCTION update_product_variations_timestamp();

-- Función para obtener todas las variaciones de un producto (con filtros opcionales)
CREATE OR REPLACE FUNCTION get_product_variations(
  p_product_id UUID,
  p_color VARCHAR(50) DEFAULT NULL,
  p_talla VARCHAR(50) DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  sku VARCHAR(100),
  color VARCHAR(50),
  talla VARCHAR(50),
  stock INTEGER,
  price DECIMAL,
  image_url TEXT,
  in_stock BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pv.id,
    pv.sku,
    pv.color,
    pv.talla,
    pv.stock,
    COALESCE(pv.price, p.price) as price,
    pv.image_url,
    pv.stock > 0 as in_stock
  FROM product_variations pv
  JOIN products p ON pv.parent_product_id = p.id
  WHERE pv.parent_product_id = p_product_id
    AND (p_color IS NULL OR pv.color = p_color)
    AND (p_talla IS NULL OR pv.talla = p_talla);
END;
$$ LANGUAGE plpgsql;

-- Función para buscar una variación exacta por color y talla
CREATE OR REPLACE FUNCTION find_variation_by_attributes(
  p_product_id UUID,
  p_color VARCHAR(50),
  p_talla VARCHAR(50)
)
RETURNS TABLE (
  id BIGINT,
  sku VARCHAR(100),
  stock INTEGER,
  price DECIMAL,
  image_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pv.id,
    pv.sku,
    pv.stock,
    COALESCE(pv.price, p.price) as price,
    pv.image_url
  FROM product_variations pv
  JOIN products p ON pv.parent_product_id = p.id
  WHERE pv.parent_product_id = p_product_id
    AND pv.color = p_color
    AND pv.talla = p_talla
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Insertar algunas variaciones de ejemplo (OPCIONAL - descomentar después de probar)
/*
-- Ejemplo: Producto base ID = 1 (una camiseta)
INSERT INTO product_variations (parent_product_id, sku, color, talla, stock, price)
VALUES 
  (1, 'TSHIRT-RED-S', 'Rojo', 'S', 15, 25.00),
  (1, 'TSHIRT-RED-M', 'Rojo', 'M', 20, 25.00),
  (1, 'TSHIRT-RED-L', 'Rojo', 'L', 10, 25.00),
  (1, 'TSHIRT-BLUE-S', 'Azul', 'S', 8, 25.00),
  (1, 'TSHIRT-BLUE-M', 'Azul', 'M', 0, 25.00),   -- Agotado
  (1, 'TSHIRT-BLUE-L', 'Azul', 'L', 12, 25.00),
  (1, 'TSHIRT-BLACK-S', 'Negro', 'S', 25, 28.00),
  (1, 'TSHIRT-BLACK-M', 'Negro', 'M', 18, 28.00),
  (1, 'TSHIRT-BLACK-L', 'Negro', 'L', 5, 28.00);
*/
