require('dotenv').config();
const config = require('./modules/config');
const fs = require('fs');

const { 
    Client, 
    Events, 

    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder
} = require('discord.js');

const Commands = {};
const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    const commandName = file.split('.')[0];
    Commands[commandName] = command;
}

const token = process.env.DISCORD_TOKEN;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function handleButtonInteraction(interaction) {
    const command = Commands[interaction.customId];
    if (!command) return;

    const handleFunction = command.run;
    if (handleFunction) await handleFunction(interaction, client);
}   

async function handleCommandInteraction(interaction) {
    const command = Commands[interaction.commandName];
    if (!command) return;

    const handleFunction = command.run;
    if (handleFunction) await handleFunction(interaction, client);
}

async function handleAutocompleteInteraction(interaction) {
    const command = Commands[interaction.commandName];
    if (!command) return;

    const handleFunction = command.autocomplete;
    if (handleFunction) await handleFunction(interaction);
}

client.once(Events.ClientReady, (c) => {

    console.log(`Ready! Logged in as ${c.user.tag}`);

    for (const command of Object.values(Commands)) {
        client.application.commands.create(command.data);
    }

    // Remove all messages in the resource request channel
    const cfg = config.getConfig();
    const resourceRequestChannelId = cfg.channels.resource_requests;
    const channel = client.channels.cache.get(resourceRequestChannelId);
    if (channel && channel.messages) {
        // Fetch all messages
        channel.messages.fetch()
            .then(async messages => {
                try {
                    // Split messages into chunks and handle them appropriately
                    const messageArray = Array.isArray(messages) ? messages : typeof messages === 'object' ? Array.from(messages.values()) : [];
                    
                    // Process in chunks of 100
                    for (let i = 0; i < messageArray.length; i += 100) {
                        const chunk = messageArray.slice(i, i + 100);
                        try {
                            // Try bulk delete first (for messages < 14 days old)
                            await channel.bulkDelete(chunk, true)
                                .catch(async () => {
                                    // If bulk delete fails, delete messages individually
                                    for (const message of chunk) {
                                        await message.delete().catch(console.error);
                                        // Add a small delay to avoid rate limits
                                        await new Promise(resolve => setTimeout(resolve, 100));
                                    }
                                });
                        } catch (error) {
                            console.error(`Error deleting messages chunk: ${error}`);
                        }
                    }
                } catch (error) {
                    console.error(`Error in message deletion process: ${error}`);
                }

                // Initialize resource after all deletions
                await Commands.request_resource.initialize(client);
            })
            .catch(error => { console.error(`Error fetching messages: ${error} \n ${error.stack}`); });
    } else {
        console.log('Resource request channel not found');
    }
});


client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isButton()) await handleButtonInteraction(interaction);
    if (interaction.isCommand()) await handleCommandInteraction(interaction);
    if (interaction.isAutocomplete()) await handleAutocompleteInteraction(interaction);
});

client.login(token);

module.exports = {
    client
}