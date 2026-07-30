// =============================================================
// Authenticated cloud sync module.
//
// Provides shared Supabase Auth (email + password) and
// authenticated sync via the user_app_state table (RLS-protected
// per-user rows).
//
// Exposes window.auth with:
//   .user           — { id, email } or null
//   .ready          — true after initial session check
//   .supa           — shared Supabase client
//   .signIn(e,p)    — sign in with email + password
//   .signUp(e,p)    — create account
//   .signOut()      — sign out
//   .initSync(cfg)  — like the old initCloudSync but authenticated
//   .onAuthChange(fn) — register callback for auth state changes
//
// Load after <script src="/api/config"></script> and the Supabase
// CDN include, e.g.:
//   <script src="sync.js" defer></script>
//   <script src="auth-sync.js" defer></script>
//
// Secrets (WHOOP tokens, NIM API key) are NEVER synced.
// =============================================================
(function () {
  'use strict';

  /* ---------- Supabase config ---------- */
  const SUPABASE_URL = (typeof window !== 'undefined' && window.DASH_SUPABASE_URL) || 'https://srajryooffirbroltjmg.supabase.co';
  const SUPABASE_KEY = (typeof window !== 'undefined' && window.DASH_SUPABASE_KEY) || 'sb_publishable_5142ZwTLF_DkSVRzciNuRA_bHwRAu4c';

  /* ---------- Secrets never synced ---------- */
  const SECRET_KEYS = new Set([
    'whoop_tokens_v1',
    'whoop_last_sync',
    'nova_lite_api_key'
  ]);

  function isAllowed(k) {
    return !SECRET_KEYS.has(k);
  }

  /* ---------- Auth module ---------- */
  var auth = {
    user: null,
    ready: false,
    supa: null,
    _cbs: [],
    _configs: [],
    _channels: [],
    _pushTimers: {},
    _lastSyncedJson: {},
    _suppress: false,
    _origSet: null,
    _origRemove: null,
    _booted: false,
    _activated: {},
    _matched: {},

    onAuthChange: function (fn) {
      this._cbs.push(fn);
    },

    _notify: function () {
      for (var i = 0; i < this._cbs.length; i++) {
        try { this._cbs[i](this.user); } catch (e) {}
      }
    },

    signIn: async function (email, password) {
      if (!this.supa) return { error: new Error('Supabase not available') };
      try {
        var res = await this.supa.auth.signInWithPassword({ email: email, password: password });
        return { error: res.error };
      } catch (e) {
        return { error: e };
      }
    },

    signUp: async function (email, password) {
      if (!this.supa) return { error: new Error('Supabase not available') };
      try {
        var res = await this.supa.auth.signUp({ email: email, password: password });
        // Even with confirmation disabled, the user may already
        // exist — the error property tells us.
        return { error: res.error };
      } catch (e) {
        return { error: e };
      }
    },

    signOut: async function () {
      var self = this;
      // Clear push timers
      for (var k in self._pushTimers) {
        clearTimeout(self._pushTimers[k]);
      }
      self._pushTimers = {};
      self._lastSyncedJson = {};
      // The SIGNED_OUT handler in onAuthStateChange closes channels
      try { await self.supa.auth.signOut(); } catch (e) {}
      self.user = null;
      self._notify();
    },

    /* ---------- initSync ---------- */
    initSync: function (config) {
      var self = this;
      if (!config || !config.appKey) return;
      // Always register the config so _doPush and _flushNow can find it
      self._configs.push(config);
      if (self._booted) {
        self._activateSync(config);
      }
    },

    _activateSync: function (config) {
      var self = this;
      var appKey = config.appKey;
      var syncedKeys = config.syncedKeys || [];
      var syncedPrefixes = config.syncedPrefixes || [];
      var onApplied = config.onApplied;
      var transformPush = config.transformPush;

      // Guard against double-activation (e.g. onAuthStateChange + boot)
      if (self._activated[appKey]) return;
      self._activated[appKey] = true;

      // Track what this config owns (for monkey-patch + cross-tab events)
      self._matched[appKey] = { keys: syncedKeys, prefixes: syncedPrefixes };

      // Set up localStorage monkey-patch (once) — checks ALL configs
      if (!self._origSet) {
        self._origSet = localStorage.setItem.bind(localStorage);
        self._origRemove = localStorage.removeItem.bind(localStorage);
        localStorage.setItem = function (k, v) {
          self._origSet(k, v);
          try {
            if (!self._suppress && isAllowed(k) && self.user) {
              var apps = self._matchingAppKeys(k);
              for (var i = 0; i < apps.length; i++) {
                self._schedulePush(apps[i]);
              }
            }
          } catch (e) {}
        };
        localStorage.removeItem = function (k) {
          self._origRemove(k);
          try {
            if (!self._suppress && isAllowed(k) && self.user) {
              var apps = self._matchingAppKeys(k);
              for (var i = 0; i < apps.length; i++) {
                self._schedulePush(apps[i]);
              }
            }
          } catch (e) {}
        };
      }

      // Do initial pull & subscribe
      self._initPull(appKey, syncedKeys, syncedPrefixes, onApplied, transformPush);

      // Subscribe to storage events from other tabs (once)
      if (!self._storageListener) {
        self._storageListener = function (e) {
          if (e.key) {
            var apps = self._matchingAppKeys(e.key);
            for (var i = 0; i < apps.length; i++) {
              self._schedulePush(apps[i]);
            }
          }
        };
        window.addEventListener('storage', self._storageListener);
      }

      // Flush on page unload (once — iterates all configs)
      if (!self._flushBound) {
        self._flushBound = function () { self._flushNow(); };
        window.addEventListener('beforeunload', self._flushBound);
        window.addEventListener('pagehide', self._flushBound);
      }
    },

    // Find which appKeys' configs match the given localStorage key
    _matchingAppKeys: function (k) {
      var out = [];
      for (var ak in this._matched) {
        var m = this._matched[ak];
        if (this._matchesAny(k, m.keys, m.prefixes)) out.push(ak);
      }
      return out;
    },

    _matchesAny: function (k, keys, prefixes) {
      if (keys.indexOf(k) !== -1) return true;
      for (var i = 0; i < prefixes.length; i++) {
        if (k.indexOf(prefixes[i]) === 0) return true;
      }
      return false;
    },

    // Store last matched keys/prefixes per appKey for cross-tab storage handling
    _matched: {},

    _isMatched: function (k) {
      // Check against all active configs
      for (var ak in this._matched) {
        if (this._matchesAny(k, this._matched[ak].keys, this._matched[ak].prefixes)) return true;
      }
      return false;
    },

    _listAllKeys: function (configKeys, configPrefixes) {
      var out = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && this._matchesAny(k, configKeys, configPrefixes) && isAllowed(k)) out.push(k);
      }
      return out;
    },

    _collect: function (configKeys, configPrefixes) {
      var out = {};
      var list = this._listAllKeys(configKeys, configPrefixes);
      for (var i = 0; i < list.length; i++) {
        var k = list[i];
        var v = localStorage.getItem(k);
        if (v == null) continue;
        try { out[k] = JSON.parse(v); } catch (e) { out[k] = v; }
      }
      return out;
    },

    _initPull: function (appKey, syncedKeys, syncedPrefixes, onApplied, transformPush) {
      var self = this;
      if (!self.supa || !self.user) return;

      (async function () {
        try {
          var { data, error } = await self.supa
            .from('user_app_state')
            .select('data')
            .eq('user_id', self.user.id)
            .eq('key', appKey)
            .maybeSingle();

          if (!error && data && data.data && Object.keys(data.data).length > 0) {
            // Cloud data exists — apply to local
            self._lastSyncedJson[appKey] = JSON.stringify(data.data);
            self._applyRemote(data.data, syncedKeys, syncedPrefixes, onApplied);
          } else if (self._listAllKeys(syncedKeys, syncedPrefixes).length > 0) {
            // Local data exists but no cloud data — schedule push
            // (initial upload is checked separately below)
            self._schedulePush(appKey);
          }
        } catch (e) {}

        // Try initial upload once
        try {
          await self._maybeInitialUpload();
        } catch (e) {}

        // Subscribe to realtime
        try {
          var channel = self.supa.channel('user_state_' + appKey + '_' + self.user.id)
            .on('postgres_changes', {
              event: '*',
              schema: 'public',
              table: 'user_app_state',
              filter: 'user_id=eq.' + self.user.id
            }, function (payload) {
              if (!payload.new || !payload.new.data) return;
              if (payload.new.key !== appKey) return;
              var incoming = JSON.stringify(payload.new.data);
              if (incoming === self._lastSyncedJson[appKey]) return;
              self._lastSyncedJson[appKey] = incoming;
              self._applyRemote(payload.new.data, syncedKeys, syncedPrefixes, onApplied);
            })
            .subscribe();
          self._channels.push(channel);
        } catch (e) {}
      })();
    },

    _maybeInitialUpload: async function () {
      var self = this;
      if (!self.supa || !self.user) return;
      // Check if this account has any rows at all
      try {
        var { data, error } = await self.supa
          .from('user_app_state')
          .select('key')
          .eq('user_id', self.user.id)
          .limit(1);
        if (error) return;
        if (data && data.length > 0) return; // Already has cloud data

        // Check if any config has local data worth backing up
        var hasLocal = false;
        for (var i = 0; i < self._configs.length; i++) {
          var cfg = self._configs[i];
          var cfgKeys = cfg.syncedKeys || [];
          var cfgPrefixes = cfg.syncedPrefixes || [];
          for (var j = 0; j < cfgKeys.length; j++) {
            if (localStorage.getItem(cfgKeys[j]) && isAllowed(cfgKeys[j])) {
              hasLocal = true;
              break;
            }
          }
          if (!hasLocal) {
            for (var j = 0; j < localStorage.length; j++) {
              var lk = localStorage.key(j);
              if (lk && self._matchesAny(lk, cfgKeys, cfgPrefixes) && isAllowed(lk)) {
                hasLocal = true;
                break;
              }
            }
          }
          if (hasLocal) break;
        }

        if (!hasLocal) return;

        // Get the latest persisted user token for the keepalive flush
        var sessionRes = await self.supa.auth.getSession();
        var accessToken = sessionRes && sessionRes.data && sessionRes.data.session && sessionRes.data.session.access_token;

        if (window.confirm('Back up your current dashboard data to your secure Supabase account?')) {
          for (var i = 0; i < self._configs.length; i++) {
            var cfg = self._configs[i];
            var state = self._collect(cfg.syncedKeys || [], cfg.syncedPrefixes || []);
            var transformed = cfg.transformPush ? cfg.transformPush(state) : state;
            self._lastSyncedJson[cfg.appKey] = JSON.stringify(transformed);
            try {
              await self.supa.from('user_app_state').upsert(
                { user_id: self.user.id, key: cfg.appKey, data: transformed, updated_at: new Date().toISOString() },
                { onConflict: 'user_id,key' }
              );
            } catch (e) {}
          }
        }
      } catch (e) {}
    },

    _applyRemote: function (remote, syncedKeys, syncedPrefixes, onApplied) {
      if (!remote || typeof remote !== 'object') return;
      var self = this;
      self._suppress = true;
      var changed = false;
      try {
        for (var k in remote) {
          if (!isAllowed(k)) continue;
          if (!self._matchesAny(k, syncedKeys, syncedPrefixes)) continue;
          var incoming = JSON.stringify(remote[k]);
          var local = localStorage.getItem(k);
          if (local !== incoming) {
            try { self._origSet(k, incoming); changed = true; } catch (e) {}
          }
        }
      } finally {
        self._suppress = false;
      }
      if (changed && typeof onApplied === 'function') {
        try { onApplied(); } catch (e) {}
      }
      return changed;
    },

    _schedulePush: function (appKey) {
      var self = this;
      clearTimeout(self._pushTimers[appKey]);
      self._pushTimers[appKey] = setTimeout(function () {
        self._doPush(appKey);
      }, 250);
    },

    _doPush: async function (appKey) {
      var self = this;
      if (!self.supa || !self.user) return;

      // Find the config for this appKey
      var cfg = null;
      for (var i = 0; i < self._configs.length; i++) {
        if (self._configs[i].appKey === appKey) {
          cfg = self._configs[i];
          break;
        }
      }
      if (!cfg) return;

      var state = self._collect(cfg.syncedKeys || [], cfg.syncedPrefixes || []);
      var transformed = cfg.transformPush ? cfg.transformPush(state) : state;
      var json = JSON.stringify(transformed);
      if (json === self._lastSyncedJson[appKey]) return;

      try {
        var { error } = await self.supa.from('user_app_state').upsert(
          { user_id: self.user.id, key: appKey, data: transformed, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,key' }
        );
        if (!error) self._lastSyncedJson[appKey] = json;
      } catch (e) {}
    },

    _flushNow: function () {
      var self = this;
      if (!self.supa || !self.user) return;

      // We need access token for the REST call
      self.supa.auth.getSession().then(function (sessionRes) {
        var session = sessionRes && sessionRes.data && sessionRes.data.session;
        if (!session || !session.access_token) return;
        var token = session.access_token;

        for (var i = 0; i < self._configs.length; i++) {
          var cfg = self._configs[i];
          var state = self._collect(cfg.syncedKeys || [], cfg.syncedPrefixes || []);
          var transformed = cfg.transformPush ? cfg.transformPush(state) : state;
          var json = JSON.stringify(transformed);
          if (json === self._lastSyncedJson[cfg.appKey]) continue;
          try {
            fetch(SUPABASE_URL + '/rest/v1/user_app_state?on_conflict=user_id,key', {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
              },
              body: JSON.stringify({ user_id: self.user.id, key: cfg.appKey, data: transformed, updated_at: new Date().toISOString() }),
              keepalive: true
            }).catch(function () {});
            self._lastSyncedJson[cfg.appKey] = json;
          } catch (e) {}
        }
      }).catch(function () {});
    }
  };

  /* ---------- Boot ---------- */
  (async function boot() {
    if (!window.supabase || !SUPABASE_URL || !SUPABASE_KEY) {
      auth.ready = true;
      auth._booted = true;
      window.auth = auth;
      return;
    }
    if (SUPABASE_URL.indexOf('PASTE-') === 0 || SUPABASE_KEY.indexOf('PASTE-') === 0) {
      auth.ready = true;
      auth._booted = true;
      window.auth = auth;
      return;
    }

    try {
      auth.supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch (e) {
      auth.ready = true;
      auth._booted = true;
      window.auth = auth;
      return;
    }

    // Restore session
    try {
      var sessionRes = await auth.supa.auth.getSession();
      var session = sessionRes && sessionRes.data && sessionRes.data.session;
      if (session && session.user) {
        auth.user = { id: session.user.id, email: session.user.email || '' };
      }
    } catch (e) {}

    // Listen for auth state changes
    auth.supa.auth.onAuthStateChange(function (event, session) {
      if (session && session.user) {
        auth.user = { id: session.user.id, email: session.user.email || '' };
        // Activate queued configs for the new user
        for (var i = 0; i < auth._configs.length; i++) {
          auth._activateSync(auth._configs[i]);
        }
      } else if (event === 'SIGNED_OUT') {
        auth.user = null;
        // Close channels
        for (var i = 0; i < auth._channels.length; i++) {
          try { auth._channels[i].unsubscribe(); } catch (e) {}
        }
        auth._channels = [];
      }
      auth._notify();
    });

    auth.ready = true;
    auth._booted = true;
    window.auth = auth;
    auth._notify();

    // Activate any configs that were queued before boot
    for (var i = 0; i < auth._configs.length; i++) {
      auth._activateSync(auth._configs[i]);
    }
  })();
})();
