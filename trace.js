const fs = require("fs");
const jsonmergepatch = require("json-merge-patch");

class Trace {

    constructor(options) {
        this.data = Object.assign({}, options, {
            author: "TechnologicNick",
            version: "unspecified",
            comment: "This json file was generated using an API docs scraper",
            time: Date.now(),
            urls: {
                discord: "https://discordapp.com/users/254340017575559178",
                steam: "https://steamcommunity.com/id/TechnologicNick/",
                github: "https://github.com/TechnologicNick"
            },
            content: {}
        })
    }

    addContent(content) {
        jsonmergepatch.apply(this.data.content, content);
    }

    save() {
        if (!fs.existsSync("./output")) {
            fs.mkdirSync("./output");
        }

        fs.writeFileSync(
            //`./output/api_docs.${this.data.version}.${this.data.time}.json`,
            `./output/api_docs.latest.json`,
            JSON.stringify(this.data, null, "\t")
        );
    }
}

module.exports = Trace;