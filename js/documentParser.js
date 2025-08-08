const fileSystem = require("node:fs");
const path = require('path');
const dom = require('jsdom');
const rootPath = process.argv[1].split("/").slice(0, -2).join("/");
process.chdir(rootPath);

const rules = [
    {
        test: /.*\.html$/i,
        use: transformHtml
    }
];

const postrules = [
    {
        test: /.*\.html$/i,
        use: validateLinks
    }
];

const htmlLinkRegex = /(?<=src=").*?(?=")|(?<=href=").*?(?=")/gi;

parseDocument(process.argv[2]);

function parseDocument(documentName)
{
    if (documentName === undefined)
    {
        console.error(`Please specify the document name when running this command!\nUsage: node ${process.argv[1]} [documentName]`);
        return;
    }

    const srcFolderPath = `src-documents/${documentName}`;
    const distFolderPath = `dist-documents/${documentName}`;
    if (!fileSystem.existsSync(srcFolderPath))
    {
        console.error(`Document ${documentName} does not exist.`);
        return;
    }

    fileSystem.rmSync(distFolderPath, { recursive: true, force: true });
    fileSystem.mkdirSync(distFolderPath);

    transformDocument(srcFolderPath, distFolderPath, rules);
    transformDocument(distFolderPath, distFolderPath, postrules);
    buildHierarchy(srcFolderPath, distFolderPath);

    console.log(`Document ${documentName} has been successfully built!`)
}

function transformDocument(srcFolderPath, distFolderPath, ruleset)
{
    let content = fileSystem.readdirSync(srcFolderPath);

    for (const item of content) {
        const srcPath = path.join(srcFolderPath, item);
        const distPath = path.join(distFolderPath, item);
        if (path.extname(item) == "")
        {
            if (!fileSystem.existsSync(distPath))
            {
                fileSystem.mkdirSync(distPath);
            }
            transformDocument(srcPath, distPath, ruleset);
            continue;
        }

        const transformer = ruleset.find((rule) => rule.test.test(srcPath))

        if (transformer)
        {
            fileSystem.writeFileSync(distPath, transformer.use(distPath, fileSystem.readFileSync(srcPath)));
        }
        else
        {
            fileSystem.copyFileSync(srcPath, distPath);
        }
    }
}

/** @param { String } html  */
function transformHtml(distPath, html)
{
    const documentFragment = new dom.JSDOM(html).window.document.body;
    
    //#region HTML manipulation
    documentFragment.querySelectorAll("pre > code").forEach((codeBlock) => {
        normalizeCodeBlock(codeBlock);
    });
    //#endregion

    html = documentFragment.innerHTML;

    //#region Raw text manipulation
    html = html.replaceAll(htmlLinkRegex, (link) => {
        if (link.startsWith("local:"))
        {
            return path.join(path.dirname(distPath), link.slice("local:".length));
        }
        else if(link.startsWith("doc:"))
        {
            return shortPathToLink(link.slice("doc:".length));
        }
        else
        {
            return link;
        }
    });
    //#endregion

    return html;
}

/** @param { String } html  */
function validateLinks(distPath, html)
{
    htmlLinkRegex.exec(html)?.forEach((link) => {
        const docLink = /(?<=document\.html\?file=).*/.exec(link)?.[0];
        if (docLink)
        {
            if (!fileSystem.existsSync(shortPathToDistPath(docLink)))
            {
                console.error(`"${link}" is invalid.\nAt ${distPath}`);
            }
        }
        else
        {
            if (!fileSystem.existsSync(link))
            {
                console.error(`"${link}" is invalid.\nAt ${distPath}`);
            }
        }
    });
    return html;
}

/** @param { HTMLElement } codeBlock  */
function normalizeCodeBlock(codeBlock)
{
    let lines = codeBlock.innerHTML.split("\n");

    let baseLine = Infinity;
    lines.forEach((line) => {
        if (!isWhitespace(line))
        {
            const leadingSpaces = /^ */.exec(line)[0].length;
            if (leadingSpaces < baseLine)
            {
                baseLine = leadingSpaces;
            }
        }
    });

    lines = lines.map((line) => line.slice(baseLine));

    const firstLineIndex = findFirstIndex(lines, (line) => !isWhitespace(line));
    const lastLineIndex = findLastIndex(lines, (line) => !isWhitespace(line));

    if (firstLineIndex != -1)
    {
        lines = lines.slice(firstLineIndex, lastLineIndex + 1);
    }
    
    codeBlock.innerHTML = lines.join("\n");
}

