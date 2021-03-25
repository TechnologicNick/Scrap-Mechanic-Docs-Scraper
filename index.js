const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const Trace = require("./trace");
const TurndownService = require("turndown");
const turndownService = new TurndownService();
const jsonmergepatch = require("json-merge-patch");
const fs = require("fs");
const path = require("path");

function extractFields(trElem) {
    // list
    let fields = trElem.querySelectorAll("td.field-body > ul > li");
    if (fields.length === 0) { // no list found (single parameter)
        fields = trElem.querySelectorAll("td.field-body");
    }

    // convert to text
    return Array.from(fields).map(elem => elem.textContent.trim());
}

class DocParser {
    content = {};

    constructor(dom) {
        this.dom = dom;

        // Replace all links to https://scrapmechanic.com/api/ with the title for later use
        Array.from(this.dom.window.document.querySelectorAll("a[title].smRef")).forEach((a) => a.href = `[[${a.title}]]`);

        for (let section of this.dom.window.document.querySelector(".document > div > div").getElementsByClassName("section")) {
            this.parseSection(section);
        }
    }

    static async fromFile(url) {
        const dom = await JSDOM.fromFile(url);

        return new this(dom);
    }

    parseSection(section) {
        console.log(`Parsing section ${section.id}`);

        for (let dl of Array.from(section.children).filter(c => c.tagName === "DL")) {
            try {
                if (dl.classList.contains("class")) {
                    console.log("Parsing userdata");
                } else {
                    jsonmergepatch.apply(this.content, this.parseTableFunction(dl));
                }
            } catch(ex) {
                console.error("Parsing failed", ex);
            }
        }
    }

    parseTableFunction(tableFunc) {
        console.log("Parsing table function", tableFunc.querySelector("dt").id);

        let classnames = tableFunc.querySelectorAll("dt > code.descclassname");

        let sandbox = classnames.length >= 2 ? classnames[0]?.textContent?.trim() : null ?? "";
        let namespace = classnames[classnames.length - 1]?.textContent?.replace(/\.$/g, "") ?? "";
        let name = tableFunc.querySelector("dt > code.descname")?.textContent;
        let params = [];
        let returns = [];

        if (!namespace && name) {
            namespace = name.substr(0, name.lastIndexOf('.'));
            name = name.substr(name.lastIndexOf('.') + 1);
        }

        let descParagraphs = [];

        for (let ddElem of tableFunc.querySelector("dd").children) {
            if (ddElem.tagName === "TABLE") {
                for (let tr of ddElem.querySelectorAll("tr")) {
                    
                    let fieldName = tr.querySelector("th.field-name")?.textContent;
                    if (fieldName === "Parameters:") {

                        // extract parameters
                        extractFields(tr).forEach((field) => {
                            let match = field.match(/^(?<name>\w+) \((?<type>\w+)\) [-\u2012\u2013\u2014] (?<description>.*?)$/);
                            params.push(Object.assign({}, match?.groups ?? {}));
                        });

                    } else if (fieldName === "Returns:") {

                        // extract parameters
                        extractFields(tr).forEach((field) => {
                            let match = field.match(/^(?<type>\w+) [-\u2012\u2013\u2014] (?<description>.*?)$/);
                            returns.push(Object.assign({}, match?.groups ?? {}));
                        });

                    } else {
                        console.warn(`[${namespace}.${name}] Unknown field name:`, fieldName);
                    }
                }
            // } else if (ddElem.classList.contains("wy-table-responsive")) {
            //     // table constants

            //     return this.parseTableConstant(ddElem);
            } else {
                // <p>
                if (ddElem.childElementCount === 0) {
                    descParagraphs.push(ddElem.textContent);
                } else {
                    descParagraphs.push(turndownService.turndown(ddElem));
                }
            }
        }

        let description = descParagraphs.join('\n\n');

        // console.table({sandbox, namespace, name, description, params: JSON.stringify(params), returns: JSON.stringify(returns)});

        return {
            [namespace]: {
                constants: {},
                tabledata: {
                    [name]: {
                        args: params.length,
                        sandbox,
                        description,
                        params,
                        returns
                    }
                },
                userdata: {}
            }
        }

    }

}

(async () => {
    if (!fs.existsSync("./input")) {
        console.error("No input directory found! Run `npm run download` to download the files.");
        return;
    }

    let trace = new Trace();

    for (let file of ["index.html", "script_classes.html", "game_objects.html", "managers.html", "utils.html"]) {
        let dp = await DocParser.fromFile(path.join("input", file));

        trace.addContent(dp.content);
    }

    console.log(Object.keys(trace.data.content));

    trace.save();
})();
