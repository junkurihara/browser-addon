import { Action } from "../common/Action";
import { KeeURL } from "../common/KeeURL";
import { AddonMessage } from "../common/AddonMessage";
import { Entry } from "../common/model/Entry";
import jscu from "js-crypto-utils";
import jseu from "js-encoding-utils";

const defaultPassphrase = "omgomg!";
const hash = "SHA-256";
const iter = 2048;
const dkLen = 32;

export async function handleMessage(p: browser.runtime.Port, msg: AddonMessage) {
    console.log("------------- storage -------------");
    console.log(msg);

    // if (msg.mutation) {
    //     console.log("msg.mutation");
    //     // window.kee.syncBackground.onMessage(this, msg.mutation);
    // }

    // if (KeeLog && KeeLog.debug) {
    //     KeeLog.debug("In background script, received message from page script.");
    // }

    if (msg.findMatches) {
        console.log(
            "msg.findMatches --> ここで頑張ってurlからDBの中にマッチするエントリがあるか探す。" +
                "exact match後に3レベルで検索…"
        );
        const keeUrl = KeeURL.fromString(msg.findMatches.uri);
        const matchedEntry = await browser.storage.local.get(keeUrl.domainWithPort);
        console.log("------ Mathced entry -------");
        console.log(keeUrl.domain);
        console.log(matchedEntry);
        console.log("------------");

        // DECRYPT HERE!
        let result = [];
        if (Object.keys(matchedEntry).length > 0) {
            const encryptedObject = matchedEntry[keeUrl.domainWithPort];
            const salt = jseu.encoder.decodeBase64(encryptedObject.pbkdfObject.salt);
            const passphraseObj: any = await browser.storage.local.get("#passphrase");
            const passphrase: string =
                Object.keys(passphraseObj).length > 0
                    ? passphraseObj["#passphrase"]
                    : defaultPassphrase;
            const key = await jscu.pbkdf.pbkdf2(
                passphrase,
                salt as Uint8Array,
                encryptedObject.pbkdfObject.iter,
                encryptedObject.pbkdfObject.dkLen,
                encryptedObject.pbkdfObject.hash
            );
            const iv = jseu.encoder.decodeBase64(encryptedObject.ciphertextObject.iv);
            const ciphertext = jseu.encoder.decodeBase64(
                encryptedObject.ciphertextObject.ciphertext
            );
            const plaintext = await jscu.aes.decrypt(ciphertext as Uint8Array, key, {
                name: encryptedObject.ciphertextObject.name,
                iv: iv as Uint8Array
            });
            const decryptedObject = JSON.parse(new TextDecoder("utf-8").decode(plaintext.buffer));
            console.log("decryptedObject");
            console.log(decryptedObject);
            result = [
                new Entry({
                    fields: decryptedObject.fields,
                    URLs: [keeUrl.domainWithPort],
                    title: decryptedObject.title
                })
            ];
        }

        // const result = Object.keys(matchedEntry).map(
        //     key =>
        //         new Entry({
        //             fields: matchedEntry[key].fields,
        //             URLs: [key],
        //             title: matchedEntry[key].title
        //         })
        // );
        // window.kee.tabStates.get(this.sender.tab.id).frames.get(this.sender.frameId).entries = [];
        // const result = await window.kee.findLogins(
        //     msg.findMatches.uri,
        //     null,
        //     null,
        //     null,
        //     null,
        //     null
        // );
        p.postMessage({
            // isForegroundTab: true,
            findMatchesResult: result
        } as AddonMessage);
    }
    // if (msg.removeNotification) {
    //     console.log("msg.removeNotification");
    //     // window.kee.removeUserNotifications((n: KeeNotification) => n.id != msg.removeNotification);
    //     // try {
    //     //     window.kee.browserPopupPort.postMessage({
    //     //         isForegroundTab: this.sender.tab.id === window.kee.foregroundTabId
    //     //     } as AddonMessage);
    //     // } catch (e) {
    //     //     /* whatever */
    //     // }
    // }
    // if (msg.entries) {
    //     console.log("msg.entries");
    //     // window.kee.tabStates.get(this.sender.tab.id).frames.get(this.sender.frameId).entries =
    //     //     msg.entries;
    // }
    if (msg.submittedData) {
        console.log("msg.submittedData --> urlおよびID/Passのフィールド、メタデータを受け取る");
        const persistentItem = {
            itemType: "submittedData" as const,
            submittedData: msg.submittedData,
            creationDate: new Date()
        };
        console.log(persistentItem);
        const item = {};
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        const keeUrl = KeeURL.fromString(persistentItem.submittedData.url);

        // ENCRYPT HERE!
        const salt = jscu.random.getRandomBytes(32);
        const passphraseObj: any = await browser.storage.local.get("#passphrase");
        const passphrase: string =
            Object.keys(passphraseObj).length > 0
                ? passphraseObj["#passphrase"]
                : defaultPassphrase;
        const key = await jscu.pbkdf.pbkdf2(passphrase, salt, iter, 32, hash);
        const plaintext = new TextEncoder().encode(JSON.stringify(persistentItem.submittedData));
        const iv = jscu.random.getRandomBytes(16);
        const ciphertext = await jscu.aes.encrypt(new Uint8Array(plaintext), key, { name: "AES-CBC", iv });
        const pbkdfObject = { salt: jseu.encoder.encodeBase64(salt), iter, dkLen, hash };
        const ciphertextObject = {
            ciphertext: jseu.encoder.encodeBase64(ciphertext),
            iv: jseu.encoder.encodeBase64(iv),
            name: "AES-CBC"
        };
        const encryptedObject = { pbkdfObject, ciphertextObject };
        console.log("encryptedObject");
        console.log(encryptedObject);

        item[keeUrl.domainWithPort] = encryptedObject; // persistentItem.submittedData;
        console.log(item);
        await browser.storage.local.set(item);

        console.log("------ current browser.storage.local ------");
        console.log(await browser.storage.local.get());
        console.log("------------");

        // if (!window.kee.persistentTabStates.get(this.sender.tab.id)) {
        //     window.kee.persistentTabStates.set(this.sender.tab.id, {
        //         items: []
        //     });
        // }

        // // Don't allow more than one entry to be tracked for this tab
        // if (window.kee.persistentTabStates.get(this.sender.tab.id)) {
        //     window.kee.persistentTabStates.get(
        //         this.sender.tab.id
        //     ).items = window.kee.persistentTabStates
        //         .get(this.sender.tab.id)
        //         .items.filter(item => item.itemType !== "submittedData");
        // }
        //
        // window.kee.persistentTabStates.get(this.sender.tab.id).items.push(persistentItem);
        //
        // // Don't alert the user if it's less than 90 seconds since they initiated an
        // // update request - highly likely that this is just the result of that
        // // operation being submitted to the website.
        // if (store.state.entryUpdateStartedAtTimestamp >= Date.now() - 90000) return;
        //
        // if (configManager.current.notificationCountSavePassword < 10) {
        //     browser.notifications.create({
        //         type: "basic",
        //         iconUrl: browser.extension.getURL("common/images/128.png"),
        //         title: $STR("savePasswordText"),
        //         message:
        //             $STR("notification_save_password_tip") +
        //             "\n" +
        //             $STR("notification_only_shown_some_times")
        //     });
        //     configManager.setASAP({
        //         notificationCountSavePassword:
        //             configManager.current.notificationCountSavePassword + 1
        //     });
        // }
        // if (configManager.current.animateWhenOfferingSave) {
        //     window.kee.animateBrowserActionIcon();
        // }
    }
    if (msg.action === Action.ShowMatchedLoginsPanel) {
        console.log("msg.action === Action.ShowMatchedLoginsPanel");
        // window.kee.tabStates.get(this.sender.tab.id).framePorts.get(0).postMessage({
        //     action: Action.ShowMatchedLoginsPanel,
        //     frameId: this.sender.frameId
        // });
    }
    if (msg.action === Action.PageHide) {
        console.log(
            "msg.action === Action.PageHide --> ログイン失敗時などリロード時に走る。だからdisconnectされる？"
        );
        // try {
        //     window.kee.tabStates.get(this.sender.frameId).framePorts.forEach((port, key, map) => {
        //         try {
        //             port.disconnect();
        //         } catch (e) {
        //             if (KeeLog && KeeLog.debug) {
        //                 KeeLog.debug(
        //                     "failed to disconnect a frame port on tab " +
        //                     key +
        //                     ". This is probably not a problem but we may now be reliant on browser " +
        //                     "GC to clear down memory. The exception that caused this is: " +
        //                     e.message +
        //                     " : " +
        //                     e.stack
        //                 );
        //             }
        //         } finally {
        //             map.delete(key);
        //         }
        //     });
        // } catch (e) {
        //     // Happens when an iframe is hidden after the top-level frame. The
        //     // only impact is some messaging ports remaining open for longer
        //     // than required. Pretty sure the browser has to deal with this
        //     // situation already - probably just through standard GC.
        // }
        // if (this.sender.frameId === 0) {
        //     window.kee.deleteTabState(this.sender.tab.id);
        // }
    }
}
