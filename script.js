// ========================================
// WhatsApp Chat Archive Viewer
// ========================================


// ========================================
// DOM ELEMENTS
// ========================================

const chatFile = document.getElementById("chatFile");
const fileStatus = document.getElementById("fileStatus");

const uploadScreen = document.querySelector(".upload-screen");
const chatContainer = document.querySelector(".chat-container");

const messagesContainer = document.getElementById("messages");
const chatName = document.getElementById("chatName");
const messageCount = document.getElementById("messageCount");

const searchInput = document.getElementById("searchInput");
const previousResult =
    document.getElementById("previousResult");

const nextResult =
    document.getElementById("nextResult");

const searchPosition =
    document.getElementById("searchPosition");

const userSelection =
    document.getElementById("user-selection");

const participantList =
    document.getElementById("participant-list");


// ========================================
// APPLICATION DATA
// ========================================

let allMessages = [];

let participants = [];

let currentUser = null;


// ========================================
// FILE SELECTION
// ========================================

chatFile.addEventListener("change", async function () {

    const file = chatFile.files[0];

    if (!file) {
        fileStatus.textContent = "No file selected";
        return;
    }


    if (!file.name.toLowerCase().endsWith(".zip")) {

        fileStatus.textContent =
            "Please select a ZIP file.";

        return;
    }


    fileStatus.textContent =
        `Reading ${file.name}...`;


    try {

        // ========================================
        // LOAD ZIP
        // ========================================

        const zip = await JSZip.loadAsync(file);


        console.log("ZIP successfully opened.");

        console.log("Files inside ZIP:");

        Object.keys(zip.files).forEach(fileName => {
            console.log(fileName);
        });


        // ========================================
        // FIND CHAT FILE
        // ========================================

        const chatFileEntry = findChatFile(zip);


        if (!chatFileEntry) {

            fileStatus.textContent =
                "Could not find a WhatsApp chat text file.";

            return;
        }


        console.log(
            "Chat file found:",
            chatFileEntry.name
        );


        // ========================================
        // EXTRACT CHAT TEXT
        // ========================================

        const chatText =
            await chatFileEntry.async("text");


        console.log("Chat text extracted.");


        // ========================================
        // PARSE CHAT
        // ========================================

        allMessages =
            parseWhatsAppChat(chatText);


        console.log(
            "Parsed messages:",
            allMessages
        );


        // ========================================
        // FIND PARTICIPANTS
        // ========================================

        participants = [
            ...new Set(

                allMessages
                    .filter(message => message.sender)
                    .map(message => message.sender)

            )
        ];
showParticipantSelection();

        console.log(
            "Participants:",
            participants
        );



function showParticipantSelection() {

    participantList.innerHTML = "";

    userSelection.classList.remove("hidden");


    participants.forEach(participant => {

        const button =
            document.createElement("button");

        button.classList.add(
            "participant-button"
        );

        button.textContent = participant;


        button.addEventListener(
            "click",
            function () {

                currentUser = participant;

                console.log(
                    "Current user:",
                    currentUser
                );


                // Hide selection screen
                userSelection.classList.add(
                    "hidden"
                );


                // Display chat
                displayMessages(
                    allMessages
                );

            }
        );


        participantList.appendChild(
            button
        );

    });

}
        // ========================================
        // DISPLAY CHAT
        // ========================================

        displayMessages(allMessages);


        // ========================================
        // UPDATE STATUS
        // ========================================

        fileStatus.textContent =
            `Loaded ${allMessages.length} messages`;


        // ========================================
        // SHOW CHAT
        // ========================================

        uploadScreen.classList.add("hidden");

        chatContainer.classList.remove("hidden");


    } catch (error) {

        console.error(
            "Error while reading ZIP:",
            error
        );


        fileStatus.textContent =
            "Something went wrong while reading the ZIP file.";

    }

});


// ========================================
// SEARCH
// ========================================
searchInput.addEventListener("input", function () {

    const searchTerm =
        searchInput.value.trim().toLowerCase();


    // Reset search position
    currentSearchIndex = -1;


    // Empty search
    if (searchTerm === "") {

        searchResults = [];

        searchPosition.textContent = "0 / 0";

        displayMessages(allMessages);

        return;
    }


    // Find matching messages
    searchResults = allMessages.filter(message => {

        const sender = message.sender
            ? message.sender.toLowerCase()
            : "";

        const text =
            message.message.toLowerCase();


        return (
            sender.includes(searchTerm) ||
            text.includes(searchTerm)
        );

    });


    // Update result counter
    searchPosition.textContent =
        `0 / ${searchResults.length}`;


    // Display results
    displayMessages(
        searchResults,
        searchTerm
    );

});

previousResult.addEventListener(
    "click",
    function () {

        if (searchResults.length === 0) {
            return;
        }


        currentSearchIndex--;


        if (currentSearchIndex < 0) {

            currentSearchIndex =
                searchResults.length - 1;

        }


        goToSearchResult();

    }
);


nextResult.addEventListener(
    "click",
    function () {

        if (searchResults.length === 0) {
            return;
        }

        currentSearchIndex++;


        if (currentSearchIndex >= searchResults.length) {

            currentSearchIndex = 0;

        }


        goToSearchResult();

    }
);

function goToSearchResult() {

    if (currentSearchIndex < 0) {
        return;
    }


    const result =
        searchResults[currentSearchIndex];


    searchPosition.textContent =
        `${currentSearchIndex + 1} / ${searchResults.length}`;


    const messageElements =
        document.querySelectorAll(".message");


    messageElements.forEach(element => {

        element.classList.remove(
            "search-active"
        );

    });


    const matchingIndex =
        allMessages.indexOf(result);


    const target =
        document.querySelector(
            `[data-message-index="${matchingIndex}"]`
        );


    if (target) {

        target.classList.add(
            "search-active"
        );


        target.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    }

}
// ========================================
// FIND WHATSAPP CHAT FILE
// ========================================

