const RAILWAY_URL = 'https://discord-mod-bot-production-7c97.up.railway.app';

export const fetchGuilds = async (apiKey) => {
  const response = await fetch(`${RAILWAY_URL}/guilds`, {
    headers: {
      'Authorization': apiKey
    }
  });
  if (!response.ok) throw new Error('Invalid API Key');
  return response.json();
};

export const fetchChannels = async (guildId, apiKey) => {
  const response = await fetch(`${RAILWAY_URL}/guilds/${guildId}/channels`, {
    headers: {
      'Authorization': apiKey
    }
  });
  return response.json();
};

export const sendEmbed = async (guildId, channelId, embedData, apiKey) => {
  const response = await fetch(`${RAILWAY_URL}/embed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey
    },
    body: JSON.stringify({ guildId, channelId, ...embedData })
  });
  return response.json();
};