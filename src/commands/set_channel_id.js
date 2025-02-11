const { SlashCommandBuilder } = require('discord.js');
const config = require('../modules/config');

const data = new SlashCommandBuilder()
        .setName('set_channel_id')
        .setDescription('Set the channel ID for the bot to send certain messages in')
        .addStringOption(option =>
            option.setName('channel_id')
                .setDescription('The ID of the channel to send messages in')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('messages_type')
                .setDescription('The type of messages to send in the channel')
                .setRequired(true)
                .addChoices(
                    { name: 'Resource Requests', value: 'resource_requests' },
                )
        )

async function run(interaction, client) {
    const channelID = interaction.options.getString('channel_id');
    const channelType = interaction.options.getString('messages_type');

    if (channelType === 'resource_requests') {
        const cfg = config.getConfig();
        cfg.channels.resource_requests = channelID;
        config.setConfig(cfg);
    }

    await interaction.reply({ content: `Set ${channelType} channel to ${channelID}`, flags: ['Ephemeral'] });
}

module.exports = {
    data: data,
    run: run
}

