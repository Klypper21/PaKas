document.addEventListener('DOMContentLoaded', async () => {
  const formWrap = document.getElementById('perfil-form-wrap');
  const requireLogin = document.getElementById('perfil-require-login');
  const form = document.getElementById('perfil-form');
  const logoutBtn = document.getElementById('perfil-logout');

  const user = await Auth.getUser();
  if (!user) {
    if (formWrap) formWrap.classList.add('hidden');
    if (requireLogin) requireLogin.classList.remove('hidden');
    return;
  }

  if (requireLogin) requireLogin.classList.add('hidden');
  if (formWrap) formWrap.classList.remove('hidden');

  const profile = await Auth.getProfile(user.id);
  if (form) {
    form.full_name.value = (profile?.full_name || user.user_metadata?.full_name || '').trim();
    form.phone.value = (profile?.phone || user.user_metadata?.phone || '').trim();
    if (form.address) {
      form.address.value = (profile?.address || user.user_metadata?.address || '').trim();
    }
  }

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('perfil-error');
      errEl.textContent = '';
      errEl.style.color = '';
      const full_name = (form.full_name.value || '').trim();
      const phone = (form.phone.value || '').trim();
      const address = (form.address?.value || '').trim();
      const password = (form.password?.value || '').trim();
      const passwordConfirm = (form.password_confirm?.value || '').trim();

      if (password || passwordConfirm) {
        if (password.length < 6) {
          errEl.textContent = 'La contraseña debe tener al menos 6 caracteres.';
          return;
        }
        if (password !== passwordConfirm) {
          errEl.textContent = 'Las contraseñas no coinciden.';
          return;
        }
      }

      const { error } = await Auth.ensureProfile({ full_name, phone, address });
      if (error) {
        errEl.textContent = error;
        return;
      }

      if (password) {
        const { error: passErr } = await Auth.updatePassword(password);
        if (passErr) {
          errEl.textContent = passErr;
          return;
        }
        if (form.password) form.password.value = '';
        if (form.password_confirm) form.password_confirm.value = '';
      }

      errEl.textContent = '';
      errEl.style.color = 'var(--success)';
      errEl.textContent = password ? 'Perfil y contraseña actualizados correctamente.' : 'Perfil actualizado correctamente.';
      setTimeout(() => { errEl.textContent = ''; errEl.style.color = ''; }, 3000);
    };
  }

  if (logoutBtn) logoutBtn.onclick = () => Auth.logout();
});
