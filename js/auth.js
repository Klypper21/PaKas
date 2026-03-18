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
  async login(identifier, password) {
    if (!this.supabase) return { error: 'Supabase no configurado' };
    const isEmail = typeof identifier === 'string' && identifier.includes('@');
    const payload = isEmail ? { email: identifier } : { phone: identifier };
    const { data, error } = await this.supabase.auth.signInWithPassword({
      ...payload,
      password,
    });
    return { data, error: error?.message };
  },

  async register(identifier, password, name = '', address = '', phone = '') {
    if (!this.supabase) return { error: 'Supabase no configurado' };
    const isEmail = typeof identifier === 'string' && identifier.includes('@');
    const authPayload = isEmail ? { email: identifier } : { phone: identifier };
    const options = {};
    
    console.log('Register starting:', { identifier, isEmail, phone });
    
    const cleanIdentifier = (identifier || '').trim();
    const cleanPhone = (phone || '').trim();
    
    // PRE-VALIDACIÓN: Verificar si el email ya existe usando función RPC pública
    if (isEmail) {
      try {
        console.log('Checking if email exists:', cleanIdentifier);
        const { data: emailExists, error: emailCheckError } = await this.supabase.rpc('email_exists', {
          email_address: cleanIdentifier
        });
        
        console.log('Email check result:', { emailExists, emailCheckError });
        
        if (!emailCheckError && emailExists === true) {
          console.error('Email already registered');
          return { error: 'Este correo electrónico ya está registrado.' };
        }
      } catch (e) {
        console.error('Error checking email with RPC:', e);
        // Continuar de todas formas, Supabase lo validará
      }
    }
    
    // PRE-VALIDACIÓN: Verificar si el teléfono ya existe usando función RPC pública
    if (cleanPhone) {
      try {
        console.log('Checking if phone exists:', cleanPhone);
        const { data: phoneExists, error: phoneCheckError } = await this.supabase.rpc('phone_exists', {
          phone_number: cleanPhone
        });
        
        console.log('Phone check result:', { phoneExists, phoneCheckError });
        
        if (!phoneCheckError && phoneExists === true) {
          console.error('Phone already registered');
          return { error: 'Este número de teléfono ya está registrado.' };
        }
      } catch (e) {
        console.error('Error checking phone with RPC:', e);
        // Continuar de todas formas, el constraint lo validará
      }
    }
    
    if (isEmail) {
      try {
        options.emailRedirectTo = 'https://klypper21.github.io/PaKas/confirmacion.html';
      } catch (_) {
        // Sin hacer nada si falla
      }
    }
    
    // Guardar datos en metadatos
    if (name || address || cleanPhone) {
      options.data = {};
      if (name) options.data.full_name = name;
      if (address) options.data.address = address;
      if (cleanPhone) options.data.phone = cleanPhone;
    }

    const { data, error } = await this.supabase.auth.signUp({
      ...authPayload,
      password,
      options,
    });
    
    console.log('SignUp result:', { userId: data?.user?.id, error });
    
    if (error) {
      const errorMsg = error?.message || '';
      const errorLower = errorMsg.toLowerCase();
      if (errorLower.includes('email') || errorLower.includes('already') || errorLower.includes('duplicate')) {
        return { error: 'Este correo electrónico ya está registrado.' };
      }
      return { error: errorMsg };
    }

    console.log('Profile will be created automatically by database trigger');
    
    return { data, error: null };
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
    const { full_name, phone, address } = payload || {};
    if (!full_name?.trim() || !phone?.trim()) {
      return { error: 'Nombre y teléfono son obligatorios' };
    }
    
    const cleanPhone = phone.trim();
    const addr = (address || '').trim();
    
    // PASO 1: Validar que el teléfono no exista (lectura pública para validación)
    try {
      const { data: phoneUsers, error: phoneCheckError } = await this.supabase
        .from('profiles')
        .select('user_id')
        .eq('phone', cleanPhone);
      
      console.log('Phone check result:', { phoneUsers, phoneCheckError });
      
      if (phoneUsers && phoneUsers.length > 0) {
        // Verificar que no sea el usuario actual
        const isOtherUser = phoneUsers.some(p => p.user_id !== user.id);
        if (isOtherUser) {
          console.error('Phone already exists for another user');
          return { error: 'Este número de teléfono ya está registrado.' };
        }
      }
    } catch (e) {
      console.error('Error checking phone:', e);
    }
    
    // PASO 2: Verificar si ya existe un perfil para este usuario
    const { data: existingProfile, error: checkError } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    console.log('Existing profile check:', { existingProfile, checkError });
    
    let error;
    
    if (existingProfile) {
      // PASO 3A: Actualizar perfil existente
      console.log('Updating existing profile...');
      const { error: updateError } = await this.supabase
        .from('profiles')
        .update({
          full_name: full_name.trim(),
          phone: cleanPhone,
          ...(addr ? { address: addr } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      
      console.log('Update result:', { updateError });
      error = updateError;
    } else {
      // PASO 3B: Crear nuevo perfil
      console.log('Creating new profile...');
      const { error: insertError } = await this.supabase
        .from('profiles')
        .insert([{
          user_id: user.id,
          full_name: full_name.trim(),
          phone: cleanPhone,
          ...(addr ? { address: addr } : {}),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);
      
      console.log('Insert result:', { insertError });
      error = insertError;
    }
    
    if (error) {
      const errorMsg = error?.message || '';
      const errorLower = errorMsg.toLowerCase();
      
      console.error('Profile save error:', { errorMsg, error });
      
      // Detectar error de teléfono duplicado
      if (errorLower.includes('phone') || errorLower.includes('unique') || errorLower.includes('duplicate')) {
        return { error: 'Este número de teléfono ya está registrado.' };
      }
      
      return { error: errorMsg || 'Error al guardar el perfil. Intenta nuevamente.' };
    }

    // Guardar dirección en metadatos del usuario
    if (addr) {
      const { error: metaErr } = await this.supabase.auth.updateUser({
        data: { ...(user.user_metadata || {}), address: addr, full_name: full_name.trim() },
      });
      if (metaErr) return { error: metaErr?.message };
    }
    console.log('Profile saved successfully');
    return { error: null };
  },

  async updatePassword(newPassword) {
    if (!this.supabase) return { error: 'Supabase no configurado' };
    const pwd = (newPassword || '').trim();
    if (pwd.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres' };
    const { error } = await this.supabase.auth.updateUser({ password: pwd });
    return { error: error?.message || null };
  },

  async logout() {
    if (this.supabase) await this.supabase.auth.signOut();
    localStorage.removeItem('cart');
    location.href = 'index.html';
  },

  onAuthChange(callback) {
    if (!this.supabase) return;
    this.supabase.auth.onAuthStateChange((event, session) => callback(session?.user ?? null));
  }
};
