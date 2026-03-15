const Auth = {
  supabase: null,

  init() {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
      this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      window.supabase = this.supabase;
    }
  },

  async getUser() {
    if (!this.supabase) return null;
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  },

  async getSession() {
    if (!this.supabase) return null;
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  },

  async login(email, password) {
    if (!this.supabase) return { error: 'Supabase no configurado' };
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    return { data, error: error?.message };
  },

  async register(email, password, name = '', address = '') {
    if (!this.supabase) return { error: 'Supabase no configurado' };
    const options = {};
    if (name || address) {
      options.data = {};
      if (name) options.data.full_name = name;
      if (address) options.data.address = address;
    }
    const { data, error } = await this.supabase.auth.signUp({ email, password, options });
    return { data, error: error?.message };
  },

  async loginWithGoogle() {
    if (!this.supabase) return { error: 'Supabase no configurado' };
    const redirectTo = `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, '')}/index.html`;
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });
    return { data, error: error?.message };
  },

  async isAdmin() {
    if (!this.supabase) return false;
    const user = await this.getUser();
    if (!user?.email) return false;
    const { data, error } = await this.supabase
      .from('admin_users')
      .select('email')
      .eq('email', user.email)
      .maybeSingle();
    return !error && !!data;
  },

  async getProfile(userId) {
    if (!this.supabase || !userId) return null;
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    return error ? null : data;
  },

  async ensureProfile(payload) {
    if (!this.supabase) return { error: 'Supabase no configurado' };
    const user = await this.getUser();
    if (!user) return { error: 'No hay sesión' };
    const { full_name, phone } = payload || {};
    if (!full_name?.trim() || !phone?.trim()) {
      return { error: 'Nombre y teléfono son obligatorios' };
    }
    const { error } = await this.supabase.from('profiles').upsert(
      {
        user_id: user.id,
        full_name: full_name.trim(),
        phone: phone.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    return { error: error?.message };
  },

  async logout() {
    if (this.supabase) await this.supabase.auth.signOut();
    localStorage.removeItem('cart');
    location.href = 'index.html';
  },

  onAuthChange(callback) {
    if (!this.supabase) return;
    this.supabase.auth.onAuthStateChange((event, session) => callback(session));
  }
};
