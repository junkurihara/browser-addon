function setup() {
    window.addEventListener("load", () => {
        document
            .getElementById("passphraseButton")
            .addEventListener("click", setPassphrase, false);
        document
            .getElementById("listEntryButton")
            .addEventListener("click", listEntries, false);
        document
            .getElementById("clearEntryButton")
            .addEventListener("click", clearEntries, false);

        chrome.storage.local.get(data => {
            const passphrase = data['#passphrase'] ? data['#passphrase'] : "";
            document.getElementById("passphraseInput").value = passphrase;
        });
    }, false);

}

function setPassphrase() {
    const passphrase = document.getElementById("passphraseInput").value;
    chrome.storage.local.set({"#passphrase": passphrase});
}

function listEntries() {
    chrome.storage.local.get(data => {
        document.getElementById("passList").innerText = Object.keys(data).join(", ");
    });
}

function clearEntries() {
    chrome.storage.local.clear();
}

setup();