function findChatFile(zip) {

    const fileNames =
        Object.keys(zip.files);


    for (const fileName of fileNames) {

        const file = zip.files[fileName];


        // Ignore folders
        if (file.dir) {
            continue;
        }


        // Find TXT file
        if (
            fileName
                .toLowerCase()
                .endsWith(".txt")
        ) {

            return file;

        }

    }


    return null;
}


// ========================================
// PARSE WHATSAPP CHAT
// ========================================

function parseWhatsAppChat(chatText) {

    const lines =
        chatText.split(/\r?\n/);


    const messages = [];

    let currentMessage = null;


    for (const line of lines) {

        /*
            Examples:

            03/04/2026, 10:25 pm - Dad: Hello

            03/04/2026, 22:25 - Dad: Hello

            3/4/26, 10:25 PM - Dad: Hello
        */

        const match = line.match(
            /^(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\s*-\s*(.*)$/
        );


        // ========================================
        // NEW MESSAGE
        // ========================================

        if (match) {

            if (currentMessage) {

                messages.push(
                    currentMessage
                );

            }


            const date = match[1];

            const time = match[2];

            const content = match[3];


            const separatorIndex =
                content.indexOf(":");


            // ========================================
            // MESSAGE WITH SENDER
            // ========================================

            if (separatorIndex !== -1) {

                const sender =
                    content
                        .substring(
                            0,
                            separatorIndex
                        )
                        .trim();


                const message =
                    content
                        .substring(
                            separatorIndex + 1
                        )
                        .trim();


                currentMessage = {

                    date: date,

                    time: time,

                    sender: sender,

                    message: message,

                    type: "message"

                };

            }


            // ========================================
            // SYSTEM MESSAGE
            // ========================================

            else {

                currentMessage = {

                    date: date,

                    time: time,

                    sender: null,

                    message: content,

                    type: "system"

                };

            }

        }


        // ========================================
        // MULTI-LINE MESSAGE
        // ========================================

        else if (
            currentMessage &&
            line.trim() !== ""
        ) {

            currentMessage.message +=
                "\n" + line.trim();

        }

    }


    // ========================================
    // ADD FINAL MESSAGE
    // ========================================

    if (currentMessage) {

        messages.push(
            currentMessage
        );

    }


    return messages;
}


// ========================================
// DISPLAY MESSAGES
// ========================================

function displayMessages(messages, searchTerm = "") {

    messagesContainer.innerHTML = "";

    messageCount.textContent =
        `${messages.length} messages`;

    let previousDate = null;


    messages.forEach((message) => {

        // ========================================
        // DATE SEPARATOR
        // ========================================

        if (message.date !== previousDate) {

            const dateElement =
                document.createElement("div");

            dateElement.classList.add(
                "date-separator"
            );

            dateElement.textContent =
                formatDate(message.date);

            messagesContainer.appendChild(
                dateElement
            );

            previousDate = message.date;
        }


        // ========================================
        // SYSTEM MESSAGE
        // ========================================

        if (message.type === "system") {

            const systemElement =
                document.createElement("div");

            systemElement.classList.add(
                "system-message"
            );

            systemElement.textContent =
                message.message;

            messagesContainer.appendChild(
                systemElement
            );

            return;
        }


        // ========================================
        // NORMAL MESSAGE
        // ========================================

        const messageElement =
            document.createElement("div");

        messageElement.classList.add(
            "message"
        );

       const originalIndex =
    allMessages.indexOf(message);

messageElement.dataset.messageIndex =
    originalIndex;
        // ========================================
        // SENT / RECEIVED
        // ========================================

        if (message.sender === currentUser) {

            messageElement.classList.add(
                "sent"
            );

        } else {

            messageElement.classList.add(
                "received"
            );
        }


        // ========================================
        // MESSAGE CONTENT
        // ========================================

        const highlightedSender =
    highlightText(
        message.sender,
        searchTerm
    );

const highlightedMessage =
    highlightText(
        message.message,
        searchTerm
    );


messageElement.innerHTML = `

    <div class="sender">
        ${highlightedSender}
    </div>

    <div class="text">
        ${highlightedMessage}
    </div>

    <span class="time">
        ${escapeHTML(message.time)}
    </span>

`;


        messagesContainer.appendChild(
            messageElement
        );

    });
}
function highlightText(text, searchTerm) {

    const safeText =
        escapeHTML(text);

    if (!searchTerm) {
        return safeText;
    }

    const escapedSearch =
        searchTerm.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

    const regex =
        new RegExp(
            `(${escapedSearch})`,
            "gi"
        );

    return safeText.replace(
        regex,
        "<mark>$1</mark>"
    );
}
function formatDate(dateString) {

    const parts =
        dateString.split(/[\/.-]/);


    if (parts.length !== 3) {
        return dateString;
    }


    let day = parts[0];
    let month = parts[1];
    let year = parts[2];


    // Convert two-digit year
    if (year.length === 2) {
        year = "20" + year;
    }


    const date =
        new Date(
            Number(year),
            Number(month) - 1,
            Number(day)
        );


    if (isNaN(date.getTime())) {
        return dateString;
    }


    return date.toLocaleDateString(
        "en-US",
        {
            month: "long",
            day: "numeric",
            year: "numeric"
        }
    );
}


// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(text) {

    return String(text)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}