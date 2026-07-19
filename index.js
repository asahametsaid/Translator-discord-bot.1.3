const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    ActivityType 
} = require('discord.js');

const translate = require("@iamtraction/google-translate");
const fs = require("fs");

// =========================
// CONFIG
// =========================

const TOKEN = "TOKEN";
const CLIENT_ID = "SERVER-ID";

const ALLOWED_GUILDS = [
    "953365014176227408",
    "868429581676339211"
];

const ALLOWED_ROLES = {  // Allowed Roles. Please Enter Your ID.
    "": "",
    "": ""
};
// =========================
// DATABASE FILES
// =========================
const CHANNELS_FILE = "./channels.json";
const PANEL_CHANNELS_FILE = "./panelChannels.json";

// =========================
// LOAD DATABASES
// =========================
let allowedChannels = fs.existsSync(CHANNELS_FILE)
    ? JSON.parse(fs.readFileSync(CHANNELS_FILE))
    : [];

let panelChannels = fs.existsSync(PANEL_CHANNELS_FILE)
    ? JSON.parse(fs.readFileSync(PANEL_CHANNELS_FILE))
    : [];

// =========================
// SAVE FUNCTIONS
// =========================
function saveChannels() {
    fs.writeFileSync(CHANNELS_FILE, JSON.stringify(allowedChannels, null, 2));
}

function savePanelChannels() {
    fs.writeFileSync(PANEL_CHANNELS_FILE, JSON.stringify(panelChannels, null, 2));
}

// =========================
// ROLE CHECK
// =========================
function hasRole(member, guildId) {
    const roleId = ALLOWED_ROLES[guildId];
    if (!roleId) return false;
    return member.roles.cache.has(roleId);
}

// =========================
// CACHE
// =========================
const selectedMessages = new Map();
const privacyMode = new Map();
const translateCache = new Map();

// =========================
// CLIENT INSTANCE
// =========================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// =========================
// READY EVENT
// =========================
client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
    const setStatus = () => {
        client.user.setPresence({
            activities: [{ name: "7/24 Active Translator Bot", type: ActivityType.Playing }],
            status: "idle"
        });
    };
    setStatus();
    setInterval(setStatus, 60000);
});

