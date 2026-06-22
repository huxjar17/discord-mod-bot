// Always read the key from sessionStorage so it's available after login
function getKey() { return sessionStorage.getItem('apiKey') || ''; }

async function req(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getKey(),
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export const api = {
  // Guilds
  getGuilds:          ()           => req('/guilds'),

  // Settings
  getSettings:        (id)         => req(`/guilds/${id}/settings`),
  patchSettings:      (id, body)   => req(`/guilds/${id}/settings`, { method:'PATCH', body }),

  // Mod log
  getModLog:          (id)         => req(`/guilds/${id}/modlog`),

  // Command log
  getCmdLog:          (id)         => req(`/guilds/${id}/cmdlog`),
  getAllCmdLog:        ()           => req('/cmdlog/all'),

  // Warns
  getWarns:           (id)         => req(`/guilds/${id}/warns`),
  deleteWarn:         (g, u, w)    => req(`/guilds/${g}/warns/${u}/${w}`, { method:'DELETE' }),

  // Stats
  getStats:           (id)         => req(`/guilds/${id}/stats`),

  // Tickets
  getTickets:         (id)         => req(`/guilds/${id}/tickets`),

  // Blacklist
  getBlacklist:       (id)         => req(`/guilds/${id}/blacklist`),
  addBlacklist:       (id, body)   => req(`/guilds/${id}/blacklist`, { method:'POST', body }),
  removeBlacklist:    (id, userId) => req(`/guilds/${id}/blacklist/${userId}`, { method:'DELETE' }),

  // Notes
  getNotes:           (id)         => req(`/guilds/${id}/notes`),
};
