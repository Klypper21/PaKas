document.addEventListener('DOMContentLoaded', async () => {
  Auth.init();

  const titleEl = document.getElementById('confirm-title');
  const subtitleEl = document.getElementById('confirm-subtitle');
  const statusEl = document.getElementById('confirm-status');
  const btnLogin = document.getElementById('btn-go-login');

  const setState = ({ title, subtitle, status, variant = 'loading', showLogin = false } = {}) => {
    if (titleEl && typeof title === 'string') titleEl.textContent = title;
    if (subtitleEl && typeof subtitle === 'string') subtitleEl.textContent = subtitle;
    if (statusEl && typeof status === 'string') statusEl.textContent = status;
    if (statusEl) statusEl.className = `confirm-status confirm-status--${variant}`;
    if (btnLogin) btnLogin.style.display = showLogin ? '' : 'none';
  };

  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const urlErr = url.searchParams.get('error') || url.searchParams.get('error_code');
  const urlErrDesc = url.searchParams.get('error_description');

  try {
    if (!Auth.supabase) {
      setState({
        title: 'Supabase no configurado',
        subtitle: 'No se puede completar la confirmación.',
        status: 'Configura `js/config.js` y vuelve a intentar.',
        variant: 'error',
        showLogin: false,
      });
      return;
    }

    if (urlErr || urlErrDesc) {
      setState({
        title: 'No se pudo confirmar el correo',
        subtitle: 'El enlace parece inválido o expiró.',
        status: decodeURIComponent(urlErrDesc || urlErr || 'Intenta solicitar un nuevo enlace.'),
        variant: 'error',
        showLogin: true,
      });
      return;
    }

    // Enlaces modernos de Supabase usan PKCE y pasan ?code=...
    if (code) {
      const { error } = await Auth.supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setState({
          title: 'No se pudo confirmar el correo',
          subtitle: 'El enlace puede haber expirado.',
          status: error.message || 'Intenta de nuevo.',
          variant: 'error',
          showLogin: true,
        });
        return;
      }
    }

    const user = await Auth.getUser();
    const email = user?.email || '';

    // Si el registro fue por correo, al confirmar ya hay sesión:
    // completar automáticamente el perfil (full_name/phone/address) desde metadata si falta en `profiles`.
    if (user?.id && Auth.supabase) {
      try {
        const profile = await Auth.getProfile(user.id);
        const meta = user.user_metadata || {};
        const metaName = (meta.full_name || '').trim();
        const metaPhone = (meta.phone || '').trim();
        const metaAddress = (meta.address || '').trim();

        const missingName = !profile?.full_name?.trim();
        const missingPhone = !profile?.phone?.trim();
        if ((missingName || missingPhone) && metaName && metaPhone) {
          await Auth.ensureProfile({ full_name: metaName, phone: metaPhone, address: metaAddress });
        }
      } catch (_) {
        // Silencioso: la confirmación debe seguir aunque no se pueda completar el perfil.
      }
    }

    setState({
      title: '¡Correo confirmado!',
      subtitle: email ? `Sesión iniciada como ${email}` : 'Tu cuenta ya está activa.',
      status: 'Gracias por formar parte de PaKas.',
      variant: 'success',
      showLogin: !user,
    });

    if (window.UI?.toast) UI.toast('Cuenta confirmada. Bienvenido/a a PaKas.', 'success', { durationMs: 2600 });
  } catch (err) {
    console.error(err);
    setState({
      title: 'Ocurrió un error',
      subtitle: 'No pudimos completar la confirmación.',
      status: 'Vuelve a abrir el enlace o intenta iniciar sesión.',
      variant: 'error',
      showLogin: true,
    });
  }
});