// =========================
// INTERACTIONS INTERCEPTOR
// =========================
client.on("interactionCreate", async (interaction) => {

    if (interaction.guildId && !ALLOWED_GUILDS.includes(interaction.guildId)) {
        return;
    }

    // =========================
    // SLASH COMMANDS HANDLER
    // =========================
    if (interaction.isChatInputCommand()) {

        if ([
            "add-channel", "remove-channel", "list-channels",
            "add-panel-channel", "remove-panel-channel", "list-panel-channels"
        ].includes(interaction.commandName)) {
            if (!hasRole(interaction.member, interaction.guildId)) {
                return interaction.reply({ content: "❌ You don't have permission!", ephemeral: true });
            }
        }

        // 1. TRANSLATE PUBLIC & PRIVATE COMMANDS
        if (interaction.commandName === "translate-public" || interaction.commandName === "translate-private") {
            if (!allowedChannels.includes(interaction.channel.id)) {
                return interaction.reply({ content: "❌ This channel is not allowed!", ephemeral: true });
            }

            const text = interaction.options.getString("text");
            translateCache.set(interaction.user.id, text);
            
            // Gizlilik modunu komut ismine göre doğrudan belirliyoruz
            const mode = interaction.commandName === "translate-public" ? "public" : "private";
            privacyMode.set(interaction.user.id, mode);

            const langMenu = new StringSelectMenuBuilder()
                .setCustomId("translate_language")
                .setPlaceholder("Select language")
                .addOptions([
                    { label: "Turkish", value: "tr" },
                    { label: "English", value: "en" },
                    { label: "Spanish", value: "es" },
                    { label: "Indonesian", value: "id" },
                    { label: "Czech", value: "cs" },
                    { label: "German", value: "de" },
                    { label: "Ukrainian", value: "uk" },
                    { label: "Portuguese", value: "pt" },
                    { label: "Russian", value: "ru" },
                    { label: "Chinese", value: "zh-CN" },
                    { label: "French", value: "fr" },
                    { label: "Holland", value: "nl" },
                    { label: "Hindi", value: "hi" },
                    { label: "Romanian", value: "ro" },
                    { label: "Sweden", value: "sv" },
                    { label: "Greece", value: "el" },
                    { label: "Filipino", value: "tl" },
                    { label: "Iran (Persian)", value: "fa" },
                    { label: "Arabic", value: "ar" }
                ]);

            const row = new ActionRowBuilder().addComponents(langMenu);
            return interaction.reply({ content: "🌍 Select language:", components: [row], ephemeral: true });
        }

        // 2. TRANSLATE HISTORY PUBLIC & PRIVATE COMMANDS
        if (interaction.commandName === "translate-history-public" || interaction.commandName === "translate-history-private") {
            if (!allowedChannels.includes(interaction.channel.id)) {
                return interaction.reply({ content: "❌ This channel is not allowed!", ephemeral: true });
            }

            const fetched = await interaction.channel.messages.fetch({ limit: 30 });
            const messages = [...fetched.values()]
                .filter(m => !m.author.bot && m.content)
                .slice(0, 25);

            if (!messages.length) {
                return interaction.reply({ content: "❌ No messages found!", ephemeral: true });
            }

            // Gizlilik modunu komut ismine göre doğrudan belirliyoruz
            const mode = interaction.commandName === "translate-history-public" ? "public" : "private";
            privacyMode.set(interaction.user.id, mode);

            const menu = new StringSelectMenuBuilder()
                .setCustomId("select_message")
                .setPlaceholder("Select a message")
                .addOptions(
                    messages.map(m => ({
                        label: m.author.username.slice(0, 25),
                        description: m.content.slice(0, 50),
                        value: m.id
                    }))
                );

            const row = new ActionRowBuilder().addComponents(menu);
            return interaction.reply({ content: "📜 Select a message:", components: [row], ephemeral: true });
        }

        // 3. TRANSLATE THE PANEL COMMAND
        if (interaction.commandName === "translate-the-panel") {
            if (!panelChannels.includes(interaction.channel.id)) {
                return interaction.reply({ content: "❌ This is not a panel channel!", ephemeral: true });
            }

            const fetched = await interaction.channel.messages.fetch({ limit: 10 });
            const targetMessage = [...fetched.values()].find(m => !m.author.bot && m.content);

            if (!targetMessage) {
                return interaction.reply({
                    content: "❌ No valid user message found to translate!",
                    ephemeral: true
                });
            }

            selectedMessages.set(interaction.channel.id, targetMessage.id);

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("panel_lang_tr").setLabel("TR Turkish").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("panel_lang_en").setLabel("GB English").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("panel_lang_id").setLabel("ID Indonesian").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("panel_lang_es").setLabel("ES Spanish").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("panel_lang_de").setLabel("DE German").setStyle(ButtonStyle.Primary)
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("panel_lang_ru").setLabel("RU Russian").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("panel_lang_hi").setLabel("IN Hindi").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("panel_lang_tl").setLabel("PH Filipino").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("panel_lang_ar").setLabel("AR Arabic").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("panel_lang_cs").setLabel("CZ Czech").setStyle(ButtonStyle.Primary)
            );

            const row3 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("panel_lang_uk").setLabel("UA Ukrainian").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("panel_lang_pt").setLabel("PT Portuguese").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("panel_lang_zh-CN").setLabel("CN Chinese").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("panel_lang_fr").setLabel("FR French").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("panel_lang_nl").setLabel("NL Holland").setStyle(ButtonStyle.Primary)
            );

            const row4 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("panel_lang_ro").setLabel("RO Romanian").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("panel_lang_sv").setLabel("SE Sweden").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("panel_lang_el").setLabel("GR Greece").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("panel_lang_fa").setLabel("IR Iran").setStyle(ButtonStyle.Primary)
            );

            return interaction.reply({
                content: "🌍 **Select language:**",
                components: [row1, row2, row3, row4]
            });
        }

        // ADMIN COMMANDS
        if (interaction.commandName === "add-channel") {
            const channel = interaction.options.getChannel("channel");
            if (!allowedChannels.includes(channel.id)) { allowedChannels.push(channel.id); saveChannels(); }
            return interaction.reply({ content: `✅ Added: ${channel}`, ephemeral: true });
        }

        if (interaction.commandName === "remove-channel") {
            const channel = interaction.options.getChannel("channel");
            if (!allowedChannels.includes(channel.id)) { return interaction.reply({ content: "❌ Channel not found!", ephemeral: true }); }
            allowedChannels = allowedChannels.filter(id => id !== channel.id); saveChannels();
            return interaction.reply({ content: `🗑 Removed: ${channel}`, ephemeral: true });
        }

        if (interaction.commandName === "list-channels") {
            if (!allowedChannels.length) { return interaction.reply({ content: "❌ No channels added!", ephemeral: true }); }
            
            let msgContent = "📜 **Allowed Channels List (By Server):**\n";
            for (const guildId of ALLOWED_GUILDS) {
                const guild = client.guilds.cache.get(guildId);
                const guildName = guild ? guild.name : `Unknown Server (${guildId})`;
                const filtered = allowedChannels.filter(id => {
                    const ch = client.channels.cache.get(id);
                    return ch && ch.guildId === guildId;
                });
                
                if (filtered.length > 0) {
                    msgContent += `\n**🏰 ${guildName}:**\n` + filtered.map(id => `> <#${id}>`).join("\n") + "\n";
                }
            }
            return interaction.reply({ content: msgContent, ephemeral: true });
        }

        if (interaction.commandName === "add-panel-channel") {
            const channel = interaction.options.getChannel("channel");
            if (!panelChannels.includes(channel.id)) { panelChannels.push(channel.id); savePanelChannels(); }
            return interaction.reply({ content: `✅ Panel channel added: ${channel}`, ephemeral: true });
        }

        if (interaction.commandName === "remove-panel-channel") {
            const channel = interaction.options.getChannel("channel");
            if (!panelChannels.includes(channel.id)) { return interaction.reply({ content: "❌ Panel channel not found!", ephemeral: true }); }
            panelChannels = panelChannels.filter(id => id !== channel.id); savePanelChannels();
            return interaction.reply({ content: `🗑 Removed panel channel: ${channel}`, ephemeral: true });
        }

        if (interaction.commandName === "list-panel-channels") {
            if (!panelChannels.length) { return interaction.reply({ content: "❌ No panel channels!", ephemeral: true }); }
            
            let msgContent = "📜 **Panel Channels List (By Server):**\n";
            for (const guildId of ALLOWED_GUILDS) {
                const guild = client.guilds.cache.get(guildId);
                const guildName = guild ? guild.name : `Unknown Server (${guildId})`;
                const filtered = panelChannels.filter(id => {
                    const ch = client.channels.cache.get(id);
                    return ch && ch.guildId === guildId;
                });
                
                if (filtered.length > 0) {
                    msgContent += `\n**🏰 ${guildName}:**\n` + filtered.map(id => `> <#${id}>`).join("\n") + "\n";
                }
            }
            return interaction.reply({ content: msgContent, ephemeral: true });
        }
    }

    // =========================
    // BUTTON INTERACTIONS HANDLER
    // =========================
    if (interaction.isButton()) {
        if (interaction.customId.startsWith("panel_lang_")) {
            
            await interaction.deferReply({ ephemeral: true });

            const lang = interaction.customId.replace("panel_lang_", "");
            const msgId = selectedMessages.get(interaction.channel.id);

            if (!msgId) {
                return interaction.editReply({ content: "❌ Message context lost! Please reuse the panel command." });
            }

            const msg = await interaction.channel.messages.fetch(msgId).catch(() => null);

            if (!msg) {
                return interaction.editReply({ content: "❌ Message not found!" });
            }

            try {
                console.log(`[LOG] User: ${interaction.user.tag} (${interaction.user.id}) used Panel Translation in Guild: ${interaction.guild.name} (${interaction.guild.id}) for Language: ${lang}`);

                const res = await translate(msg.content, { to: lang });
                let translatedText = res.text;

                const flagMap = {
                    tr: "🇹🇷", en: "🇬🇧", id: "🇮🇩", es: "🇪🇸", de: "🇩🇪", 
                    ru: "🇷🇺", hi: "🇮🇳", tl: "🇵🇭", ar: "🇸🇦", cs: "🇨🇿", 
                    uk: "🇺🇦", pt: "🇵🇹", "zh-CN": "🇨🇳", fr: "🇫🇷", nl: "🇳🇱", 
                    ro: "🇷🇴", sv: "🇸🇪", el: "🇬🇷", fa: "🇮🇷"
                };
                const flag = flagMap[lang] || "🏳️";

                const header = `🌍 ${flag} Translation:\n`;
                const fullMessage = header + translatedText;

                const MAX_LIMIT = 1900; 

                if (fullMessage.length <= 2000) {
                    return interaction.editReply({ content: fullMessage });
                } else {
                    const chunks = [];
                    let currentChunk = header;
                    const lines = translatedText.split("\n");

                    for (const line of lines) {
                        if ((currentChunk + "\n" + line).length > MAX_LIMIT) {
                            chunks.push(currentChunk);
                            currentChunk = line;
                        } else {
                            currentChunk += (currentChunk === header ? "" : "\n") + line;
                        }
                    }
                    if (currentChunk) chunks.push(currentChunk);

                    await interaction.editReply({ content: chunks[0] });

                    for (let i = 1; i < chunks.length; i++) {
                        await interaction.followUp({ content: chunks[i], ephemeral: true });
                    }
                }

            } catch (err) {
                console.log(err.message);
                return interaction.editReply({ content: "❌ Translation failed!" });
            }
        }
    }

    // =========================
    // SELECT MENUS HANDLER
    // =========================
    if (interaction.isStringSelectMenu()) {

        if (interaction.customId === "translate_language") {
            const lang = interaction.values[0];
            const text = translateCache.get(interaction.user.id);
            const mode = privacyMode.get(interaction.user.id) || "private";

            if (!text) {
                return interaction.update({ content: "❌ Translation expired!", components: [] });
            }

            try {
                console.log(`[LOG] User: ${interaction.user.tag} (${interaction.user.id}) used /translate Command [Mode: ${mode}] in Guild: ${interaction.guild.name} (${interaction.guild.id}) for Language: ${lang}`);

                const res = await translate(text, { to: lang });
                const finalText = `🌍 Translation (${lang})\n\n📝 Original:\n${text}\n\n✅ Translated:\n${res.text}`;

                if (mode === "private") {
                    return interaction.update({ content: finalText, components: [] });
                }

                await interaction.channel.send({ content: finalText });
                return interaction.update({ content: "✅ Translation sent publicly!", components: [] });

            } catch (err) {
                console.log(err.message);
                return interaction.update({ content: "❌ Translation failed!", components: [] });
            }
        }

        if (interaction.customId === "select_message") {
            const msgId = interaction.values[0];
            selectedMessages.set(interaction.user.id, msgId);

            // Ara gizlilik seçim menüsünü atlayıp doğrudan dil listesini gönderiyoruz
            const langMenu = new StringSelectMenuBuilder()
                .setCustomId("select_language")
                .setPlaceholder("Select language")
                .addOptions([
                    { label: "Turkish", value: "tr" },
                    { label: "English", value: "en" },
                    { label: "Spanish", value: "es" },
                    { label: "Indonesian", value: "id" },
                    { label: "Czech", value: "cs" },
                    { label: "German", value: "de" },
                    { label: "Ukrainian", value: "uk" },
                    { label: "Portuguese", value: "pt" },
                    { label: "Russian", value: "ru" },
                    { label: "Chinese", value: "zh-CN" },
                    { label: "French", value: "fr" },
                    { label: "Holland", value: "nl" },
                    { label: "Hindi", value: "hi" },
                    { label: "Romanian", value: "ro" },
                    { label: "Sweden", value: "sv" },
                    { label: "Greece", value: "el" },
                    { label: "Filipino", value: "tl" },
                    { label: "Iran (Persian)", value: "fa" },
                    { label: "Arabic", value: "ar" }
                ]);

            const row = new ActionRowBuilder().addComponents(langMenu);
            return interaction.update({ content: "🌍 Select language:", components: [row] });
        }

        if (interaction.customId === "select_language") {
            const lang = interaction.values[0];
            const msgId = selectedMessages.get(interaction.user.id);
            const mode = privacyMode.get(interaction.user.id) || "private";

            if (!msgId) {
                return interaction.update({ content: "❌ Message expired!", components: [] });
            }

            const msg = await interaction.channel.messages.fetch(msgId).catch(() => null);

            if (!msg) {
                return interaction.update({ content: "❌ Message not found!", components: [] });
            }

            try {
                console.log(`[LOG] User: ${interaction.user.tag} (${interaction.user.id}) used /translate-history Command [Mode: ${mode}] in Guild: ${interaction.guild.name} (${interaction.guild.id}) for Language: ${lang}`);

                const res = await translate(msg.content, { to: lang });
                const finalText = `🌍 Translation (${lang})\n\n👤 Author:\n${msg.author.username}\n\n📝 Original:\n${msg.content}\n\n✅ Translated:\n${res.text}`;

                if (mode === "private") {
                    return interaction.update({ content: finalText, components: [] });
                }

                await interaction.channel.send({ content: finalText });
                return interaction.update({ content: "✅ Translation sent publicly!", components: [] });

            } catch (err) {
                console.log(err.message);
                return interaction.update({ content: "❌ Translation failed!", components: [] });
            }
        }
    }
});

