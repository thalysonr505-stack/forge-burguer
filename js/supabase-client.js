(function () {
  "use strict";
  const SUPABASE_URL = "https://piwmfpojfcztjgbzbnfv.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_l6LEPolXzkENpI2DoYS75Q_OL-OprkB";
  if (!window.supabase || !window.supabase.createClient) {
    window.forgeBackendError = "Supabase client library failed to load.";
    return;
  }
  window.forgeSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
})();