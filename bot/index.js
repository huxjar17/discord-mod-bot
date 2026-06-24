require('dotenv').config();
const {
  Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder, SlashCommandBuilder, REST, Routes,
  Collection, ChannelType
} = require('discord.js');
const fs      = require('fs');
const path    = require('path');
const express = require('express');
const cors    = require('cors');

// ─────────────────────────────────
//  DATA
// ─────────────────────────────────
const DATA_FILE = path.join(__dirname, 'data.json');
function load() {
  if (!fs.existsSync(DATA_FILE))
    return { warns:{}, modlog:[], cmdlog:[], settings:{}, tickets:{}, ticketCounter:{}, notes:{}, blacklist:{} };
  try {
    const d = JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));
    ['warns','modlog','cmdlog','settings','tickets','ticketCounter','notes','blacklist']
      .forEach(k=>{ if(!d[k]) d[k]= (k==='modlog'||k==='cmdlog') ? [] : {}; });
    return d;
  }
  catch { return { warns:{}, modlog:[], cmdlog:[], settings:{}, tickets:{}, ticketCounter:{}, notes:{}, blacklist:{} }; }
}
function save() { fs.writeFileSync(DATA_FILE, JSON.stringify(db,null,2)); }
let db = load();

// ─────────────────────────────────
//  CLIENT
// ─────────────────────────────────
const client = new Client({
  intents:[
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration, GatewayIntentBits.DirectMessages,
  ]
});

// ─────────────────────────────────
//  HELPERS
// ─────────────────────────────────
function parseTime(s) {
  if (!s) return null;
  const u={s:1000,m:60000,h:3600000,d:86400000,w:604800000};
  const m=s.match(/^(\d+)([smhdw])$/);
  return m ? parseInt(m[1])*u[m[2]] : null;
}
function fmtMs(ms) {
  if (!ms) return 'Permanent';
  const d=Math.floor(ms/86400000),h=Math.floor((ms%86400000)/3600000),
        m=Math.floor((ms%3600000)/60000),s=Math.floor((ms%60000)/1000);
  return [d&&`${d}d`,h&&`${h}h`,m&&`${m}m`,s&&`${s}s`].filter(Boolean).join(' ')||'0s';
}
function uid() { return Math.random().toString(36).substr(2,8).toUpperCase(); }

function gs(guildId) {
  if (!db.settings[guildId]) db.settings[guildId]={
    logChannel:null, ticketCategory:null, ticketLogChannel:null,
    supportRoles:[], automod:{antispam:false,badwords:false,antiraid:false,antiinvite:false,massmention:false,caps:false},
    badWordList:[], escalation:{muteAt:3,kickAt:0,banAt:5},
    commandPerms:{}, lockedChannels:[],
    appLinks:{ staff:'', media:'', discord_appeal:'', ingame_appeal:'' },
    session:{ channelId:null, messageId:null, serverName:'', owner:'', joinCode:'',
              maxPlayers:40, players:0, queue:0, staff:0, joinLink:'' },
  };
  if (!db.settings[guildId].appLinks) db.settings[guildId].appLinks = { staff:'', media:'', discord_appeal:'', ingame_appeal:'' };
  return db.settings[guildId];
}

async function sendLog(guild, embed) {
  const s=gs(guild.id); if(!s.logChannel) return;
  try { const ch=await guild.channels.fetch(s.logChannel); if(ch) ch.send({embeds:[embed]}); } catch {}
}
async function dmUser(user, embed) { try { await user.send({embeds:[embed]}); } catch {} }

function modEmbed(action, mod, target, reason, extra=[]) {
  const col={ban:0xFF0000,kick:0xFF6600,mute:0xFFAA00,warn:0xFFFF00,unban:0x00FF00,
             unmute:0x00FF88,note:0x0088FF,dm:0x8844FF,lock:0xAAB7C4,
             lockdown:0xFF0000,unlockdown:0x57F287,blacklist:0xFF00FF};
  return new EmbedBuilder().setColor(col[action.toLowerCase()]??0x7289DA)
    .setTitle(`🔨 ${action}`)
    .addFields(
      {name:'User',value:`${target.tag||target} (${target.id||target})`,inline:true},
      {name:'Moderator',value:mod.tag,inline:true},
      {name:'Reason',value:reason||'No reason provided'},
      ...extra
    ).setTimestamp();
}

function logAction(guildId, action, modId, targetId, reason, extra={}, interaction=null) {
  const guild = client.guilds.cache.get(guildId);
  const modMember = guild?.members.cache.get(modId);
  const entry = {
    id: uid(), guildId, guildName: guild?.name || 'Unknown Server',
    action, modId, modTag: modMember?.user?.tag || extra.modTag || 'Unknown',
    targetId, targetTag: extra.targetTag || targetId,
    reason, extra, timestamp: Date.now(),
  };
  db.modlog.push(entry);
  save();
  return entry;
}

function logCmd(interaction, commandName, details={}) {
  if (!db.cmdlog) db.cmdlog = [];
  const guild = interaction?.guild;
  db.cmdlog.push({
    id: uid(), command: commandName,
    userId: interaction?.user?.id || interaction?.member?.id,
    userTag: interaction?.user?.tag || interaction?.member?.user?.tag || 'Unknown',
    guildId: guild?.id || null, guildName: guild?.name || 'DM',
    channelId: interaction?.channel?.id || null,
    channelName: interaction?.channel?.name || 'Unknown',
    details, timestamp: Date.now(),
  });
  if (db.cmdlog.length > 1000) db.cmdlog = db.cmdlog.slice(-1000);
  save();
}

async function checkEscalation(interaction, member, guildId) {
  const s=gs(guildId);
  const warns=(db.warns[guildId]?.[member.id]||[]).filter(w=>!w.removed).length;
  const {muteAt,kickAt,banAt}=s.escalation;
  if (banAt>0&&warns>=banAt) {
    await member.ban({reason:`Auto-escalation: ${warns} warnings`});
    logAction(guildId,'AUTO_BAN',client.user.id,member.id,`Auto: ${warns} warns`);
    interaction.followUp({content:`⚠️ ${member.user.tag} auto-banned (${warns} warnings).`,ephemeral:true}).catch(()=>{});
  } else if (kickAt>0&&warns>=kickAt) {
    await member.kick(`Auto-escalation: ${warns} warnings`);
    logAction(guildId,'AUTO_KICK',client.user.id,member.id,`Auto: ${warns} warns`);
    interaction.followUp({content:`⚠️ ${member.user.tag} auto-kicked (${warns} warnings).`,ephemeral:true}).catch(()=>{});
  } else if (muteAt>0&&warns>=muteAt) {
    await member.timeout(3600000,`Auto-escalation: ${warns} warnings`);
    logAction(guildId,'AUTO_MUTE',client.user.id,member.id,`Auto: ${warns} warns`);
    interaction.followUp({content:`⚠️ ${member.user.tag} auto-muted 1h (${warns} warnings).`,ephemeral:true}).catch(()=>{});
  }
}

function hasPerm(member, cmd) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const allowed=gs(member.guild.id).commandPerms?.[cmd]||[];
  return allowed.length===0 || allowed.some(r=>member.roles.cache.has(r));
}

