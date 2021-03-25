const download = require('download'); 

const urls = [
    "https://scrapmechanic.com/api/index.html",
    "https://scrapmechanic.com/api/whats_new.html",
    "https://scrapmechanic.com/api/script_classes.html",
    "https://scrapmechanic.com/api/game_objects.html",
    "https://scrapmechanic.com/api/managers.html",
    "https://scrapmechanic.com/api/utils.html",
];

(async () => {
    await Promise.all(urls.map(url => download(url, "input")));
})();