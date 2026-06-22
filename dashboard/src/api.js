const RAILWAY_URL = 'discord-mod-bot-production-7c97.up.railway.app';

function getKey() { return sessionStorage.getItem('apiKey') || ''; }

async function req(path, opts = {}) {
  const res = await fetch(`${RAILWAY_URL}${path}`, {
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
  getGuilds:       ()           => req('/guilds'),
  getSettings:     (id)         => req(`/guilds/${id}/settings`),
  patchSettings:   (id, body)   => req(`/guilds/${id}/settings`, { method:'PATCH', body }),
  getModLog:       (id)         => req(`/guilds/${id}/modlog`),
  getCmdLog:       (id)         => req(`/guilds/${id}/cmdlog`),
  getAllCmdLog:     ()           => req('/cmdlog/all'),
  getWarns:        (id)         => req(`/guilds/${id}/warns`),
  deleteWarn:      (g, u, w)    => req(`/guilds/${g}/warns/${u}/${w}`, { method:'DELETE' }),
  getStats:        (id)         => req(`/guilds/${id}/stats`),
  getTickets:      (id)         => req(`/guilds/${id}/tickets`),
  getBlacklist:    (id)         => req(`/guilds/${id}/blacklist`),
  addBlacklist:    (id, body)   => req(`/guilds/${id}/blacklist`, { method:'POST', body }),
  removeBlacklist: (id, userId) => req(`/guilds/${id}/blacklist/${userId}`, { method:'DELETE' }),
  getNotes:        (id)         => req(`/guilds/${id}/notes`),
};