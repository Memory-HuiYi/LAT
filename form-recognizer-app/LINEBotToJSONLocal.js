//儲存時一並識別並輸出成檔案
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
//Azure Form Recognizer config
const endpoint = configGet.get("ENDPOINT");
const apiKey = configGet.get("FORM_RECOGINIZER_API_KEY");

const client = new line.Client(configLine);

const app = express();
const port = process.env.PORT || process.env.port || 3001;


// Set up the route to handle LINE messages
app.post('/callback', line.middleware(configLine), (req, res) => {
    Promise.all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error(err);
            res.status(500).end();
        });
});

//轉為文字檔
async function writeToFile(content, filePath) {
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, content, 'utf8', (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}


// 呼叫 Azure Form Recognizer
//可以識別圖片檔、PDF檔
async function performFormRecognition(filePath) {
    console.log("Converting...");

    const recognizerClient = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));

    const poller = await recognizerClient.beginAnalyzeDocument("prebuilt-document", fs.readFileSync(filePath));
    const { content, pages } = await poller.pollUntilDone();

    //toTxt
    let lineResult = "";
    //toJSON
    let output = {
        pages: []
    };

    if (pages.length <= 0) {
        console.log("No pages were extracted from the document.");
    } else {
        console.log("Pages:");
        for (const page of pages) {
            console.log("- Page", page.pageNumber, `(unit: ${page.unit})`);
            console.log(`  ${page.width}x${page.height}, angle: ${page.angle}`);
            console.log(`  ${page.lines.length} lines, ${page.words.length} words`);

            if (page.lines.length > 0) {
                console.log("  Lines:");
                let lines = [];
                for (const line of page.lines) {
                    let lineContent = "";
                    for (const word of line.words()) {
                        lineContent += word.content;
                    }
                    console.log(`  - "${lineContent}"`);
                    //toTxt
                    lineResult += lineContent;
                    //toJSON
                    lines.push(lineContent);
                }
                //toJSON
                output.pages.push({
                    pageNumber: page.pageNumber,
                    unit: page.unit,
                    width: page.width,
                    height: page.height,
                    angle: page.angle,
                    lines: lines
                });


            }
        }
        //toTxt
        const outputFilePath = `output.txt`;
        await writeToFile(lineResult, outputFilePath);
        //toJSON
        const outputFilePathJSON = `output.json`;
        await writeToFile(JSON.stringify(output), outputFilePathJSON);
        console.log("File has been written successfully.");
    }
}


// 處理接收到的 LINE 訊息
async function handleEvent(event) {
    if (event.message.type === 'image') {
        const messageContent = await client.getMessageContent(event.message.id);
        const filePath = `saved_images/${event.message.id}.jpg`;

        // 儲存圖片到本地
        const writableStream = fs.createWriteStream(filePath);
        await new Promise((resolve, reject) => {
            messageContent.pipe(writableStream);
            writableStream.on('finish', resolve);
            writableStream.on('error', reject);
        });

        // Send the response to the user
        const replyMessage = { type: 'text', text: '圖片已儲存' };
        client.replyMessage(event.replyToken, replyMessage);

        // 執行文字辨識操作
        performFormRecognition(filePath);
    }
}





app.listen(port, () => {
    console.log(`App is listening on port ${port}`);
    // performFormRecognition()
    //     .catch((err) => {
    //         console.error("Error:", err);
    //     });
});