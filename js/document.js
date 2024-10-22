let filePath = new URLSearchParams(window.location.search).get("file");
let documentName = filePath.split("/").shift();
let fileName = "Undefined";

if (filePath != undefined)
{
    path = filePath.split("/");

    do {
        fileName = path.pop();
    }
    while (fileName == "summary");

    fileName = fileName.replace("-", " ");
}


fetch(`documents/${filePath}.html`).then((article)=>{
    if (!article.ok) 
    {
        console.log(`Error: ${article.status} ${article.statusText}`);
    }
    else
    {
        article.text().then((html)=>{
            setContent(html);
        });
    }
})

function setContent(html)
{
    if (document.readyState == "loading")
    {
        window.addEventListener("DOMContentLoaded", ()=>{
            setContent(html);
        });
        return;
    }

    document.querySelector("#content").innerHTML = html;
}

fetch(`documents/${documentName}-hirarchy.html`).then((hirarchy)=>{
    if (!hirarchy.ok) 
    {
        console.log(`Error: ${hirarchy.status} ${hirarchy.statusText}`);
    }
    else
    {
        hirarchy.text().then((html)=>{
            setHirarchy(html);
        });
    }
})

function setHirarchy(html)
{
    if (document.readyState == "loading")
    {
        window.addEventListener("DOMContentLoaded", ()=>{
            setHirarchy(html);
        });
        return;
    }

    document.querySelector("#hirarchy").innerHTML = html;


    //Open the current branch of in the file tree that led to this file
    let currentElement = document.querySelector(`a[href="document.html?file=${filePath}"]`);
    currentElement.classList.add("highlighted");
    
    while (currentElement.id != "hirarchy")
    {
        currentElement = currentElement.parentNode;
        if (currentElement.nodeName.toLowerCase() == "details")
        {
            currentElement.toggleAttribute("open");
        }
    }
}

window.addEventListener("DOMContentLoaded", () => {
    let hirarchy = document.querySelector("#hirarchy");
    hirarchy.addEventListener("click", (e) => {
        switch (e.target.nodeName.toLowerCase())
        {
            case "img":
            case "a":
                break;
            default:
                e.preventDefault();
                break;
        }
    });

    let title = document.querySelector("#title");
    title.textContent = fileName;
});