// =========================
// APPLICATION SLASH COMMANDS BUILDER
// =========================
const commands = [
    new SlashCommandBuilder().setName("translate-public").setDescription("Translate text and post publicly").addStringOption(opt => opt.setName("text").setDescription("Text").setRequired(true)),
    new SlashCommandBuilder().setName("translate-private").setDescription("Translate text privately (ephemeral)").addStringOption(opt => opt.setName("text").setDescription("Text").setRequired(true)),
    new SlashCommandBuilder().setName("translate-history-public").setDescription("Translate recent messages and post publicly"),
    new SlashCommandBuilder().setName("translate-history-private").setDescription("Translate recent messages privately (ephemeral)"),
    new SlashCommandBuilder().setName("translate-the-panel").setDescription("Translate previous message"),
    new SlashCommandBuilder().setName("add-channel").setDescription("Add channel").addChannelOption(opt => opt.setName("channel").setDescription("Channel").setRequired(true)),
    new SlashCommandBuilder().setName("remove-channel").setDescription("Remove channel").addChannelOption(opt => opt.setName("channel").setDescription("Channel").setRequired(true)),
    new SlashCommandBuilder().setName("list-channels").setDescription("List channels"),
    new SlashCommandBuilder().setName("add-panel-channel").setDescription("Add panel channel").addChannelOption(opt => opt.setName("channel").setDescription("Channel").setRequired(true)),
    new SlashCommandBuilder().setName("remove-panel-channel").setDescription("Remove panel channel").addChannelOption(opt => opt.setName("channel").setDescription("Channel").setRequired(true)),
    new SlashCommandBuilder().setName("list-panel-channels").setDescription("List panel channels")
].map(cmd => cmd.toJSON());

// =========================
// REGISTER SLASH COMMANDS REST
// =========================
const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
    try {
        for (const guildId of ALLOWED_GUILDS) {
            await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, guildId),
                { body: commands }
            );
        }
        console.log("Slash commands loaded successfully!");
    } catch (err) {
        console.log(err);
    }
})();

// =========================
// CLIENT LOGIN
// =========================
client.login(TOKEN);
