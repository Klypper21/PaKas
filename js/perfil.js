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
    form.phone.value = (profile?.phone || '').trim();
  }

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('perfil-error');
      errEl.textContent = '';
      const full_name = (form.full_name.value || '').trim();
      const phone = (form.phone.value || '').trim();
      const { error } = await Auth.ensureProfile({ full_name, phone });
      if (error) {
        errEl.textContent = error;
        return;
      }
      errEl.textContent = '';
      errEl.style.color = 'var(--success)';
      errEl.textContent = 'Perfil actualizado correctamente.';
      setTimeout(() => { errEl.textContent = ''; errEl.style.color = ''; }, 3000);
    };
  }

  if (logoutBtn) logoutBtn.onclick = () => Auth.logout();
});
