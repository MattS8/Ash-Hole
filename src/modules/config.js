const fs = require('fs');

let config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

module.exports = {
    getConfig: getConfig,
    setConfig: setConfig
}

function getConfig() {
    return config;
}

function setConfig(newConfig) {
    config = newConfig;
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
}

