-- Permitir estado 'cancelado' en pedidos (para cancelar pago desde admin)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pendiente', 'completado', 'cancelado'));