function buildHierarchy(srcFolderPath, distFolderPath)
{
    fileSystem.writeFileSync(path.join(distFolderPath, "hirarchy.html"), cleanupHtml(`
        <ul>
            ${folderToHtml(srcFolderPath)}
        </ul>
    `));
}

function folderToHtml(folderPath)
{
    let content = fileSystem.readdirSync(folderPath);
    let folderName = directoryToDisplayName(folderPath);

    let summaryPath = "";
    let innerHtml = "";
    for (const item of content) {
        if (item == "summary.html")
        {
            summaryPath = path.join(folderPath, item);
            continue;
        }

        switch (path.extname(item))
        {
            case ".html":
                innerHtml += fileToHtml(path.join(folderPath, item));
                break;
            case "":
                innerHtml += folderToHtml(path.join(folderPath, item));
                break;
        }
    }
    
    if (summaryPath != "")
    {
        return `
            <li>
                <details>
                    <summary><img><a href="${sourcePathToLink(summaryPath)}">${folderName}</a></summary>
                    <ul>
                        ${innerHtml}
                    </ul>
                </details>
            </li>
        `;
    }
    else
    {
        return `
            <li>
                <details>
                    <summary><img><a>${folderName}</a></summary>
                    <ul>
                        ${innerHtml}
                    </ul>
                </details>
            </li>
        `;
    }
    
}

function fileToHtml(filePath)
{
    let fileName = directoryToDisplayName(filePath);
    return `
        <li><img><a href="${sourcePathToLink(filePath)}">${fileName}</a></li>
    `;
}

function directoryToDisplayName(filePath)
{
    return path.basename(filePath, path.extname(filePath)).replaceAll("-", " ").trim();
}

/**
 * The path to a document file tend is typically formatted as src-documents/.../*.html.
 * This function turns it into a link that tells document.html to read the dist document
 */
function sourcePathToLink(path)
{
    return shortPathToLink(path.substring(0, path.length - ".html".length).substring("src-documents/".length));
}

/**
 * The short path to a document file tend is typically formatted as everything in between src(or dist)-documents/.../*.html.
 * This function turns it into a link that tells document.html to read the dist document
 */
function shortPathToLink(path)
{
    return `document.html?file=${path}`;
}

/**
 * The short path to a document file tend is typically formatted as everything in between src(or dist)-documents/.../*.html.
 * This function turns it into a link to the dist document
 */
function shortPathToDistPath(path)
{
    return `dist-documents/${path}.html`;
}

function cleanupHtml(html)
{
    //Convert to an array and remove empty lines
    let htmlLines = html.split("\n").filter(i=>i.trim() != '');

    //Correct indentations
    let indentationLevel = 0;
    for (let i = 0; i < htmlLines.length; i++) {
        let oldIndentationLevel = indentationLevel;
        
        for(let j = 0; j < htmlLines[i].length; j++)
        {
            if (htmlLines[i][j] == "<")
            {
                if (htmlLines[i][j+1] == "/")
                {
                    indentationLevel--;
                    j += 2;
                }
                else if (htmlLines[i][j+1] != "i" || htmlLines[i][j+2] != "m" || htmlLines[i][j+3] != "g")
                {
                    indentationLevel++
                    j += 2;
                }
            }
        }

        htmlLines[i] = "    ".repeat(Math.min(oldIndentationLevel, indentationLevel)) + htmlLines[i].trimStart();
    }

    return htmlLines.join("\n");
}

function findFirstIndex(array, predicate)
{
    for (let i = 0; i < array.length; i++) {
        if (predicate(array[i]))
        {
            return i;
        }
    }
    return -1;
}

function findLastIndex(array, predicate)
{
    for (let i = array.length-1; i > 0; i--) {
        if (predicate(array[i]))
        {
            return i;
        }
    }
    return -1;
}

function isWhitespace(string)
{
    return /^ *$/.test(string);
}