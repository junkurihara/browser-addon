let port;

function setup() {
    window.addEventListener(
        "load",
        () => {
            document
                .getElementById("passphraseButton")
                .addEventListener("click", setPassphrase, false);
            document
                .getElementById("listEntryButton")
                .addEventListener("click", listEntries, false);
            document
                .getElementById("clearEntryButton")
                .addEventListener("click", clearEntries, false);

            document
                .getElementById("entryRegistration")
                .addEventListener("click", registerNewEntry, false);

            chrome.storage.local.get(data => {
                const passphrase = data["#passphrase"] ? data["#passphrase"] : "";
                document.getElementById("passphraseInput").value = passphrase;
            });

            port = browser.runtime.connect({ name: "browserPopup" });
        },
        false
    );
}

function setPassphrase() {
    const passphrase = document.getElementById("passphraseInput").value;
    chrome.storage.local.set({ "#passphrase": passphrase });
}

function listEntries() {
    chrome.storage.local.get(data => {
        document.getElementById("passList").innerText = Object.keys(data).join(", ");
    });
}

function clearEntries() {
    chrome.storage.local.clear();
}

function registerNewEntry() {
    const username = document.getElementById("usernameInput1").value;
    const password = document.getElementById("passwordInput1").value;
    browser.tabs.query({ active: true, currentWindow: true }).then(t => {
        port.postMessage({ mutation: { payload: { username, password, tabs: t } } });
    });
}

setup();
