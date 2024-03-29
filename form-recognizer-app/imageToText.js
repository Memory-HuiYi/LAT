//出來的東西不是想要的
//在伺服器啟動時可以將圖片(網址)轉文字
'use strict';

const line = require('@line/bot-sdk'),
    express = require('express'),
    configGet = require('config');
const fs = require('fs');
const { AzureKeyCredential, DocumentAnalysisClient } = require("@azure/ai-form-recognizer");

//Line config
const configLine = {
    channelAccessToken: configGet.get("CHANNEL_ACCESS_TOKEN"),
    channelSecret: configGet.get("CHANNEL_SECRET")
};

//Azure
const endpoint = configGet.get("ENDPOINT");
const apiKey = configGet.get("FORM_RECOGINIZER_API_KEY");

const client = new line.Client(configLine);

const app = express();
const port = process.env.PORT || process.env.port || 3001;


// 呼叫 Azure Form Recognizer
async function performFormRecognition() {
    console.log("Converting...")
    //可以識別圖片檔、PDF檔
    const formUrl = "https://user-images.githubusercontent.com/125955622/236685011-7a896eb2-b2aa-433f-955e-4f63d3c0cb2c.jpg"
    // const formUrl = "https://www.tahrd.ntnu.edu.tw/wp-content/uploads/2021/03/%E6%9C%AC%E7%B3%BB%E5%B0%88%E6%A5%AD%E5%AF%A6%E7%BF%92%E8%AA%B2%E7%A8%8B%E5%AF%A6%E6%96%BD%E8%BE%A6%E6%B3%95.pdf"

    const recognizerclient = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));

    const poller = await recognizerclient.beginAnalyzeDocumentFromUrl("prebuilt-document", formUrl);
    const { keyValuePairs } = await poller.pollUntilDone();

    if (!keyValuePairs || keyValuePairs.length <= 0) {
        console.log("No key-value pairs were extracted from the document.");
    } else {
        console.log("Key-Value Pairs:");
        for (const { key, value, confidence } of keyValuePairs) {
            console.log("- Key  :", `"${key.content}"`);
            console.log("  Value:", `"${(value && value.content) || "<undefined>"}" (${confidence})`);
        }
    }
}

app.listen(port, () => {
    console.log(`App is listening on port ${port}`);
    performFormRecognition()
        .catch((err) => {
            console.error("Error:", err);
        });
});