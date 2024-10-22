const fileSystem = require("node:fs");
const rootPath = process.argv[1].split("/").slice(0, -2).join("/");

parseDocument(process.argv[2]);

function parseDocument(documentName)
{
    if (documentName === undefined)
    {
        console.error(`Please specify the document name when running this command!\nUsage: node ${process.argv[1]} [documentName]`);
        return;
    }

    const folderPath = `${rootPath}/documents/${documentName}`;
    if (!fileSystem.existsSync(folderPath))
    {
        console.error(`Document ${documentName} does not exist.`);
        return;
    }

    fileSystem.writeFileSync(folderPath + "-hirarchy.html", cleanupHtml(`
        <ul>
            ${folderToHtml(folderPath)}
        </ul>
    `));

    console.log(`Document ${documentName}'s hirarchy has been successfully regenerated!`)
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
            summaryPath = folderPath + "/" + item;
            continue;
        }

        switch (item.substring(item.lastIndexOf(".")))
        {
            case ".html":
                innerHtml += fileToHtml(folderPath + "/" + item);
                break;
            default:
                innerHtml += folderToHtml(folderPath + "/" + item);
                break;
        }
    }
    
    if (summaryPath != "")
    {
        return `
            <li>
                <details>
                    <summary><img><a href="${directoryToLink(summaryPath)}">${folderName}</a></summary>
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
        <li><img><a href="${directoryToLink(filePath)}">${fileName}</a></li>
    `;
}

function directoryToDisplayName(path)
{
    return path.split("/").pop().replace(/\.[^/.]+$/, '').replace("-", " ").trim();
}

//The directory to a document html tend to start with documents/*.html
//This function removes those extra parts we don't use.
function directoryToLink(path)
{
    return "document.html?file=" + path.substring(0, path.length - ".html".length).substring(rootPath.length + "/documents/".length);
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