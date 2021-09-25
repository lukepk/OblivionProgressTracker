/**
 * TO USE:
 * 1. Include this file as a script in speedrun-3.html
 * 2. Make sure that extract() is the last thing called by the page (after the DOM is all loaded)
 * 3. Relax
 */

// Grabs all of the guide contents and constructs a JSON file
function extract() {
    // Grab all sections of the DOM
    const sectionElems = document.body.getElementsByClassName("section");

    let sections = []

    // Traverse each section
    for (const sectionElem of sectionElems) {
        let sectionJSON = {}
        // Next one is always sectionTitle
        const sectionTitleElem = sectionElem.firstElementChild;
        sectionJSON["sectionTitle"] = sectionTitleElem.textContent;

        const collapsibleDiv = sectionTitleElem.nextElementSibling;
    
        let sectionContent = []

        // Check for categories
        const firstChild = collapsibleDiv.firstElementChild;
        if(!firstChild) continue;
        if(firstChild.tagName == "DIV" && firstChild.className == "category") {
            // Section has categories, so grab them all and process them one by one
            let categories = collapsibleDiv.getElementsByClassName("category");
            for(let c of categories) {
                sectionContent.push(processCategory(c));
            }
        } else if(firstChild.tagName == "OL") {
            sectionContent = processUnorderedList(firstChild);
        } else {
            console.warn("Encountered unexpected tag:" + firstChild.tagName);
        }
        sectionJSON["content"] = sectionContent;
        sections.push(sectionJSON);
    }

    let finalObj = {};
    finalObj["datetime"] = new Date().toLocaleString();
    finalObj["sections"] = sections;
    console.log(finalObj);
    //exportData(finalObj);

}

function processUnorderedList(unorderedListElement) {
    let resultArr = []
    let currItem = unorderedListElement.firstElementChild;
    while(currItem) {
        newObj = {}

        if(currItem.getElementsByTagName("OL").length > 0) {
            // This item contains a sublist
            newObj["type"] = "sublist";
            newObj["prelude"] = currItem.textContent.split('\n')[0];
            newObj["content"] = processUnorderedList(currItem.getElementsByTagName("OL")[0]);

        } else if(currItem.tagName == "LI") {
            newObj["type"] = "line";
            newObj["content"] = currItem.textContent;
        } else {
            console.warn("Found unexpected tag type \"" + currItem.tagName + "\" in Unordered List element");
        }

        resultArr.push(newObj);
        currItem = currItem.nextElementSibling;
    }
    return resultArr;
}

/**
 * Given a DOM element <div class="category">, returns a JSON object
 * in the following format:
 * {
 *  type: category, 
 *  categoryTitle: "category1", 
 *  content: [{type: line, content: "CategoryLine1"}, {type: line, content:" CategoryLine2" }]
 * },
 */
function processCategory(categoryElement) {
        retObj = {}
        retObj["type"] = "category";
        let categoryTitleElem = categoryElement.firstElementChild;
        retObj["categoryTitle"] = categoryTitleElem.textContent;
        let unorderedListElem = categoryTitleElem.nextElementSibling;
        retObj["content"] = processUnorderedList(unorderedListElem);
        return retObj;
}

function exportData(data) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {
      type: "text/plain"
    }));
    a.setAttribute("download", "data.json");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}


/** 
{
    sections: [
        {
            sectionTitle: "string Here",
            content: [
                {type: category, categoryTitle: "category1", 
                    content: [{type: line, content: "CategoryLine1"}, {type: line, content:" CategoryLine2" }]
                },
                {type: line, content: "str1"}, 
                {type: line, content: "str2"}, 
                {
                    type: sublist, 
                    prelude:"", 
                    content: [
                        {type: line, content: "nested1"},
                        {type: line, content: "nested2"}
                    ]
                },
            ]
        },
        {
            sectionTitle: "string Here 2",
            content: [
                {type: line, content: "str1"}, 
                {type: line, content: "str2"}, 
                {
                    type: sublist, 
                    prelude:"This is some text", 
                    content: [
                        {type: line, content: "nested1"}, 
                        {type: line, content: "nested2"}
                    ]
                },
            ]
        }
    ]
}
*/