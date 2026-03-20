-- =====================================================
-- DATOS DE EJEMPLO PARA VARIACIONES DE PRODUCTOS
-- Copia y pega estos ejemplos en Supabase SQL Editor
-- =====================================================

-- EJEMPLO 1: Camiseta con múltiples colores y tallas
-- Reemplaza 'ID_PRODUCTO_BASE' con el ID real de tu producto
INSERT INTO product_variations (parent_product_id, sku, color, talla, stock, price)
VALUES 
  (1, 'TSHIRT-RED-XS', 'Rojo', 'XS', 5, 25.00),
  (1, 'TSHIRT-RED-S', 'Rojo', 'S', 15, 25.00),
  (1, 'TSHIRT-RED-M', 'Rojo', 'M', 20, 25.00),
  (1, 'TSHIRT-RED-L', 'Rojo', 'L', 10, 25.00),
  (1, 'TSHIRT-RED-XL', 'Rojo', 'XL', 3, 25.00),
  
  (1, 'TSHIRT-BLUE-XS', 'Azul', 'XS', 8, 25.00),
  (1, 'TSHIRT-BLUE-S', 'Azul', 'S', 8, 25.00),
  (1, 'TSHIRT-BLUE-M', 'Azul', 'M', 12, 25.00),
  (1, 'TSHIRT-BLUE-L', 'Azul', 'L', 6, 25.00),
  (1, 'TSHIRT-BLUE-XL', 'Azul', 'XL', 0, 25.00),  -- AGOTADO
  
  (1, 'TSHIRT-BLACK-XS', 'Negro', 'XS', 18, 28.00),  -- PRECIO DIFERENTE
  (1, 'TSHIRT-BLACK-S', 'Negro', 'S', 25, 28.00),
  (1, 'TSHIRT-BLACK-M', 'Negro', 'M', 18, 28.00),
  (1, 'TSHIRT-BLACK-L', 'Negro', 'L', 12, 28.00),
  (1, 'TSHIRT-BLACK-XL', 'Negro', 'XL', 8, 28.00),
  
  (1, 'TSHIRT-GREEN-S', 'Verde', 'S', 0, 25.00),    -- AGOTADO EN UNA TALLA
  (1, 'TSHIRT-GREEN-M', 'Verde', 'M', 9, 25.00),
  (1, 'TSHIRT-GREEN-L', 'Verde', 'L', 7, 25.00);

-- EJEMPLO 2: Jeans con diferentes estilos de lavado
INSERT INTO product_variations (parent_product_id, sku, color, talla, stock, price)
VALUES 
  (2, 'JEANS-DARK-W28', 'Azul Oscuro', '28', 12, 45.00),
  (2, 'JEANS-DARK-W30', 'Azul Oscuro', '30', 18, 45.00),
  (2, 'JEANS-DARK-W32', 'Azul Oscuro', '32', 15, 45.00),
  (2, 'JEANS-DARK-W34', 'Azul Oscuro', '34', 8, 45.00),
  (2, 'JEANS-LIGHT-W28', 'Azul Claro', '28', 5, 50.00),   -- Más caro
  (2, 'JEANS-LIGHT-W30', 'Azul Claro', '30', 10, 50.00),
  (2, 'JEANS-LIGHT-W32', 'Azul Claro', '32', 0, 50.00),   -- Agotado
  (2, 'JEANS-LIGHT-W34', 'Azul Claro', '34', 6, 50.00);

-- EJEMPLO 3: Zapatillas deportivas (colores limitados)
INSERT INTO product_variations (parent_product_id, sku, color, talla, stock, price)
VALUES 
  (3, 'SHOES-BLACK-6', 'Negro', 'US 6', 3, 65.00),
  (3, 'SHOES-BLACK-7', 'Negro', 'US 7', 5, 65.00),
  (3, 'SHOES-BLACK-8', 'Negro', 'US 8', 8, 65.00),
  (3, 'SHOES-BLACK-10', 'Negro', 'US 10', 2, 65.00),
  (3, 'SHOES-BLACK-12', 'Negro', 'US 12', 0, 65.00),  -- AGOTADO
  
  (3, 'SHOES-WHITE-6', 'Blanco', 'US 6', 8, 65.00),
  (3, 'SHOES-WHITE-7', 'Blanco', 'US 7', 12, 65.00),
  (3, 'SHOES-WHITE-8', 'Blanco', 'US 8', 10, 65.00),
  (3, 'SHOES-WHITE-10', 'Blanco', 'US 10', 6, 65.00),
  
  (3, 'SHOES-RED-8', 'Rojo', 'US 8', 4, 75.00),    -- EDICIÓN LIMITADA (más cara)
  (3, 'SHOES-RED-10', 'Rojo', 'US 10', 2, 75.00);

-- EJEMPLO 4: Sombreros (atributo: tamaño)
INSERT INTO product_variations (parent_product_id, sku, color, talla, stock, price)
VALUES 
  (4, 'HAT-BLACK-ONESIZE', 'Negro', 'One Size', 50, 15.00),
  (4, 'HAT-NAVY-ONESIZE', 'Azul Marino', 'One Size', 35, 15.00),
  (4, 'HAT-BEIGE-ONESIZE', 'Beige', 'One Size', 25, 15.00),
  (4, 'HAT-GRAY-ONESIZE', 'Gris', 'One Size', 0, 15.00);  -- AGOTADO

-- EJEMPLO 5: Accesorios con múltiples atributos
INSERT INTO product_variations (parent_product_id, sku, color, talla, stock, price)
VALUES 
  (5, 'SCARF-WOOL-RED', 'Rojo', 'Lana', 20, 22.00),
  (5, 'SCARF-WOOL-BLUE', 'Azul', 'Lana', 18, 22.00),
  (5, 'SCARF-WOOL-GREEN', 'Verde', 'Lana', 15, 22.00),
  (5, 'SCARF-COTTON-RED', 'Rojo', 'Algodón', 30, 15.00),
  (5, 'SCARF-COTTON-BLUE', 'Azul', 'Algodón', 25, 15.00),
  (5, 'SCARF-COTTON-GREEN', 'Verde', 'Algodón', 0, 15.00);

-- =====================================================
-- CONSULTAS ÚTILES PARA GESTIONAR VARIACIONES
-- =====================================================

-- Ver todas las variaciones de un producto
-- SELECT * FROM product_variations WHERE parent_product_id = 1;

-- Ver variaciones agotadas
-- SELECT * FROM product_variations WHERE stock = 0 ORDER BY parent_product_id;

-- Ver stock total por producto
-- SELECT parent_product_id, SUM(stock) as total_stock FROM product_variations GROUP BY parent_product_id;

-- Actualizar el stock de una variación específica
-- UPDATE product_variations SET stock = 50 WHERE sku = 'TSHIRT-RED-S';

-- Eliminar una variación
-- DELETE FROM product_variations WHERE sku = 'TSHIRT-RED-S';

-- Ver qué colores están disponibles para un producto
-- SELECT DISTINCT color FROM product_variations WHERE parent_product_id = 1 ORDER BY color;

-- Ver qué tallas hay para un color específico
-- SELECT DISTINCT talla FROM product_variations WHERE parent_product_id = 1 AND color = 'Rojo' ORDER BY talla;

-- Bajar 1 unidad de stock (simular venta)
-- UPDATE product_variations SET stock = stock - 1 WHERE sku = 'TSHIRT-RED-S' AND stock > 0;
