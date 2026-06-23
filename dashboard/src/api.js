const RAILWAY_URL = 'https://discord-mod-bot-production-7c97.up.railway.app';

const fetchGuilds = async () => {
  const response = await fetch(`${RAILWAY_URL}/guilds`);
  if (!response.ok) throw new Error('Failed to fetch servers');
  return response.json();
};

const fetchChannels = async (guildId) => {
  const response = await fetch(`${RAILWAY_URL}/guilds/${guildId}/channels`);
  return response.json();
};

const sendEmbed = async (guildId, channelId, embedData) => {
  const response = await fetch(`${RAILWAY_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guildId, channelId, ...embedData })
  });
  return response.json();
};

// 1. Named export (supports: import { api } from ...)
export const api = {
  fetchGuilds,
  fetchChannels,
  sendEmbed
};

// 2. Default export (supports: import api from ...)
export default api;
