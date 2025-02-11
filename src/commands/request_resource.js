const { SlashCommandBuilder } = require('discord.js');
const resources = require('../data/items.json');
const MetaData = require('../modules/metadata');
const config = require('../modules/config');
const fs = require('fs');
const { sendRequestMessage } = require('../modules/resource_requests');

const data = new SlashCommandBuilder()
        .setName('request_resource')
        .setDescription('Request a resource')
        .addStringOption(option => 
            option.setName('name')
                .setDescription('The name of the resource')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option => 
            option.setName('rarity')
                .setDescription('The rarity of the resource')
                .setRequired(true)
                .addChoices(
                    { name: 'Common', value: 'common' },
                    { name: 'Uncommon', value: 'uncommon' },
                    { name: 'Rare', value: 'rare' },
                    { name: 'Heroic', value: 'heroic' },
                    { name: 'Epic', value: 'epic' },
                    { name: 'Legendary', value: 'legendary' },
                )
        )
        .addStringOption(option =>
            option.setName('amount')
                .setDescription('The amount of resources you want to request')
                .setRequired(true)
        )

function addRequestToMetadata(interaction, resource, rarity, amount) {
    let metadata = MetaData.getMetadata();
    let requesters = metadata.requesters || {};
    let requester = requesters[interaction.user.id] || {
        id: interaction.user.id,
        name: interaction.member.displayName,
        requests: {}
    };

    if (!requester.requests[resource.id]) {
        requester.requests[resource.id] = {
            name: resource.name,
            amount: {
                common: 0,
                uncommon: 0,
                rare: 0,
                heroic: 0,
                epic: 0,
                legendary: 0
            },
            timestamp: Date.now(),
        }
    }
    requester.requests[resource.id].amount[rarity] += parseInt(amount);
    requesters[interaction.user.id] = requester;
    metadata.requesters = requesters;
    MetaData.setMetadata(metadata);
}

async function run(interaction, client) {
    const name = interaction.options.getString('name');
    const rarity = interaction.options.getString('rarity');
    const amount = interaction.options.getString('amount');
    const resource = resources.resources.find(resource => resource.id === parseInt(name));

    if (!resource) {
        await interaction.reply({ content: '⚠️ Resource not found ⚠️', flags: ['Ephemeral'] });
        return;
    }

    const cfg = config.getConfig();
    const channel = client.channels.cache.get(cfg.channels.resource_requests);
    if (!channel) {
        await interaction.reply({ content: '⚠️ Resource request channel not set ⚠️', flags: ['Ephemeral'] });
        return;
    }

    addRequestToMetadata(interaction, resource, rarity, amount);
    sendRequestMessage(interaction.user.id, channel);

    await interaction.deferReply({ flags: ['Ephemeral'] });
    await interaction.deleteReply();

}

async function autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();

    const filtered = resources.resources.filter(resource => resource.name.toLowerCase().includes(focusedValue.toLowerCase()));
    const results = filtered.map(resource => ({ name: resource.name, value: resource.id.toString() }));

    await interaction.respond(results.slice(0, 25))
}

async function initialize(client) {
    const metadata = MetaData.getMetadata();
    const requesters = metadata.requesters;
    for (const requester of Object.values(requesters)) {
        sendRequestMessage(requester.id, client);
    }
}


module.exports = {
    data,
    run,
    autocomplete,
    initialize
};

