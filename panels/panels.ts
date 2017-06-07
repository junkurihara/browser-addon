/// <reference path="MatchedLoginsPanel.ts" />
/// <reference path="GeneratePasswordPanel.ts" />
/// <reference path="../common/ConfigManager.ts" />

declare const chrome: typeof browser;
let appState: AppState;
let frameState: FrameState;

function updateAppState (newState: AppState) {
    const oldState = appState;
    appState = newState;
}

function updateTabState (newState: FrameState) {
    const oldState = frameState;
    frameState = newState;
}

function closePanel () {
    //TODO:3: Might want more fine-grained closing in future
    myPort.postMessage( { action: "closeAllPanels" } );
}

function startup () {
    KeeFoxLog.debug("iframe page starting");

    KeeFoxLog.attachConfig(configManager.current);

    myPort = chrome.runtime.connect({ name: "iframe_" + parentFrameId });

    switch (params["panel"])
    {
        case "matchedLogins":
            matchedLoginsPanel = new MatchedLoginsPanel();
            document.getElementById("header").innerText = $STR("matched_logins_label");
            myPort.onMessage.addListener(function (m: AddonMessage) {
                KeeFoxLog.debug("In iframe script, received message from background script: ");

                if (m.appState) updateAppState(m.appState);
                if (m.frameState) updateTabState(m.frameState);

                //TODO:c: sometimes don't do this?
                matchedLoginsPanel.createNearNode(document.getElementById("header"), frameState.logins);
            });
        break;
        case "generatePassword":
            generatePasswordPanel = new GeneratePasswordPanel();
            document.getElementById("header").innerText = $STR("Menu_Button_copyNewPasswordToClipboard_label");
            let passwordReceived = false;
            myPort.onMessage.addListener(function (m: AddonMessage) {
                KeeFoxLog.debug("In iframe script, received message from background script: ");

                if (m.appState) updateAppState(m.appState);
                if (m.frameState) updateTabState(m.frameState);

                if (!m.generatedPassword && m.generatedPassword != "") {
                    myPort.postMessage({ action: "generatePassword" });
                } else {
                    generatePasswordPanel.copyStringToClipboard(m.generatedPassword);

                    if (passwordReceived) {
                        closePanel();
                    } else {
                        generatePasswordPanel.createNearNode(document.getElementById("header"), m.passwordProfiles);
                        passwordReceived = true;
                    }
                }

            });
        break;
    }

    const closeButton = document.createElement("button");
    closeButton.textContent = $STR("close");
    closeButton.addEventListener("click", e => {
        closePanel();
    });
    document.getElementById("closeContainer").appendChild(closeButton);

    if (params["autoCloseTime"]) {
        const autoCloseTime = parseInt(params["autoCloseTime"]);
        if (!Number.isNaN(autoCloseTime) && autoCloseTime > 0) {
            const autoCloseTimerEnd = Date.now() + autoCloseTime*1000;
            const autoCloseInterval = setInterval(() => {
                const now = Date.now();
                if (now >= autoCloseTimerEnd) {
                    clearInterval(autoCloseInterval);
                    closePanel();
                }
                const secondsRemaining = Math.ceil((autoCloseTimerEnd - now)/1000);
                document.getElementById("autoCloseLabel").textContent = $STRF("autoclose_countdown", secondsRemaining.toString());
            }, 1000);
            const autoClose = document.createElement("div");
            autoClose.id="autoClose";
            const autoCloseSetting = document.createElement("input");
            autoCloseSetting.type = "checkbox";
            autoCloseSetting.checked = true;
            autoCloseSetting.addEventListener("change", e => {
                clearInterval(autoCloseInterval);
            });
            const autoCloseLabel = document.createElement("label");
            autoCloseLabel.textContent = $STRF("autoclose_countdown", autoCloseTime.toString());
            autoCloseLabel.htmlFor = "autoClose";
            autoCloseLabel.id = "autoCloseLabel";
            autoClose.appendChild(autoCloseSetting);
            autoClose.appendChild(autoCloseLabel);
            document.getElementById("closeContainer").appendChild(autoClose);
        }
    }
    KeeFoxLog.info("iframe page ready");
}

let matchedLoginsPanel: MatchedLoginsPanel;
let generatePasswordPanel: GeneratePasswordPanel;
let myPort: browser.runtime.Port;
let params = {};

document.location.search.substr(1).split("&").forEach(pair => {
    const [key, value] = pair.split("=");
    params[key] = value;
});

const parentFrameId = params["parentFrameId"];

// Load our config and start the panel once done
configManager.load(startup);