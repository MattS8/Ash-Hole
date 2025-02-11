const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType } = require('discord.js');
const config = require('./config.js');
const MetaData = require('./metadata.js');
const fs = require('fs');
let gClient = null;

// function generateRequestsFeed() {
//     const metadata = require('../../metadata.json');
//     const requesters = metadata.requesters;

//     let feedMessages = [];
//     let msgEmbeds = 0;
    
//     const feed = []

//     for (const requesterId in requesters) {
//         const requester = requesters[requesterId];
//         feed.push({
//             "content": `**${requesters[requesterId].name}'s Requests:**`,
//             "tts": false,
//             "embeds": [],
//             "components": [],
//             "actions": []
//         });

//         let newEmbed = new EmbedBuilder()
        
//         // Loop through each resource request for this requester
//         for (const resourceId in requester.requests) {
//             const request = requester.requests[resourceId];

//             newEmbed.addFields({
//                 name: request.name,
//                 value: Object.entries(request.amount)
//                     .filter(([rarity, amount]) => amount > 0)
//                     .map(([rarity, amount]) => `- **${rarity}:** ${amount}`)
//                     .join('\n')
//             })
//         }
//         feed[feed.length - 1].embeds.push(newEmbed)
//     }
    
//     return feed;
// }

function writeRequestMessageToMetaFile(requesterId, messageId) {
    let metadata = MetaData.getMetadata();
    let requestMessages = metadata.request_messages || {};
    requestMessages[requesterId] = messageId;
    metadata.request_messages = requestMessages;
    MetaData.setMetadata(metadata);
}

function allAmountsZero(amounts) {
    return Object.keys(amounts).every(key => amounts[key] === 0);
}


function removeRequests(values, requesterId, channel, messageId) {
    let metadata = MetaData.getMetadata();
    const requesters = metadata.requesters;
    const requester = requesters[requesterId];

    for (const value of values) {
        const [resourceId, rarity] = value.split('_');
        requester.requests[resourceId].amount[rarity] = 0;
        if (allAmountsZero(requester.requests[resourceId].amount)) {
            delete requester.requests[resourceId];
        }
    }

    console.log(`Number of requests remaining: ${Object.keys(requester.requests).length}`);

    if (Object.keys(requester.requests).length === 0) {
        delete requesters[requesterId];
        channel.messages.fetch(messageId)
            .then(message => message.delete())
            .catch(console.error);
        MetaData.setMetadata(metadata);
    } else {
        MetaData.setMetadata(metadata);
        sendRequestMessage(requesterId);
    }
}


function sendNewMessage(channel, newEmbed, requesterId, actionRows) {
    channel.send({embeds: [newEmbed], components: actionRows}).then(message => {
        writeRequestMessageToMetaFile(requesterId, message.id);

        if (actionRows.length >= 1) {
            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                filter: i => i.user.id === i.user.id && i.customId.startsWith(`clear_${requesterId}_`),
            })
            
            collector.on('collect', (interaction) => {
                if (interaction.user.id !== requesterId) {
                    const cfg = config.getConfig();
                    const member = interaction.member;
                    if (!member.roles.cache.has(cfg.roles.officer)) {
                        interaction.reply({ content: "You don't have permission to clear requests!", ephemeral: true });
                        return;
                    }
                }
                if (interaction.values.length > 0) {
                    removeRequests(interaction.values, requesterId, channel, message.id);
                    interaction.deferUpdate();
                }
            })
        }

    })
}

function sendErrorMessage(requesterId, message) {
    const cfg = config.getConfig();
    const channel = gClient.channels.cache.get(cfg.channels.resource_requests);
    if (!channel) {
        console.error(`Failed to get channel. Cache contents:`, 
            Array.from(gClient.channels.cache.map(c => ({id: c.id, name: c.name}))));
        throw new Error(`Cannot find channel with ID ${channelId}. Make sure the bot has access to this channel.`);
    }
    
}

function sendRequestMessage(requesterId) {
    if (gClient === null) {
        const { client } = require('../index');
        gClient = client;
    }
    const metadata = MetaData.getMetadata();
    const requesters = metadata.requesters;
    const requester = requesters[requesterId];

    const titleString = `**${requester.name}'s Requests:**`
    const dividerString = '-'.repeat(titleString.length + 10)
    let newEmbed = new EmbedBuilder()
        .setTitle(titleString)
        .setDescription(dividerString)

    const options = [[]]

    for (const resourceId in requester.requests) {
        
        const request = requester.requests[resourceId];
        
        for (const rarity in request.amount) {
            if (options[options.length - 1].length >= 25) {
                if (options.length >= 3) {
                    sendErrorMessage(requesterId, "⚠️ You have too many requests to display! Please clear some requests and try again. ⚠️");
                    break;
                } else {
                    options.push([])
                }
            }
            if (request.amount[rarity] <= 0) {
                continue;
            }

            options[options.length - 1].push(new StringSelectMenuOptionBuilder()
                .setLabel(`${request.name} - ${rarity}`)
                .setValue(`${resourceId}_${rarity}`)
            )

        }

        newEmbed.addFields({
            name: request.name,
            value: Object.entries(request.amount)
                .filter(([rarity, amount]) => amount > 0)
                .map(([rarity, amount]) => `- **${rarity}:** ${amount}`)
                .join('\n')
        })
        console.log(`request.amount: ${JSON.stringify(request.amount)}`)
    }
    if (options.length > 1 && options[options.length - 1].length === 0) {
        console.log('popping empty option array')
        options.pop();
    }

    const actionRows = []

    let i = 0;
    for (const option of options) {
        console.log(`num options: ${option.length}`)
        if (option.length === 0) {
            continue;
        }
        const placeholder = options.length > 1 ? `Select request(s) to remove... (${i + 1}/${options.length})` : 'Select request(s) to remove...';
        actionRows.push(new ActionRowBuilder()
            .addComponents(new StringSelectMenuBuilder()
                .setCustomId(`clear_${requesterId}_${i}`)
                .setPlaceholder(placeholder)
                .setMinValues(1)
                .setMaxValues(option.length)
                .setOptions(option)))
        i++;
    }

    const requestMessages = metadata.request_messages || {};
    const prevMessageId = requestMessages[requesterId];
    const cfg = config.getConfig();
    const channel = gClient.channels.cache.get(cfg.channels.resource_requests);
    if (!channel) {
        console.error(`Failed to get channel. Cache contents:`, 
            Array.from(gClient.channels.cache.map(c => ({id: c.id, name: c.name}))));
        throw new Error(`Cannot find channel with ID ${channelId}. Make sure the bot has access to this channel.`);
    }
    const messages = channel.messages
    if (prevMessageId && messages) {
        messages.fetch(prevMessageId)
        .then(message => message.delete({embeds: [newEmbed], components: actionRows}).then(() => sendNewMessage(channel, newEmbed, requesterId, actionRows)))
        .catch(() => {
            // If message not found, send new message
            let metadata = MetaData.getMetadata();
            metadata.request_messages[requesterId] = null;
            MetaData.setMetadata(metadata);
            sendNewMessage(channel, newEmbed, requesterId, actionRows);
        });

    } else {
        sendNewMessage(channel, newEmbed, requesterId, actionRows);
    }
}


module.exports = {
    sendRequestMessage
}