// ─────────────────────────────────
//  SESSION HELPERS
// ─────────────────────────────────
function buildSessionEmbed(s, guildName) {
  const p = s.session;
  const live = p.players > 0;
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📡 Session Dashboard')
    .setDescription(`Welcome to the **${guildName}** Sessions Dashboard! Find all info about our current session here.`)
    .addFields(
      { name:'📋 Server Information', value:
        `↳ **Server Name:** \`${p.serverName||'Not set'}\`\n`+
        `↳ **Server Owner:** ${p.owner||'Not set'}\n`+
        `↳ **Join Code:** \`${p.joinCode||'Not set'}\`` },
      { name: live ? '🟢 Live Session' : '🔴 Live Session', value:
        `↳ **Player Count:** \`${p.players}/${p.maxPlayers}\`\n`+
        `↳ **Server Queue:** \`${p.queue}\`\n`+
        `↳ **Staff Online:** \`${p.staff}\`` }
    )
    .setFooter({ text:'Last Updated' })
    .setTimestamp();
}

function buildSessionComponents(p) {
  const btns = [
    new ButtonBuilder().setCustomId('session_ping').setLabel('Session Ping').setStyle(ButtonStyle.Secondary).setEmoji('📡'),
  ];
  if (p.joinLink) btns.push(new ButtonBuilder().setLabel('Join Game').setStyle(ButtonStyle.Link).setURL(p.joinLink).setEmoji('🔗'));
  return [new ActionRowBuilder().addComponents(...btns)];
}

async function refreshSessionPanel(guild) {
  const s = gs(guild.id);
  if (!s.session.channelId || !s.session.messageId) return;
  try {
    const ch  = await guild.channels.fetch(s.session.channelId);
    const msg = await ch.messages.fetch(s.session.messageId);
    await msg.edit({ embeds:[buildSessionEmbed(s, guild.name)], components:buildSessionComponents(s.session) });
  } catch {}
}

