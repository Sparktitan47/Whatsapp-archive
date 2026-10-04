// ========================================
// WHATSAPP ARCHIVE VIEWER - V2
// ========================================


// ========================================
// DOM ELEMENTS
// ========================================

const chatFile =
    document.getElementById("chatFile");

const fileStatus =
    document.getElementById("fileStatus");

const uploadScreen =
    document.querySelector(".upload-screen");

const chatContainer =
    document.querySelector(".chat-container");

const messagesContainer =
    document.getElementById("messages");

const chatName =
    document.getElementById("chatName");

const messageCount =
    document.getElementById("messageCount");

const searchInput =
    document.getElementById("searchInput");

const dateSearchInput = document.getElementById("dateSearchInput");

const dateSearchStatus = document.getElementById("dateSearchStatus");


// ========================================
// ARCHIVE HOME ELEMENTS
// ========================================

const archiveHome =
    document.getElementById("archive-home");

const chatList =
    document.getElementById("chatList");

const chatSearchInput =
    document.getElementById("chatSearchInput");

const addArchiveButton =
    document.getElementById("addArchiveButton");

const storageStatus = document.getElementById("storageStatus");

const backToArchive =
    document.getElementById("backToArchive");


// ========================================
// PARTICIPANT SELECTION
// ========================================

const userSelection =
    document.getElementById("userSelection");

const participantList =
    document.getElementById("participant-list");


// ========================================
// SEARCH CONTROLS
// ========================================

const previousResult =
    document.getElementById("previousResult");

const nextResult =
    document.getElementById("nextResult");

const searchPosition =
    document.getElementById("searchPosition");


// ========================================
// APPLICATION DATA
// ========================================

let allMessages = [];

let participants = [];

let currentUser = null;

let archiveChats = [];

let currentChat = null;

let pendingChat = null;

const chatOwners = new Map();


// Search data

let searchResults = [];

let currentSearchIndex = -1;


// ========================================
// FILE SELECTION
// ========================================

chatFile.addEventListener(
    "change",
    async function () {

        const file =
            chatFile.files[0];


        if (!file) {

            fileStatus.textContent =
                "No file selected";

            return;

        }


        if (
            !file.name
                .toLowerCase()
                .endsWith(".zip")
        ) {

            fileStatus.textContent =
                "Please select a ZIP file.";

            return;

        }


        fileStatus.textContent =
            `Reading ${file.name}...`;


        try {

            // ========================================
            // LOAD MASTER ZIP
            // ========================================

            const zip =
                await JSZip.loadAsync(file);


            console.log(
                "Master ZIP successfully opened."
            );


            console.log(
                "Files inside master ZIP:"
            );


            Object.keys(zip.files)
                .forEach(fileName => {

                    console.log(fileName);

                });


            // ========================================
            // FIND INNER CHAT ZIP FILES
            // ========================================

            const innerArchives =
                findInnerChatArchives(zip);


            console.log(
                "Inner chat archives found:",
                innerArchives
            );


            // ========================================
            // IF INNER ZIPS EXIST
            // ========================================

            if (
                innerArchives.length > 0
            ) {

                fileStatus.textContent =
                    `Found ${innerArchives.length} chat archive${
                        innerArchives.length === 1
                            ? ""
                            : "s"
                    }.`;

                
                await processInnerArchives(
                    innerArchives
                );


                return;

            }


            // ========================================
            // SINGLE CHAT ZIP
            // ========================================

            const chatFileEntry =
                findChatFile(zip);


            if (!chatFileEntry) {

                fileStatus.textContent =
                    "Could not find a WhatsApp chat text file.";

                return;

            }


            console.log(
                "Chat file found:",
                chatFileEntry.name
            );


            const chatText =
                await chatFileEntry.async("text");


            allMessages =
                parseWhatsAppChat(
                    chatText
                );


            const addedCount = await addChatsToArchive([
                createChatObject(chatFile.name, allMessages, chatText)
            ]);


            fileStatus.textContent =
                addedCount
                    ? `Saved ${allMessages.length} messages from ${addedCount} new conversation.`
                    : "This conversation is already in your archive.";


            displayChatList();

            showArchiveHome();

        }


        catch (error) {

            console.error(
                "Error while reading archive:",
                error
            );


            fileStatus.textContent =
                "Something went wrong while reading the ZIP file.";

        }

        finally {
            chatFile.value = "";
        }

    }
);


