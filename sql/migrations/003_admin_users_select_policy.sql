-- Permite que un usuario autenticado consulte si su email está en admin_users (para redirigir a admin al iniciar sesión)
CREATE POLICY "Usuario puede ver si es admin" ON admin_users
  FOR SELECT
  USING (email = (auth.jwt()->>'email'));
