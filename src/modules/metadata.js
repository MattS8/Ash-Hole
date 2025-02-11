const fs = require('fs');

let metadata = JSON.parse(fs.readFileSync('metadata.json', 'utf8'));

module.exports = {
    getMetadata: getMetadata,
    setMetadata: setMetadata
}

function getMetadata() {
    return metadata;
}

function setMetadata(newMetadata) {
    metadata = newMetadata;
    fs.writeFileSync('metadata.json', JSON.stringify(metadata, null, 2));
}


