// 追加 by quvox

const addStyle = (doc: HTMLDocument, url: string) => {
    const head = doc.getElementsByTagName("head").item(0);
    const link = doc.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.type = "text/css";
    head.appendChild(link);
};

export function showMessageIframe() {
    const iframeElement: HTMLIFrameElement = document.getElementById(
        "ijctdIframeElement"
    ) as HTMLIFrameElement;
    const iframeWindow = iframeElement.contentWindow;
    iframeWindow.document.getElementById("ijctdInnerDivElement").innerHTML =
        "<div>パスワードがもともと登録されていたものと合致しません。<br></br>popupからパスワードを入力するか、記録削除を押してパスフレーズをセットし直してください</div>";
}

export function setupIframe() {
    const htmlString = `
    <div id="ijctdDivElement" style="position: absolute; left: 100px; top: 200px; background-color: transparent; z-index: 9999">
        <iframe id="ijctdIframeElement" style="width:100%; height:100%; overflow: auto; background-color: whitesmoke" frameborder=0 scrolling="no" ></iframe>
    </div>`;
    window.document.body.insertAdjacentHTML("beforeend", htmlString);
    const iframeElement: HTMLIFrameElement = document.getElementById(
        "ijctdIframeElement"
    ) as HTMLIFrameElement;
    const iframeWindow = iframeElement.contentWindow;
    const iframeString = '<div id="ijctdInnerDivElement"></div>';
    iframeWindow.document.body.insertAdjacentHTML("beforeend", iframeString);
    addStyle(
        iframeWindow.document,
        "https://fonts.googleapis.com/css?family=Roboto:100,300,400,500,700,900"
    );
    addStyle(
        iframeWindow.document,
        "https://cdn.jsdelivr.net/npm/@mdi/font@4.x/css/materialdesignicons.min.css"
    );
    showMessageIframe();
}