// ========================================
// FIND INNER CHAT ARCHIVES
// ========================================

function findInnerChatArchives(zip) {

    const chatArchives = [];


    Object.keys(zip.files)
        .forEach(
            fileName => {

                const file =
                    zip.files[fileName];


                // Ignore folders
                if (file.dir) {

                    return;

                }


                // Only ZIP files
                if (
                    fileName
                        .toLowerCase()
                        .endsWith(".zip")
                ) {

                    chatArchives.push(file);

                }

            }
        );


    return chatArchives;

}


// ========================================
// PROCESS INNER CHAT ARCHIVES
// ========================================

async function processInnerArchives(
    innerArchives
) {

    const newChats = [];


    for (
        let i = 0;
        i < innerArchives.length;
        i++
    ) {

        const archive =
            innerArchives[i];


        try {

            fileStatus.textContent =
                `Processing chat ${i + 1} of ${innerArchives.length}...`;


            const chatZip =
                await archive.async(
                    "uint8array"
                );


            const innerZip =
                await JSZip.loadAsync(
                    chatZip
                );


            // ========================================
            // FIND CHAT TXT FILE
            // ========================================

            const chatTextFile =
                findChatFile(
                    innerZip
                );


            if (!chatTextFile) {

                console.warn(
                    "No chat text file found in:",
                    archive.name
                );

                continue;

            }


            // ========================================
            // READ CHAT TEXT
            // ========================================

            const chatText =
                await chatTextFile.async(
                    "text"
                );


            // ========================================
            // PARSE CHAT
            // ========================================

            const messages =
                parseWhatsAppChat(
                    chatText
                );


            // ========================================
            // CREATE CHAT OBJECT
            // ========================================

            const chat = createChatObject(archive.name, messages, chatText);


            newChats.push(
                chat
            );

        }


        catch (error) {

            console.error(
                `Could not process ${archive.name}:`,
                error
            );

        }

    }


    // ========================================
    // ADD TO ARCHIVE
    // ========================================

    const addedCount = await addChatsToArchive(newChats);


    // ========================================
    // UPDATE UI
    // ========================================

    displayChatList();

    showArchiveHome();


    fileStatus.textContent =
        addedCount
            ? `Saved ${addedCount} new conversation${
            addedCount === 1
                ? ""
                : "s"
        }.`
            : "Those conversations are already in your archive.";

}


// ========================================
// FIND WHATSAPP CHAT FILE
// ========================================

function findChatFile(zip) {

    const fileNames =
        Object.keys(zip.files);


    for (
        const fileName of fileNames
    ) {

        const file =
            zip.files[fileName];


        if (file.dir) {

            continue;

        }


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
// CREATE CHAT OBJECT
// ========================================

function createChatObject(
    fileName,
    messages,
    sourceText = ""
) {

    const name =
        extractChatName(
            fileName
        );


    const lastMessage =
        messages.length > 0
            ? messages[
                messages.length - 1
            ]
            : null;


    const sourceHash = createContentHash(`${fileName}\0${sourceText || JSON.stringify(messages)}`);

    return {

        id: `chat-${sourceHash}`,

        sourceHash,

        name:
            name,

        messages:
            messages,

        media:
            [],

        lastMessage:
            lastMessage
                ? lastMessage.message
                : "",

        lastMessageTime:
            lastMessage
                ? lastMessage.time
                : "",

        messageCount:
            messages.length

    };

}


// ========================================
// CREATE CHAT FROM SINGLE ZIP
// ========================================

function createContentHash(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
}

function openArchiveDatabase() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error("This browser does not support local archive storage."));
            return;
        }
        const request = indexedDB.open("whatsappArchive", 1);
        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains("chats")) {
                database.createObjectStore("chats", { keyPath: "id" });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Could not open local storage."));
    });
}