// ─────────────────────────────────
//  COMMANDS
// ─────────────────────────────────
const commands = [
  new SlashCommandBuilder().setName('ban').setDescription('Ban a member')
    .addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o=>o.setName('reason').setDescription('Reason'))
    .addIntegerOption(o=>o.setName('delete_days').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7))
    .addStringOption(o=>o.setName('duration').setDescription('e.g. 1h 7d — blank = permanent'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder().setName('unban').setDescription('Unban a user by ID')
    .addStringOption(o=>o.setName('userid').setDescription('User ID').setRequired(true))
    .addStringOption(o=>o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder().setName('kick').setDescription('Kick a member')
    .addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o=>o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  new SlashCommandBuilder().setName('mute').setDescription('Timeout a member')
    .addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o=>o.setName('duration').setDescription('e.g. 10m 1h 7d').setRequired(true))
    .addStringOption(o=>o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder().setName('unmute').setDescription('Remove timeout')
    .addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o=>o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder().setName('warn').setDescription('Warn a member')
    .addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder().setName('unwarn').setDescription('Remove a warning by ID')
    .addStringOption(o=>o.setName('warn_id').setDescription('Warning ID').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder().setName('history').setDescription('View mod history of a user')
    .addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder().setName('purge').setDescription('Bulk delete messages')
    .addIntegerOption(o=>o.setName('count').setDescription('1-100').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption(o=>o.setName('user').setDescription('Only from this user'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder().setName('slowmode').setDescription('Set channel slowmode')
    .addIntegerOption(o=>o.setName('seconds').setDescription('Seconds (0=off)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder().setName('lock').setDescription('Lock this channel')
    .addStringOption(o=>o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder().setName('unlock').setDescription('Unlock this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder().setName('lockdown').setDescription('Lock ALL text channels')
    .addStringOption(o=>o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder().setName('unlockdown').setDescription('Undo server lockdown')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder().setName('note').setDescription('Add a mod note to a user')
    .addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o=>o.setName('text').setDescription('Note').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder().setName('dm').setDescription('DM a user from the bot')
    .addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o=>o.setName('message').setDescription('Message').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder().setName('userinfo').setDescription('Get info about a user')
    .addUserOption(o=>o.setName('user').setDescription('User')),

  new SlashCommandBuilder().setName('serverinfo').setDescription('Get server info'),

  new SlashCommandBuilder().setName('embed').setDescription('Send a custom embed')
    .addStringOption(o=>o.setName('title').setDescription('Title').setRequired(true))
    .addStringOption(o=>o.setName('description').setDescription('Description').setRequired(true))
    .addStringOption(o=>o.setName('color').setDescription('Hex color e.g. #FF0000'))
    .addStringOption(o=>o.setName('footer').setDescription('Footer text'))
    .addStringOption(o=>o.setName('image').setDescription('Large image URL'))
    .addStringOption(o=>o.setName('thumbnail').setDescription('Thumbnail URL'))
    .addStringOption(o=>o.setName('field1_name').setDescription('Field 1 name'))
    .addStringOption(o=>o.setName('field1_value').setDescription('Field 1 value'))
    .addStringOption(o=>o.setName('field2_name').setDescription('Field 2 name'))
    .addStringOption(o=>o.setName('field2_value').setDescription('Field 2 value'))
    .addStringOption(o=>o.setName('field3_name').setDescription('Field 3 name'))
    .addStringOption(o=>o.setName('field3_value').setDescription('Field 3 value'))
    .addBooleanOption(o=>o.setName('timestamp').setDescription('Add timestamp?'))
    .addChannelOption(o=>o.setName('channel').setDescription('Channel to send to'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  // ── BLACKLIST ──
  new SlashCommandBuilder().setName('blacklist').setDescription('Manage the server blacklist')
    .addSubcommand(s=>s.setName('add').setDescription('Add a user to the blacklist')
      .addUserOption(o=>o.setName('user').setDescription('User to blacklist').setRequired(true))
      .addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(true)))
    .addSubcommand(s=>s.setName('remove').setDescription('Remove a user from the blacklist')
      .addUserOption(o=>o.setName('user').setDescription('User to remove').setRequired(true)))
    .addSubcommand(s=>s.setName('list').setDescription('View all blacklisted users'))
    .addSubcommand(s=>s.setName('check').setDescription('Check if a user is blacklisted')
      .addUserOption(o=>o.setName('user').setDescription('User to check').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  // ── SET APP LINK ──
  new SlashCommandBuilder().setName('setapplink').setDescription('Set the link for an application category')
    .addStringOption(o=>o.setName('category').setDescription('Category to set the link for').setRequired(true)
      .addChoices(
        {name:'Staff Application',value:'staff'},
        {name:'Media Team Application',value:'media'},
        {name:'Discord Ban Appeal',value:'discord_appeal'},
        {name:'In-Game Appeal',value:'ingame_appeal'}
      ))
    .addStringOption(o=>o.setName('link').setDescription('The URL for this category').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder().setName('viewapplinks').setDescription('View all current application links')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder().setName('ticket').setDescription('Ticket system')
    .addSubcommand(s=>s.setName('setup').setDescription('Configure tickets')
      .addChannelOption(o=>o.setName('category').setDescription('Category for ticket channels').setRequired(true))
      .addChannelOption(o=>o.setName('log_channel').setDescription('Log channel'))
      .addRoleOption(o=>o.setName('support_role').setDescription('Support role')))
    .addSubcommand(s=>s.setName('panel').setDescription('Post ticket panel')
      .addChannelOption(o=>o.setName('channel').setDescription('Channel').setRequired(true))
      .addStringOption(o=>o.setName('title').setDescription('Panel title').setRequired(true))
      .addStringOption(o=>o.setName('description').setDescription('Panel description').setRequired(true)))
    .addSubcommand(s=>s.setName('close').setDescription('Close this ticket')
      .addStringOption(o=>o.setName('reason').setDescription('Reason')))
    .addSubcommand(s=>s.setName('add').setDescription('Add user to ticket')
      .addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(s=>s.setName('remove').setDescription('Remove user from ticket')
      .addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(s=>s.setName('rename').setDescription('Rename ticket channel')
      .addStringOption(o=>o.setName('name').setDescription('New name').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder().setName('application').setDescription('Post applications panel')
    .addSubcommand(s=>s.setName('panel').setDescription('Post the applications panel')
      .addChannelOption(o=>o.setName('channel').setDescription('Channel').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder().setName('session').setDescription('Session dashboard')
    .addSubcommand(s=>s.setName('panel').setDescription('Post session panel')
      .addChannelOption(o=>o.setName('channel').setDescription('Channel').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder().setName('automod').setDescription('AutoMod config')
    .addSubcommand(s=>s.setName('status').setDescription('Show status'))
    .addSubcommand(s=>s.setName('set').setDescription('Toggle feature')
      .addStringOption(o=>o.setName('feature').setDescription('Feature').setRequired(true)
        .addChoices(
          {name:'Anti-Spam',value:'antispam'},{name:'Bad Words Filter',value:'badwords'},
          {name:'Anti-Raid',value:'antiraid'},{name:'Block Invite Links',value:'antiinvite'},
          {name:'Mass Mention Guard',value:'massmention'},{name:'Caps Lock Filter',value:'caps'}
        ))
      .addBooleanOption(o=>o.setName('enabled').setDescription('On/off').setRequired(true)))
    .addSubcommand(s=>s.setName('badword').setDescription('Manage bad words')
      .addStringOption(o=>o.setName('action').setDescription('add/remove').setRequired(true)
        .addChoices({name:'add',value:'add'},{name:'remove',value:'remove'}))
      .addStringOption(o=>o.setName('word').setDescription('Word').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder().setName('setlogchannel').setDescription('Set mod log channel')
    .addChannelOption(o=>o.setName('channel').setDescription('Channel').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder().setName('setescalation').setDescription('Auto-escalation thresholds')
    .addIntegerOption(o=>o.setName('mute_at').setDescription('Mute after X warns (0=off)').setRequired(true))
    .addIntegerOption(o=>o.setName('kick_at').setDescription('Kick after X warns (0=off)').setRequired(true))
    .addIntegerOption(o=>o.setName('ban_at').setDescription('Ban after X warns (0=off)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder().setName('grantperm').setDescription('[Admin] Grant role access to a command')
    .addStringOption(o=>o.setName('command').setDescription('Command name').setRequired(true))
    .addRoleOption(o=>o.setName('role').setDescription('Role').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('revokeperm').setDescription('[Admin] Revoke role access from a command')
    .addStringOption(o=>o.setName('command').setDescription('Command name').setRequired(true))
    .addRoleOption(o=>o.setName('role').setDescription('Role').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('listperms').setDescription('[Admin] List custom command permissions')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

].map(c=>c.toJSON());

// ─────────────────────────────────
//  AUTOMOD
// ─────────────────────────────────
const spamTracker = new Collection();
const raidTracker = [];

client.on('messageCreate', async msg => {
  if (msg.author.bot || !msg.guild) return;
  const s=gs(msg.guild.id), am=s.automod;
  if (am.badwords && s.badWordList.some(w=>msg.content.toLowerCase().includes(w))) {
    await msg.delete().catch(()=>{});
    return msg.channel.send({content:`⚠️ ${msg.author}, message removed.`}).then(m=>setTimeout(()=>m.delete().catch(()=>{}),5000));
  }
  if (am.antiinvite && /discord\.gg\/|discord\.com\/invite\//i.test(msg.content)) {
    await msg.delete().catch(()=>{});
    return msg.channel.send({content:`⚠️ ${msg.author}, invite links not allowed.`}).then(m=>setTimeout(()=>m.delete().catch(()=>{}),5000));
  }
  if (am.caps && msg.content.length>=8 && (msg.content.match(/[A-Z]/g)||[]).length/msg.content.length>0.7) {
    await msg.delete().catch(()=>{});
    return msg.channel.send({content:`⚠️ ${msg.author}, avoid excessive caps.`}).then(m=>setTimeout(()=>m.delete().catch(()=>{}),5000));
  }
  if (am.massmention && msg.mentions.users.size>=5) {
    await msg.delete().catch(()=>{});
    return msg.channel.send({content:`⚠️ ${msg.author}, mass mentions not allowed.`}).then(m=>setTimeout(()=>m.delete().catch(()=>{}),5000));
  }
  if (am.antispam) {
    const now=Date.now(), id=msg.author.id;
    if (!spamTracker.has(id)) spamTracker.set(id,[]);
    const times=spamTracker.get(id).filter(t=>now-t<5000); times.push(now); spamTracker.set(id,times);
    if (times.length>=5) {
      await msg.delete().catch(()=>{});
      const m=await msg.guild.members.fetch(id).catch(()=>null);
      if (m) { await m.timeout(300000,'AutoMod: spam').catch(()=>{}); logAction(msg.guild.id,'AUTO_MUTE',client.user.id,id,'Spam'); }
    }
  }
});

client.on('guildMemberAdd', async member => {
  const s=gs(member.guild.id);
  if (db.blacklist[member.guild.id]?.[member.id]) {
    const entry = db.blacklist[member.guild.id][member.id];
    await member.ban({reason:`Blacklisted: ${entry.reason}`}).catch(()=>{});
    return;
  }
  if (!s.automod.antiraid) return;
  const now=Date.now(); raidTracker.push(now);
  if (raidTracker.filter(t=>now-t<10000).length>=10) {
    const age=now-member.user.createdTimestamp;
    if (age<7*24*3600*1000) { await member.kick('Anti-Raid').catch(()=>{}); logAction(member.guild.id,'AUTO_KICK',client.user.id,member.id,'Anti-Raid'); }
  }
});

// ─────────────────────────────────
//  INTERACTIONS
// ─────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId==='ticket_category_select') return createTicket(interaction);
    if (interaction.customId==='application_select')    return handleApplication(interaction);
  }
  if (interaction.isButton()) {
    if (interaction.customId==='ticket_close_confirm') return closeTicket(interaction);
    if (interaction.customId==='ticket_close_cancel')  return interaction.update({content:'Cancelled.',components:[]});
    if (interaction.customId==='session_ping') return interaction.reply({content:'🔔 You will be notified when the session goes live!',ephemeral:true});
  }

  if (!interaction.isChatInputCommand()) return;
  await interaction.deferReply({ephemeral:true});
  const {commandName,guild,member,options}=interaction;

  if (!hasPerm(member,commandName)) return interaction.editReply('❌ You do not have permission to use this command.');

  try {
    if (commandName==='ban') {
      const user=options.getUser('user',true), reason=options.getString('reason')||'No reason',
            delDays=options.getInteger('delete_days')??0, ms=parseTime(options.getString('duration'));
      const t=await guild.members.fetch(user.id).catch(()=>null);
      if (t&&!t.bannable) return interaction.editReply('❌ Cannot ban this user.');
      await dmUser(user,new EmbedBuilder().setColor(0xFF0000).setTitle(`Banned from ${guild.name}`).addFields({name:'Reason',value:reason},{name:'Duration',value:fmtMs(ms)}));
      await guild.bans.create(user.id,{reason,deleteMessageSeconds:delDays*86400});
      logAction(guild.id,'BAN',member.id,user.id,reason,{duration:fmtMs(ms),targetTag:user.tag,modTag:member.user.tag},interaction);
      logCmd(interaction,'ban',{target:user.tag,targetId:user.id,reason,duration:fmtMs(ms)});
      const e=modEmbed('Ban',member.user,user,reason,[{name:'Duration',value:fmtMs(ms)}]);
      await sendLog(guild,e); await interaction.editReply({embeds:[e]});
      if (ms) setTimeout(()=>guild.bans.remove(user.id,'Temp-ban expired').catch(()=>{}),ms);
    }
    else if (commandName==='unban') {
      const userId=options.getString('userid',true), reason=options.getString('reason')||'No reason';
      await guild.bans.remove(userId,reason);
      logAction(guild.id,'UNBAN',member.id,userId,reason,{targetTag:userId,modTag:member.user.tag},interaction);
      logCmd(interaction,'unban',{targetId:userId,reason});
      const e=modEmbed('Unban',member.user,{tag:`<@${userId}>`,id:userId},reason);
      await sendLog(guild,e); await interaction.editReply({embeds:[e]});
    }
    else if (commandName==='kick') {
      const user=options.getUser('user',true), reason=options.getString('reason')||'No reason';
      const t=await guild.members.fetch(user.id).catch(()=>null);
      if (!t) return interaction.editReply('❌ User not found.');
      if (!t.kickable) return interaction.editReply('❌ Cannot kick.');
      await dmUser(user,new EmbedBuilder().setColor(0xFF6600).setTitle(`Kicked from ${guild.name}`).addFields({name:'Reason',value:reason}));
      await t.kick(reason);
      logAction(guild.id,'KICK',member.id,user.id,reason,{targetTag:user.tag,modTag:member.user.tag},interaction);
      logCmd(interaction,'kick',{target:user.tag,targetId:user.id,reason});
      const e=modEmbed('Kick',member.user,user,reason);
      await sendLog(guild,e); await interaction.editReply({embeds:[e]});
    }
    else if (commandName==='mute') {
      const user=options.getUser('user',true), dur=options.getString('duration',true),
            reason=options.getString('reason')||'No reason', ms=parseTime(dur);
      if (!ms) return interaction.editReply('❌ Invalid duration. Use: 10m 1h 7d');
      if (ms>28*24*3600*1000) return interaction.editReply('❌ Max is 28 days.');
      const t=await guild.members.fetch(user.id).catch(()=>null);
      if (!t) return interaction.editReply('❌ User not found.');
      await t.timeout(ms,reason);
      logAction(guild.id,'MUTE',member.id,user.id,reason,{duration:fmtMs(ms),targetTag:user.tag,modTag:member.user.tag},interaction);
      logCmd(interaction,'mute',{target:user.tag,targetId:user.id,reason,duration:fmtMs(ms)});
      await dmUser(user,new EmbedBuilder().setColor(0xFFAA00).setTitle(`Muted in ${guild.name}`).addFields({name:'Duration',value:fmtMs(ms)},{name:'Reason',value:reason}));
      const e=modEmbed('Mute',member.user,user,reason,[{name:'Duration',value:fmtMs(ms)}]);
      await sendLog(guild,e); await interaction.editReply({embeds:[e]});
    }
    else if (commandName==='unmute') {
      const user=options.getUser('user',true), reason=options.getString('reason')||'No reason';
      const t=await guild.members.fetch(user.id).catch(()=>null);
      if (!t) return interaction.editReply('❌ User not found.');
      await t.timeout(null,reason);
      logAction(guild.id,'UNMUTE',member.id,user.id,reason,{targetTag:user.tag,modTag:member.user.tag},interaction);
      logCmd(interaction,'unmute',{target:user.tag,targetId:user.id,reason});
      await sendLog(guild,modEmbed('Unmute',member.user,user,reason));
      await interaction.editReply(`✅ ${user.tag} unmuted.`);
    }
    else if (commandName==='warn') {
      const user=options.getUser('user',true), reason=options.getString('reason',true);
      if (!db.warns[guild.id]) db.warns[guild.id]={};
      if (!db.warns[guild.id][user.id]) db.warns[guild.id][user.id]=[];
      const id=uid();
      db.warns[guild.id][user.id].push({id,reason,modId:member.id,modTag:member.user.tag,timestamp:Date.now(),removed:false}); save();
      logAction(guild.id,'WARN',member.id,user.id,reason,{warnId:id,targetTag:user.tag,modTag:member.user.tag},interaction);
      logCmd(interaction,'warn',{target:user.tag,targetId:user.id,reason,warnId:id});
      await dmUser(user,new EmbedBuilder().setColor(0xFFFF00).setTitle(`Warning in ${guild.name}`).addFields({name:'Reason',value:reason},{name:'ID',value:id}));
      const total=(db.warns[guild.id][user.id]||[]).filter(w=>!w.removed).length;
      const e=modEmbed('Warn',member.user,user,reason,[{name:'Warning ID',value:id},{name:'Total',value:String(total)}]);
      await sendLog(guild,e);
      const tm=await guild.members.fetch(user.id).catch(()=>null);
      if (tm) await checkEscalation(interaction,tm,guild.id);
      await interaction.editReply({embeds:[e]});
    }
    else if (commandName==='unwarn') {
      const wId=options.getString('warn_id',true); let found=false;
      for (const uid in (db.warns[guild.id]||{})) { const w=db.warns[guild.id][uid].find(w=>w.id===wId); if (w){w.removed=true;found=true;break;} }
      save();
      logCmd(interaction,'unwarn',{warnId:wId,found});
      await interaction.editReply(found?`✅ Warning \`${wId}\` removed.`:`❌ Not found.`);
    }
    else if (commandName==='history') {
      const user=options.getUser('user',true);
      const warns=(db.warns[guild.id]?.[user.id]||[]);
      const notes=(db.notes[guild.id]?.[user.id]||[]);
      const logs=(db.modlog||[]).filter(l=>l.guildId===guild.id&&l.targetId===user.id).slice(-15);
      logCmd(interaction,'history',{target:user.tag,targetId:user.id});
      await interaction.editReply({embeds:[new EmbedBuilder().setColor(0x7289DA).setTitle(`📋 Mod History: ${user.tag}`).setThumbnail(user.displayAvatarURL())
        .addFields(
          {name:`⚠️ Warnings (${warns.filter(w=>!w.removed).length} active)`,value:warns.filter(w=>!w.removed).map(w=>`\`${w.id}\` — ${w.reason}`).join('\n')||'None'},
          {name:`📝 Notes (${notes.length})`,value:notes.map(n=>`${n.content} — <t:${Math.floor(n.time/1000)}:R>`).join('\n')||'None'},
          {name:'📜 Recent Actions',value:logs.map(l=>`**${l.action}** — ${l.reason}`).join('\n')||'None'}
        ).setTimestamp()]});
    }
    else if (commandName==='purge') {
      const count=options.getInteger('count',true), fu=options.getUser('user');
      let msgs=await interaction.channel.messages.fetch({limit:100});
      if (fu) msgs=msgs.filter(m=>m.author.id===fu.id);
      const del=[...msgs.values()].slice(0,count);
      await interaction.channel.bulkDelete(del,true);
      logAction(guild.id,'PURGE',member.id,fu?.id||'ALL',`Purged ${del.length}`,{modTag:member.user.tag},interaction);
      logCmd(interaction,'purge',{count:del.length,filteredUser:fu?.tag||'ALL'});
      await interaction.editReply(`🗑️ Deleted **${del.length}** messages.`);
    }
    else if (commandName==='slowmode') {
      const secs=options.getInteger('seconds',true);
      await interaction.channel.setRateLimitPerUser(secs);
      logCmd(interaction,'slowmode',{seconds:secs});
      await interaction.editReply(secs===0?'✅ Slowmode off.':`✅ Slowmode: ${secs}s`);
    }
    else if (commandName==='lock') {
      const reason=options.getString('reason')||'Locked by moderator';
      await interaction.channel.permissionOverwrites.edit(guild.roles.everyone,{SendMessages:false});
      logAction(guild.id,'LOCK',member.id,interaction.channel.id,reason,{modTag:member.user.tag},interaction);
      logCmd(interaction,'lock',{channel:interaction.channel.name,reason});
      await interaction.editReply(`🔒 Locked. Reason: ${reason}`);
    }
    else if (commandName==='unlock') {
      await interaction.channel.permissionOverwrites.edit(guild.roles.everyone,{SendMessages:null});
      logCmd(interaction,'unlock',{channel:interaction.channel.name});
      await interaction.editReply('🔓 Unlocked.');
    }
    else if (commandName==='lockdown') {
      const reason=options.getString('reason')||'Server lockdown';
      const s=gs(guild.id); const chs=guild.channels.cache.filter(c=>c.type===ChannelType.GuildText);
      const locked=[];
      for (const [,ch] of chs) {
        const ex=ch.permissionOverwrites.cache.get(guild.roles.everyone.id);
        if (!ex?.deny?.has(PermissionFlagsBits.SendMessages)) locked.push(ch.id);
        await ch.permissionOverwrites.edit(guild.roles.everyone,{SendMessages:false}).catch(()=>{});
      }
      s.lockedChannels=locked; save();
      logAction(guild.id,'LOCKDOWN',member.id,guild.id,reason,{modTag:member.user.tag},interaction);
      logCmd(interaction,'lockdown',{reason,channelCount:locked.length});
      await interaction.editReply(`🚨 **LOCKDOWN** — ${locked.length} channels locked.\nUse \`/unlockdown\` to restore.`);
    }
    else if (commandName==='unlockdown') {
      const s=gs(guild.id); let count=0;
      for (const [,ch] of guild.channels.cache.filter(c=>c.type===ChannelType.GuildText)) {
        if ((s.lockedChannels||[]).includes(ch.id)||!s.lockedChannels?.length) {
          await ch.permissionOverwrites.edit(guild.roles.everyone,{SendMessages:null}).catch(()=>{}); count++;
        }
      }
      s.lockedChannels=[]; save();
      logAction(guild.id,'UNLOCKDOWN',member.id,guild.id,'Lockdown lifted',{modTag:member.user.tag},interaction);
      logCmd(interaction,'unlockdown',{channelCount:count});
      await interaction.editReply(`✅ Lockdown lifted — ${count} channels restored.`);
    }
    else if (commandName==='note') {
      const user=options.getUser('user',true), text=options.getString('text',true);
      if (!db.notes[guild.id]) db.notes[guild.id]={};
      if (!db.notes[guild.id][user.id]) db.notes[guild.id][user.id]=[];
      db.notes[guild.id][user.id].push({content:text,staffId:member.id,staffTag:member.user.tag,time:Date.now()});
      logAction(guild.id,'NOTE',member.id,user.id,text,{targetTag:user.tag,modTag:member.user.tag},interaction);
      logCmd(interaction,'note',{target:user.tag,targetId:user.id,note:text});
      await sendLog(guild,modEmbed('Note',member.user,user,text));
      save();
      await interaction.editReply(`📝 Note added for ${user.tag}.`);
    }
    else if (commandName==='dm') {
      const user=options.getUser('user',true), msg=options.getString('message',true);
      try {
        await user.send({embeds:[new EmbedBuilder().setColor(0x8844FF).setTitle(`📨 Message from ${guild.name}`).setDescription(msg).setFooter({text:`Sent by ${member.user.tag}`}).setTimestamp()]});
        logAction(guild.id,'DM',member.id,user.id,msg,{targetTag:user.tag,modTag:member.user.tag,dmMessage:msg},interaction);
        logCmd(interaction,'dm',{target:user.tag,targetId:user.id,message:msg});
        await sendLog(guild,modEmbed('DM',member.user,user,msg));
        await interaction.editReply(`✅ DM sent to **${user.tag}**.`);
      } catch { await interaction.editReply(`❌ Could not DM **${user.tag}**.`); }
    }
    else if (commandName==='userinfo') {
      const user=options.getUser('user')||member.user;
      const t=await guild.members.fetch(user.id).catch(()=>null);
      const warns=(db.warns[guild.id]?.[user.id]||[]).filter(w=>!w.removed).length;
      const isBlacklisted=!!db.blacklist[guild.id]?.[user.id];
      logCmd(interaction,'userinfo',{target:user.tag,targetId:user.id});
      await interaction.editReply({embeds:[new EmbedBuilder().setColor(0x7289DA).setTitle(`👤 ${user.tag}`).setThumbnail(user.displayAvatarURL({size:256}))
        .addFields(
          {name:'ID',value:user.id,inline:true},
          {name:'Created',value:`<t:${Math.floor(user.createdTimestamp/1000)}:R>`,inline:true},
          {name:'Joined',value:t?`<t:${Math.floor(t.joinedTimestamp/1000)}:R>`:'N/A',inline:true},
          {name:'Top Role',value:t?.roles.highest.toString()||'N/A',inline:true},
          {name:'Warnings',value:String(warns),inline:true},
          {name:'Blacklisted',value:isBlacklisted?'🚫 Yes':'✅ No',inline:true}
        ).setTimestamp()]});
    }
    else if (commandName==='serverinfo') {
      const owner=await guild.fetchOwner();
      logCmd(interaction,'serverinfo',{});
      await interaction.editReply({embeds:[new EmbedBuilder().setColor(0x7289DA).setTitle(`🏠 ${guild.name}`).setThumbnail(guild.iconURL({size:256}))
        .addFields(
          {name:'Owner',value:owner.user.tag,inline:true},{name:'Members',value:String(guild.memberCount),inline:true},
          {name:'Channels',value:String(guild.channels.cache.size),inline:true},{name:'Roles',value:String(guild.roles.cache.size),inline:true},
          {name:'Created',value:`<t:${Math.floor(guild.createdTimestamp/1000)}:R>`,inline:true},{name:'Boost Level',value:String(guild.premiumTier),inline:true}
        ).setTimestamp()]});
    }
    else if (commandName==='embed') {
      const title=options.getString('title',true), desc=options.getString('description',true);
      const colorStr=options.getString('color'), footer=options.getString('footer');
      const image=options.getString('image'), thumb=options.getString('thumbnail');
      const ts=options.getBoolean('timestamp'), targetCh=options.getChannel('channel')||interaction.channel;
      let color=0x5865F2;
      if (colorStr) { const p=parseInt(colorStr.replace('#',''),16); if (!isNaN(p)) color=p; }
      const e=new EmbedBuilder().setColor(color).setTitle(title).setDescription(desc);
      if (footer) e.setFooter({text:footer}); if (image) e.setImage(image); if (thumb) e.setThumbnail(thumb); if (ts) e.setTimestamp();
      const fields=[];
      for (let i=1;i<=3;i++) { const fn=options.getString(`field${i}_name`),fv=options.getString(`field${i}_value`); if(fn&&fv) fields.push({name:fn,value:fv,inline:true}); }
      if (fields.length) e.addFields(fields);
      await targetCh.send({embeds:[e]});
      logCmd(interaction,'embed',{title,channel:targetCh.name});
      await interaction.editReply(`✅ Embed sent to ${targetCh}.`);
    }

    // ── BLACKLIST ──
    else if (commandName==='blacklist') {
      const sub=options.getSubcommand();
      if (!db.blacklist[guild.id]) db.blacklist[guild.id]={};
      if (sub==='add') {
        const user=options.getUser('user',true), reason=options.getString('reason',true);
        db.blacklist[guild.id][user.id]={ userId:user.id, userTag:user.tag, reason, addedBy:member.id, addedByTag:member.user.tag, timestamp:Date.now() };
        save();
        const t=await guild.members.fetch(user.id).catch(()=>null);
        if (t) await t.ban({reason:`Blacklisted: ${reason}`}).catch(()=>{});
        logAction(guild.id,'BLACKLIST_ADD',member.id,user.id,reason,{targetTag:user.tag,modTag:member.user.tag},interaction);
        logCmd(interaction,'blacklist add',{target:user.tag,targetId:user.id,reason});
        const e=new EmbedBuilder().setColor(0xFF00FF).setTitle('🚫 User Blacklisted')
          .addFields({name:'User',value:`${user.tag} (${user.id})`,inline:true},{name:'Added By',value:member.user.tag,inline:true},{name:'Reason',value:reason})
          .setTimestamp();
        await sendLog(guild,e);
        await interaction.editReply({embeds:[e]});
      }
      else if (sub==='remove') {
        const user=options.getUser('user',true);
        if (!db.blacklist[guild.id][user.id]) return interaction.editReply(`❌ **${user.tag}** is not blacklisted.`);
        delete db.blacklist[guild.id][user.id]; save();
        logAction(guild.id,'BLACKLIST_REMOVE',member.id,user.id,'Removed from blacklist',{targetTag:user.tag,modTag:member.user.tag},interaction);
        logCmd(interaction,'blacklist remove',{target:user.tag,targetId:user.id});
        await interaction.editReply(`✅ **${user.tag}** removed from blacklist.`);
      }
      else if (sub==='list') {
        const entries=Object.values(db.blacklist[guild.id]||{});
        logCmd(interaction,'blacklist list',{count:entries.length});
        if (!entries.length) return interaction.editReply('✅ No users are blacklisted.');
        const e=new EmbedBuilder().setColor(0xFF00FF).setTitle(`🚫 Blacklist (${entries.length} users)`)
          .setDescription(entries.map(e=>`**${e.userTag}** (\`${e.userId}\`) — ${e.reason} — Added by ${e.addedByTag}`).join('\n').slice(0,4000))
          .setTimestamp();
        await interaction.editReply({embeds:[e]});
      }
      else if (sub==='check') {
        const user=options.getUser('user',true);
        const entry=db.blacklist[guild.id][user.id];
        logCmd(interaction,'blacklist check',{target:user.tag,targetId:user.id});
        if (!entry) return interaction.editReply(`✅ **${user.tag}** is **not** blacklisted.`);
        await interaction.editReply({embeds:[new EmbedBuilder().setColor(0xFF00FF).setTitle('🚫 User is Blacklisted')
          .addFields(
            {name:'User',value:`${entry.userTag} (${entry.userId})`,inline:true},
            {name:'Added By',value:entry.addedByTag,inline:true},
            {name:'Reason',value:entry.reason},
            {name:'Date',value:`<t:${Math.floor(entry.timestamp/1000)}:F>`}
          ).setTimestamp()]});
      }
    }

    // ── SET APP LINK ──
    else if (commandName==='setapplink') {
      const category=options.getString('category',true);
      const link=options.getString('link',true);
      const s=gs(guild.id);
      if (!s.appLinks) s.appLinks={};
      s.appLinks[category]=link;
      save();
      const labels={staff:'Staff Application',media:'Media Team Application',discord_appeal:'Discord Ban Appeal',ingame_appeal:'In-Game Appeal'};
      logCmd(interaction,'setapplink',{category,link});
      await interaction.editReply(`✅ Link for **${labels[category]}** set to:\n${link}`);
    }

    // ── VIEW APP LINKS ──
    else if (commandName==='viewapplinks') {
      const s=gs(guild.id);
      const links=s.appLinks||{};
      const labels={staff:'🛡️ Staff Application',media:'🎥 Media Team Application',discord_appeal:'⚖️ Discord Ban Appeal',ingame_appeal:'🎮 In-Game Appeal'};
      const e=new EmbedBuilder().setColor(0xE67E22).setTitle('📋 Application Links')
        .addFields(Object.entries(labels).map(([k,v])=>({name:v,value:links[k]?`[Click here](${links[k]})`:'Not set',inline:false})))
        .setTimestamp();
      await interaction.editReply({embeds:[e]});
    }

    else if (commandName==='automod') {
      const sub=options.getSubcommand(), s=gs(guild.id);
      if (sub==='status') {
        await interaction.editReply({embeds:[new EmbedBuilder().setColor(0x00AAFF).setTitle('🤖 AutoMod')
          .addFields(Object.entries(s.automod).map(([k,v])=>({name:k,value:v?'✅ On':'❌ Off',inline:true})))
          .addFields({name:'Bad Words',value:s.badWordList.join(', ')||'None'})]});
      } else if (sub==='set') {
        const feat=options.getString('feature',true), en=options.getBoolean('enabled',true);
        s.automod[feat]=en; save();
        logCmd(interaction,'automod set',{feature:feat,enabled:en});
        await interaction.editReply(`✅ **${feat}** is now **${en?'on':'off'}**.`);
      } else if (sub==='badword') {
        const action=options.getString('action',true), word=options.getString('word',true).toLowerCase();
        if (action==='add'&&!s.badWordList.includes(word)) s.badWordList.push(word);
        else if (action==='remove') s.badWordList=s.badWordList.filter(w=>w!==word);
        save();
        logCmd(interaction,'automod badword',{action,word});
        await interaction.editReply(`✅ **"${word}"** ${action==='add'?'added':'removed'}.`);
      }
    }
    else if (commandName==='setlogchannel') {
      const ch=options.getChannel('channel',true), s=gs(guild.id); s.logChannel=ch.id; save();
      logCmd(interaction,'setlogchannel',{channel:ch.name});
      await interaction.editReply(`✅ Log channel set to ${ch}.`);
    }
    else if (commandName==='setescalation') {
      const s=gs(guild.id);
      s.escalation={muteAt:options.getInteger('mute_at',true),kickAt:options.getInteger('kick_at',true),banAt:options.getInteger('ban_at',true)};
      save();
      logCmd(interaction,'setescalation',{...s.escalation});
      await interaction.editReply(`✅ Escalation: Mute@${s.escalation.muteAt} Kick@${s.escalation.kickAt} Ban@${s.escalation.banAt}`);
    }
    else if (commandName==='grantperm') {
      if (!member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.editReply('❌ Admins only.');
      const cmd=options.getString('command',true).toLowerCase(), role=options.getRole('role',true), s=gs(guild.id);
      if (!s.commandPerms[cmd]) s.commandPerms[cmd]=[];
      if (!s.commandPerms[cmd].includes(role.id)) s.commandPerms[cmd].push(role.id);
      save();
      logCmd(interaction,'grantperm',{command:cmd,role:role.name});
      await interaction.editReply(`✅ **${role.name}** can now use \`/${cmd}\`.`);
    }
    else if (commandName==='revokeperm') {
      if (!member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.editReply('❌ Admins only.');
      const cmd=options.getString('command',true).toLowerCase(), role=options.getRole('role',true), s=gs(guild.id);
      if (s.commandPerms[cmd]) s.commandPerms[cmd]=s.commandPerms[cmd].filter(r=>r!==role.id);
      save();
      logCmd(interaction,'revokeperm',{command:cmd,role:role.name});
      await interaction.editReply(`✅ **${role.name}** can no longer use \`/${cmd}\`.`);
    }
    else if (commandName==='listperms') {
      const s=gs(guild.id);
      const lines=Object.entries(s.commandPerms||{}).filter(([,r])=>r.length>0).map(([c,r])=>`**/${c}** → ${r.map(id=>`<@&${id}>`).join(', ')}`);
      await interaction.editReply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle('🔐 Command Permissions').setDescription(lines.join('\n')||'No custom permissions set.')]});
    }
    else if (commandName==='ticket') {
      const sub=options.getSubcommand(), s=gs(guild.id);
      if (sub==='setup') {
        const cat=options.getChannel('category',true), log=options.getChannel('log_channel'), sr=options.getRole('support_role');
        s.ticketCategory=cat.id;
        if (log) s.ticketLogChannel=log.id;
        if (sr&&!s.supportRoles.includes(sr.id)) s.supportRoles.push(sr.id);
        save();
        await interaction.editReply(`✅ Tickets configured!\nCategory: ${cat.name}${log?`\nLog: ${log}`:''}${sr?`\nSupport Role: ${sr}`:''}`);
      }
      else if (sub==='panel') {
        const ch=options.getChannel('channel',true), title=options.getString('title',true), desc=options.getString('description',true);
        const e=new EmbedBuilder().setColor(0x5865F2).setTitle(title).setDescription(desc)
          .addFields(
            {name:'👤 General Support',value:'↳ Questions and service-related assistance.'},
            {name:'⚙️ High Rank Support',value:'↳ Staff reports and major concerns.'},
            {name:'📋 Other',value:'↳ Anything else.'}
          );
        const menu=new StringSelectMenuBuilder().setCustomId('ticket_category_select').setPlaceholder('Select A Support Category...')
          .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('General Support').setDescription('Questions and service assistance').setValue('general').setEmoji('👤'),
            new StringSelectMenuOptionBuilder().setLabel('High Rank Support').setDescription('Staff reports and major concerns').setValue('highrank').setEmoji('⚙️'),
            new StringSelectMenuOptionBuilder().setLabel('Other').setDescription('Anything else').setValue('other').setEmoji('📋'),
          );
        await ch.send({embeds:[e],components:[new ActionRowBuilder().addComponents(menu)]});
        await interaction.editReply(`✅ Ticket panel posted in ${ch}.`);
      }
      else if (sub==='close') {
        const reason=options.getString('reason')||'No reason';
        const ticket=Object.values(db.tickets[guild.id]||{}).find(t=>t.channelId===interaction.channel.id&&t.status==='open');
        if (!ticket) return interaction.editReply('❌ Not an open ticket channel.');
        const row=new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel('Yes, Close').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('ticket_close_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
        );
        await interaction.editReply({embeds:[new EmbedBuilder().setColor(0xED4245).setTitle('Close Ticket?').setDescription(`Reason: ${reason}`)],components:[row]});
      }
      else if (sub==='add') {
        const user=options.getUser('user',true);
        await interaction.channel.permissionOverwrites.edit(user,{ViewChannel:true,SendMessages:true});
        await interaction.editReply(`✅ Added ${user} to ticket.`);
      }
      else if (sub==='remove') {
        const user=options.getUser('user',true);
        await interaction.channel.permissionOverwrites.edit(user,{ViewChannel:false,SendMessages:false});
        await interaction.editReply(`✅ Removed ${user} from ticket.`);
      }
      else if (sub==='rename') {
        const name=options.getString('name',true).toLowerCase().replace(/\s+/g,'-');
        await interaction.channel.setName(name);
        await interaction.editReply(`✅ Renamed to **${name}**.`);
      }
    }
    else if (commandName==='application') {
      const ch=options.getChannel('channel',true);
      const e=new EmbedBuilder().setColor(0xE67E22).setTitle('📋 Applications')
        .setDescription('We offer applications to join our Staff Team, Media Team, and Appeals for Discord Bans, and in-game Moderation.')
        .addFields({name:'📂 Applications and Appeals',value:'↳ Select a category below to begin.'});
      const menu=new StringSelectMenuBuilder().setCustomId('application_select').setPlaceholder('Applications and Appeals')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('Staff Application').setDescription('Apply to join the Staff Team').setValue('staff').setEmoji('🛡️'),
          new StringSelectMenuOptionBuilder().setLabel('Media Team Application').setDescription('Apply for the Media Team').setValue('media').setEmoji('🎥'),
          new StringSelectMenuOptionBuilder().setLabel('Discord Ban Appeal').setDescription('Appeal a Discord ban').setValue('discord_appeal').setEmoji('⚖️'),
          new StringSelectMenuOptionBuilder().setLabel('In-Game Appeal').setDescription('Appeal an in-game action').setValue('ingame_appeal').setEmoji('🎮'),
        );
      await ch.send({embeds:[e],components:[new ActionRowBuilder().addComponents(menu)]});
      await interaction.editReply(`✅ Applications panel posted in ${ch}.`);
    }
    else if (commandName==='session') {
      const ch=options.getChannel('channel',true), s=gs(guild.id);
      const msg=await ch.send({embeds:[buildSessionEmbed(s,guild.name)],components:buildSessionComponents(s.session)});
      s.session.channelId=ch.id; s.session.messageId=msg.id; save();
      await interaction.editReply(`✅ Session panel posted in ${ch}.\n\nGo to **Dashboard → Session** to configure and update live data.`);
    }
  } catch(err) {
    console.error(err);
    await interaction.editReply('❌ An error occurred.').catch(()=>{});
  }
});

// ─────────────────────────────────
//  TICKET HELPERS
// ─────────────────────────────────
async function createTicket(interaction) {
  await interaction.deferReply({ephemeral:true});
  const guild=interaction.guild, s=gs(guild.id);
  if (!s.ticketCategory) return interaction.editReply('❌ Run `/ticket setup` first.');
  const labels={general:'General Support',highrank:'High Rank Support',other:'Other'};
  const cat=interaction.values[0];
  if (!db.tickets[guild.id]) db.tickets[guild.id]={};
  if (!db.ticketCounter[guild.id]) db.ticketCounter[guild.id]=0;
  db.ticketCounter[guild.id]++;
  const num=String(db.ticketCounter[guild.id]).padStart(4,'0'), ticketId=uid();
  const perms=[
    {id:guild.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]},
    {id:interaction.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]},
    {id:client.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ManageChannels]},
  ];
  for (const r of (s.supportRoles||[])) perms.push({id:r,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]});
  let ch;
  try {
    ch=await guild.channels.create({name:`ticket-${num}`,type:ChannelType.GuildText,parent:s.ticketCategory,permissionOverwrites:perms,topic:`${labels[cat]} | ${interaction.user.tag} | ${ticketId}`});
  } catch { return interaction.editReply('❌ Failed to create ticket. Check bot permissions.'); }
  db.tickets[guild.id][ticketId]={id:ticketId,channelId:ch.id,userId:interaction.user.id,userTag:interaction.user.tag,category:cat,status:'open',createdAt:Date.now()}; save();
  const e=new EmbedBuilder().setColor(0x5865F2).setTitle(`${labels[cat]} — #${num}`)
    .setDescription(`Hello ${interaction.user}! Support will be with you shortly.\n\nPlease describe your issue in as much detail as possible.`)
    .addFields({name:'Category',value:labels[cat],inline:true},{name:'Opened By',value:interaction.user.tag,inline:true})
    .setFooter({text:`ID: ${ticketId}`}).setTimestamp();
  const btn=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'));
  await ch.send({content:`${interaction.user} ${(s.supportRoles||[]).map(r=>`<@&${r}>`).join(' ')}`,embeds:[e],components:[btn]});
  if (s.ticketLogChannel) {
    try { const lc=await guild.channels.fetch(s.ticketLogChannel); lc.send({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle('🎫 Ticket Opened').addFields({name:'User',value:interaction.user.tag,inline:true},{name:'Category',value:labels[cat],inline:true},{name:'Channel',value:ch.toString(),inline:true}).setTimestamp()]}); } catch {}
  }
  await interaction.editReply(`✅ Ticket created: ${ch}`);
}

async function closeTicket(interaction) {
  const guild=interaction.guild, s=gs(guild.id);
  const ticket=Object.values(db.tickets[guild.id]||{}).find(t=>t.channelId===interaction.channel.id&&t.status==='open');
  if (!ticket) return interaction.update({content:'❌ Ticket not found.',components:[]});
  ticket.status='closed'; ticket.closedAt=Date.now(); ticket.closedByTag=interaction.user.tag; save();
  if (s.ticketLogChannel) {
    try { const lc=await guild.channels.fetch(s.ticketLogChannel); lc.send({embeds:[new EmbedBuilder().setColor(0xED4245).setTitle('🔒 Ticket Closed').addFields({name:'ID',value:ticket.id,inline:true},{name:'By',value:interaction.user.tag,inline:true}).setTimestamp()]}); } catch {}
  }
  await interaction.update({content:'🔒 Closing in 5 seconds...',embeds:[],components:[]});
  setTimeout(()=>interaction.channel.delete().catch(()=>{}),5000);
}

async function handleApplication(interaction) {
  await interaction.deferReply({ephemeral:true});
  const s=gs(interaction.guild.id);
  const links=s.appLinks||{};
  const labels={
    staff:'Staff Application',
    media:'Media Team Application',
    discord_appeal:'Discord Ban Appeal',
    ingame_appeal:'In-Game Appeal',
  };
  const val=interaction.values[0];
  const label=labels[val];
  const link=links[val];
  const embed=new EmbedBuilder().setColor(0xE67E22).setTitle(`📋 ${label}`)
    .setDescription(link
      ? `Click the link below to proceed with your ${label}:\n\n**[Click Here to Open](${link})**\n\n${link}`
      : 'No link has been set for this category yet. Please contact a staff member or open a ticket.')
    .setFooter({text:'Contact a staff member if you need further help'})
    .setTimestamp();
  await interaction.editReply({embeds:[embed]});
}

// ─────────────────────────────────
//  READY + REGISTER
// ─────────────────────────────────
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  const rest=new REST({version:'10'}).setToken(process.env.BOT_TOKEN);
  try { await rest.put(Routes.applicationCommands(client.user.id),{body:commands}); console.log('✅ Commands registered.'); }
  catch(e) { console.error('Command registration failed:',e); }
  startAPI();
});

// ─────────────────────────────────
//  DASHBOARD API
// ─────────────────────────────────
function startAPI() {
  const app=express();
  app.use(cors({ origin: '*' }));
  app.use(express.json());
  app.use((req,res,next)=>{ next(); });

  app.get('/api/guilds',(_,res)=>res.json(client.guilds.cache.map(g=>({id:g.id,name:g.name,memberCount:g.memberCount,icon:g.iconURL()}))));
  app.get('/api/guilds/:id/settings',(req,res)=>res.json(gs(req.params.id)));
  app.patch('/api/guilds/:id/settings', async (req,res)=>{
    const s=gs(req.params.id); Object.assign(s,req.body); save();
    if (req.body.session) { const guild=client.guilds.cache.get(req.params.id); if (guild) await refreshSessionPanel(guild); }
    res.json(s);
  });
  app.get('/api/guilds/:id/modlog',(req,res)=>res.json((db.modlog||[]).filter(l=>l.guildId===req.params.id).slice(-500).reverse()));
  app.get('/api/guilds/:id/cmdlog',(req,res)=>res.json((db.cmdlog||[]).filter(l=>l.guildId===req.params.id).slice(-500).reverse()));
  app.get('/api/cmdlog/all',(_,res)=>res.json((db.cmdlog||[]).slice(-500).reverse()));
  app.get('/api/guilds/:id/warns',(req,res)=>res.json(db.warns[req.params.id]||{}));
  app.delete('/api/guilds/:g/warns/:u/:w',(req,res)=>{ const {g,u,w}=req.params; const warn=db.warns[g]?.[u]?.find(x=>x.id===w); if(warn){warn.removed=true;save();return res.json({success:true});} res.status(404).json({error:'Not found'}); });
  app.get('/api/guilds/:id/stats',(req,res)=>{
    const logs=(db.modlog||[]).filter(l=>l.guildId===req.params.id);
    const counts={}; for(const l of logs) counts[l.action]=(counts[l.action]||0)+1;
    const g=client.guilds.cache.get(req.params.id);
    const cmdCount=(db.cmdlog||[]).filter(l=>l.guildId===req.params.id).length;
    res.json({actionCounts:counts,totalActions:logs.length,memberCount:g?.memberCount||0,cmdCount});
  });
  app.get('/api/guilds/:id/tickets',(req,res)=>res.json(db.tickets[req.params.id]||{}));
  app.get('/api/guilds/:id/blacklist',(req,res)=>res.json(db.blacklist[req.params.id]||{}));
  app.post('/api/guilds/:id/blacklist',(req,res)=>{
    const {userId,userTag,reason,addedByTag}=req.body;
    if (!userId||!reason) return res.status(400).json({error:'userId and reason required'});
    if (!db.blacklist[req.params.id]) db.blacklist[req.params.id]={};
    db.blacklist[req.params.id][userId]={userId,userTag:userTag||userId,reason,addedByTag:addedByTag||'Dashboard',timestamp:Date.now()};
    save(); res.json({success:true});
  });
  app.delete('/api/guilds/:id/blacklist/:userId',(req,res)=>{
    const {id,userId}=req.params;
    if (db.blacklist[id]?.[userId]) { delete db.blacklist[id][userId]; save(); return res.json({success:true}); }
    res.status(404).json({error:'Not found'});
  });
  app.get('/api/guilds/:id/notes',(req,res)=>res.json(db.notes[req.params.id]||{}));

  const PORT=process.env.API_PORT||3001;
  app.listen(PORT,()=>console.log(`📊 Dashboard API on :${PORT}`));
}

client.login(process.env.BOT_TOKEN);