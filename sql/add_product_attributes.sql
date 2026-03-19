-- Agregar columnas para atributos de productos
ALTER TABLE products ADD COLUMN IF NOT EXISTS colores TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS talla TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS material TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS recomendaciones TEXT;

-- La columna description se usa para la descripción general del admin