async function loadChatsFromStorage() {
    const database = await openArchiveDatabase();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction("chats", "readonly");
        const request = transaction.objectStore("chats").getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error || new Error("Could not read saved chats."));
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => database.close();
    });
}

async function saveChatsToStorage(chats) {
    const database = await openArchiveDatabase();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction("chats", "readwrite");
        const store = transaction.objectStore("chats");
        chats.forEach(chat => store.put(chat));
        transaction.oncomplete = () => {
            database.close();
            resolve();
        };
        transaction.onerror = () => {
            database.close();
            reject(transaction.error || new Error("Could not save chats."));
        };
        transaction.onabort = () => {
            database.close();
            reject(transaction.error || new Error("Saving chats was interrupted."));
        };
    });
}

async function addChatsToArchive(chats) {
    const existingHashes = new Set(archiveChats.map(chat => chat.sourceHash));
    const addedChats = chats.filter(chat => {
        if (existingHashes.has(chat.sourceHash)) return false;
        existingHashes.add(chat.sourceHash);
        return true;
    });
    archiveChats.push(...addedChats);

    try {
        if (addedChats.length) await saveChatsToStorage(addedChats);
        storageStatus.textContent = "Chats are saved on this device";
    } catch (error) {
        console.error("Could not save chats locally:", error);
        storageStatus.textContent = "This browser could not save chats for later";
        fileStatus.textContent = "Chats loaded, but browser storage was unavailable.";
    }

    return addedChats.length;
}


// ========================================
// EXTRACT CHAT NAME
// ========================================

function extractChatName(
    fileName
) {

    let name =
        fileName
            .split("/")
            .pop();


    // Remove .zip
    name =
        name.replace(
            /\.zip$/i,
            ""
        );


    // Remove common WhatsApp naming
    name =
        name.replace(
            /^WhatsApp Chat with /i,
            ""
        );


    // Remove TXT filename if encountered
    name =
        name.replace(
            /^WhatsApp Chat with /i,
            ""
        );


    return name.trim() || "Unknown Chat";

}


// ========================================
// PARSE WHATSAPP CHAT
// ========================================

function parseWhatsAppChat(
    chatText
) {

    const lines =
        chatText.split(/\r?\n/);


    const messages = [];

    let currentMessage = null;


    for (
        const line of lines
    ) {

        const match =
            line.match(
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


            const date =
                match[1];

            const time =
                match[2];

            const content =
                match[3];


            const separatorIndex =
                content.indexOf(":");


            if (
                separatorIndex !== -1
            ) {

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

                    date:
                        date,

                    time:
                        time,

                    sender:
                        sender,

                    message:
                        message,

                    type:
                        "message"

                };

            }

            else {

                currentMessage = {

                    date:
                        date,

                    time:
                        time,

                    sender:
                        null,

                    message:
                        content,

                    type:
                        "system"

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
                "\n" +
                line.trim();

        }

    }


    // ========================================
    // FINAL MESSAGE
    // ========================================

    if (currentMessage) {

        messages.push(
            currentMessage
        );

    }


    return messages;

}


// ========================================
// DISPLAY CHAT LIST
// ========================================

function displayChatList() {

    chatList.innerHTML = "";


    if (
        archiveChats.length === 0
    ) {

        chatList.innerHTML = `

            <div class="empty-archive">

                <h2>
                    No conversations yet
                </h2>

                <p>
                    Upload a WhatsApp chat archive
                    to begin building your archive.
                </p>

            </div>

        `;

        return;

    }


    archiveChats.forEach(
        chat => {

            const item =
                document.createElement(
                    "div"
                );


            item.classList.add(
                "chat-list-item"
            );


            const lastMessage =
                chat.messages &&
                chat.messages.length > 0

                    ? chat.messages[
                        chat.messages.length - 1
                    ]

                    : null;


            const preview =
                lastMessage
                    ? lastMessage.message
                    : "No messages";


            const time =
                lastMessage
                    ? lastMessage.time
                    : "";


            item.innerHTML = `

                <div class="chat-list-avatar">

                    ${escapeHTML(
                        chat.name
                            .charAt(0)
                            .toUpperCase()
                    )}

                </div>


                <div class="chat-list-content">

                    <div class="chat-list-top">

                        <span
                            class="chat-list-name"
                        >
                            ${escapeHTML(
                                chat.name
                            )}
                        </span>


                        <span
                            class="chat-list-time"
                        >
                            ${escapeHTML(
                                time
                            )}
                        </span>

                    </div>


                    <div
                        class="chat-list-preview"
                    >
                        ${escapeHTML(
                            preview
                        )}
                    </div>

                </div>

            `;


            item.addEventListener(
                "click",
                function () {

                    openChat(chat);

                }
            );


            chatList.appendChild(
                item
            );

        }
    );

}


// ========================================
// OPEN CHAT
// ========================================

function openChat(chat) {

    currentChat = chat;


    chatName.textContent =
        chat.name;


    searchInput.value =
        "";


    searchResults =
        [];


    currentSearchIndex =
        -1;


    searchPosition.textContent =
        "0 / 0";


    allMessages =
        chat.messages || [];


    // ========================================
    // DETERMINE PARTICIPANTS
    // ========================================

    participants = [
        ...new Set(

            allMessages
                .filter(
                    message =>
                        message.sender
                )
                .map(
                    message =>
                        message.sender
                )

        )
    ];


    const knownOwner = chatOwners.get(chat.id) || chat.owner;
    const inferredOwner = participants.find(name => /^(me|you)$/i.test(name));
    currentUser = knownOwner || inferredOwner || null;

    if (!currentUser && participants.length > 1) {
        pendingChat = chat;
        participantList.innerHTML = "";
        participants.forEach(participant => {
            const button = document.createElement("button");
            button.className = "participant-button";
            button.textContent = participant;
            button.addEventListener("click", () => {
                currentUser = participant;
                chat.owner = participant;
                chatOwners.set(chat.id, participant);
                saveChatsToStorage([chat]).catch(error => {
                    console.error("Could not save participant choice:", error);
                });
                pendingChat = null;
                showChat(chat);
            });
            participantList.appendChild(button);
        });
        archiveHome.classList.add("hidden");
        userSelection.classList.remove("hidden");
        return;
    }

    currentUser = currentUser || participants[0] || null;
    showChat(chat);
}

function showChat(chat) {
    currentChat = chat;
    allMessages = chat.messages || [];

    configureDateSearch(allMessages);


    displayMessages(
        allMessages
    );


    messageCount.textContent =
        `${allMessages.length} messages`;


    archiveHome.classList.add(
        "hidden"
    );


    chatContainer.classList.remove(
        "hidden"
    );

    userSelection.classList.add("hidden");


    setTimeout(
        function () {

            messagesContainer.scrollTop =
                messagesContainer.scrollHeight;

        },
        50
    );

}

function dateInputKey(dateString) {
    if (!dateString) return "";
    const parts = String(dateString).split(/[/.\-]/);
    if (parts.length !== 3) return "";

    let year;
    let month;
    let day;
    if (parts[0].length === 4) {
        [year, month, day] = parts;
    } else {
        [day, month, year] = parts;
        if (year.length === 2) year = `20${year}`;
    }

    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (
        !Number.isFinite(date.getTime()) ||
        date.getFullYear() !== Number(year) ||
        date.getMonth() !== Number(month) - 1 ||
        date.getDate() !== Number(day)
    ) return "";

    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function configureDateSearch(messages) {
    const availableDates = messages
        .map(message => dateInputKey(message.date))
        .filter(Boolean)
        .sort();

    dateSearchInput.value = "";
    dateSearchInput.min = availableDates[0] || "";
    dateSearchInput.max = availableDates[availableDates.length - 1] || "";
    dateSearchInput.disabled = availableDates.length === 0;
    dateSearchStatus.textContent = availableDates.length ? "" : "No dated messages in this chat";
}

dateSearchInput.addEventListener("change", () => {
    const selectedDate = dateSearchInput.value;
    if (!selectedDate) return;

    const firstMessage = allMessages.find(
        message => dateInputKey(message.date) === selectedDate
    );

    if (!firstMessage) {
        dateSearchStatus.textContent = "No messages on this date";
        return;
    }

    if (searchInput.value) {
        searchInput.value = "";
        searchResults = [];
        currentSearchIndex = -1;
        searchPosition.textContent = "0 / 0";
        displayMessages(allMessages);
    }

    const target = messagesContainer.querySelector(
        `.date-separator[data-date-key="${selectedDate}"]`
    );

    if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        dateSearchStatus.textContent = `Showing ${formatDate(firstMessage.date)}`;
    }
});


// ========================================
// BACK TO ARCHIVE
// ========================================

backToArchive.addEventListener(
    "click",
    function () {

        chatContainer.classList.add(
            "hidden"
        );


        archiveHome.classList.remove(
            "hidden"
        );

        userSelection.classList.add("hidden");

    }
);


// ========================================
// DISPLAY MESSAGES
// ========================================

function displayMessages(
    messages,
    searchTerm = ""
) {

    messagesContainer.innerHTML = "";


    messageCount.textContent =
        `${messages.length} messages`;


    let previousDate = null;


    messages.forEach(
        message => {

            // ========================================
            // DATE SEPARATOR
            // ========================================

            if (
                message.date !== previousDate
            ) {

                const dateElement =
                    document.createElement(
                        "div"
                    );


                dateElement.classList.add(
                    "date-separator"
                );


                dateElement.textContent =
                    formatDate(
                        message.date
                    );

                dateElement.dataset.dateKey = dateInputKey(message.date);


                messagesContainer.appendChild(
                    dateElement
                );


                previousDate =
                    message.date;

            }


            // ========================================
            // SYSTEM MESSAGE
            // ========================================

            if (
                message.type === "system"
            ) {

                const systemElement =
                    document.createElement(
                        "div"
                    );


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
            // CREATE MESSAGE
            // ========================================

            const messageElement =
                document.createElement(
                    "div"
                );


            messageElement.classList.add(
                "message"
            );


            const originalIndex =
                allMessages.indexOf(
                    message
                );


            messageElement.dataset.messageIndex =
                originalIndex;


            if (
                message.sender && currentUser && message.sender === currentUser
            ) {

                messageElement.classList.add(
                    "sent"
                );

            }

            else {

                messageElement.classList.add(
                    "received"
                );

            }


            const highlightedSender = highlightText(message.sender || "", searchTerm);


            const highlightedMessage =
                highlightText(
                    message.message,
                    searchTerm
                );


            messageElement.innerHTML = `
                ${message.sender !== currentUser ? `<div class="sender">${highlightedSender}</div>` : ""}
                <div class="text">${highlightedMessage}</div>
                <span class="time">${escapeHTML(message.time || "")}</span>
            `;


            messagesContainer.appendChild(
                messageElement
            );

        }
    );

}


// ========================================
// MESSAGE SEARCH
// ========================================

searchInput.addEventListener(
    "input",
    function () {

        const searchTerm =
            searchInput.value
                .trim()
                .toLowerCase();


        currentSearchIndex =
            -1;


        if (
            searchTerm === ""
        ) {

            searchResults =
                [];


            searchPosition.textContent =
                "0 / 0";


            displayMessages(
                allMessages
            );


            return;

        }


        searchResults =
            allMessages.filter(
                message => {

                    const sender =
                        message.sender
                            ? message.sender
                                .toLowerCase()
                            : "";


                    const text =
                        message.message
                            .toLowerCase();


                    return (
                        sender.includes(
                            searchTerm
                        ) ||
                        text.includes(
                            searchTerm
                        )
                    );

                }
            );


        searchPosition.textContent =
            `0 / ${searchResults.length}`;


        displayMessages(
            searchResults,
            searchTerm
        );


        messageCount.textContent =
            `${searchResults.length} search result${
                searchResults.length === 1
                    ? ""
                    : "s"
            }`;

    }
);


// ========================================
// SEARCH NAVIGATION
// ========================================

previousResult.addEventListener(
    "click",
    function () {

        if (
            searchResults.length === 0
        ) {

            return;

        }


        currentSearchIndex--;


        if (
            currentSearchIndex < 0
        ) {

            currentSearchIndex =
                searchResults.length - 1;

        }


        goToSearchResult();

    }
);


nextResult.addEventListener(
    "click",
    function () {

        if (
            searchResults.length === 0
        ) {

            return;

        }


        currentSearchIndex++;


        if (
            currentSearchIndex >=
            searchResults.length
        ) {

            currentSearchIndex =
                0;

        }


        goToSearchResult();

    }
);


// ========================================
// GO TO SEARCH RESULT
// ========================================

function goToSearchResult() {

    if (
        currentSearchIndex < 0
    ) {

        return;

    }


    const result =
        searchResults[
            currentSearchIndex
        ];


    searchPosition.textContent =
        `${currentSearchIndex + 1} / ${searchResults.length}`;


    const messageElements =
        document.querySelectorAll(
            ".message"
        );


    messageElements.forEach(
        element => {

            element.classList.remove(
                "search-active"
            );

        }
    );


    const matchingIndex =
        allMessages.indexOf(
            result
        );


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
// CHAT LIST SEARCH
// ========================================

chatSearchInput.addEventListener(
    "input",
    function () {

        const searchTerm =
            chatSearchInput.value
                .trim()
                .toLowerCase();


        const items =
            document.querySelectorAll(
                ".chat-list-item"
            );


        items.forEach(
            item => {

                const name =
                    item
                        .querySelector(
                            ".chat-list-name"
                        )
                        .textContent
                        .toLowerCase();


                const preview =
                    item
                        .querySelector(
                            ".chat-list-preview"
                        )
                        .textContent
                        .toLowerCase();


                if (
                    name.includes(
                        searchTerm
                    ) ||
                    preview.includes(
                        searchTerm
                    )
                ) {

                    item.style.display =
                        "flex";

                }

                else {

                    item.style.display =
                        "none";

                }

            }
        );

    }
);


// ========================================
// ADD ARCHIVE BUTTON
// ========================================

addArchiveButton.addEventListener(
    "click",
    function () {

        chatFile.click();

    }
);


// ========================================
// HIGHLIGHT SEARCH
// ========================================

function highlightText(
    text,
    searchTerm
) {

    const safeText =
        escapeHTML(
            text || ""
        );


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


// ========================================
// FORMAT DATE
// ========================================

function formatDate(
    dateString
) {

    const parts =
        dateString.split(
            /[\/.-]/
        );


    if (
        parts.length !== 3
    ) {

        return dateString;

    }


    let day =
        parts[0];

    let month =
        parts[1];

    let year =
        parts[2];


    if (
        year.length === 2
    ) {

        year =
            "20" + year;

    }


    const date =
        new Date(
            Number(year),
            Number(month) - 1,
            Number(day)
        );


    if (
        isNaN(
            date.getTime()
        )
    ) {

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
// SHOW ARCHIVE HOME
// ========================================

function showArchiveHome() {

    archiveHome.classList.remove(
        "hidden"
    );


    chatContainer.classList.add(
        "hidden"
    );


    uploadScreen.classList.add(
        "hidden"
    );


    userSelection.classList.add(
        "hidden"
    );

}


// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(
    text
) {

    return String(
        text
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


// ========================================
// START APPLICATION
// ========================================

async function startApplication() {
    showArchiveHome();
    try {
        archiveChats = await loadChatsFromStorage();
        storageStatus.textContent = archiveChats.length
            ? `${archiveChats.length} saved conversation${archiveChats.length === 1 ? "" : "s"} on this device`
            : "Chats are saved on this device";
    } catch (error) {
        console.error("Could not load saved chats:", error);
        storageStatus.textContent = "Local storage unavailable in this browser";
    }
    displayChatList();
}

startApplication();
