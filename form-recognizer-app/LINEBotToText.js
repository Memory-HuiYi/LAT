//串接LINEBot自動上傳+下載&Form Recognizer圖片轉文字
'use strict';

const line = require('@line/bot-sdk'),
    express = require('express'),
    configGet = require('config');
const fs = require('fs');
const { BlobServiceClient } = require('@azure/storage-blob');
const { AzureKeyCredential, DocumentAnalysisClient } = require("@azure/ai-form-recognizer");

//Line config
const configLine = {
    channelAccessToken: configGet.get("CHANNEL_ACCESS_TOKEN"),
    channelSecret: configGet.get("CHANNEL_SECRET")
};
//Azure Form Recognizer config
const endpoint = configGet.get("ENDPOINT");
const apiKey = configGet.get("FORM_RECOGINIZER_API_KEY");

// Azure Blob Storage config
const connectionString = configGet.get('AZURE_STORAGE_CONNECTION_STRING');
const containerName = 'images';

const client = new line.Client(configLine);

const app = express();
const port = process.env.PORT || process.env.port || 3001;

// Create a BlobServiceClient instance
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

// Create a container
async function createContainer() {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();
}

// Save image to Azure Blob Storage
async function saveToBlobStorage(stream, fileName) {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    await blockBlobClient.uploadStream(stream);
    return blockBlobClient.url;
}

// Set up the route to handle LINE messages
app.post('/callback', line.middleware(configLine), (req, res) => {
    Promise.all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error(err);
            res.status(500).end();
        });
});

// 呼叫 Azure Form Recognizer
//可以識別圖片檔、PDF檔
async function performFormRecognition(e) {
    console.log("Converting...")
    
    const recognizerclient = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));

    const poller = await recognizerclient.beginAnalyzeDocumentFromUrl("prebuilt-document", e);
    const { content, pages } = await poller.pollUntilDone();

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

                for (const line of page.lines) {
                    let lineContent = "";
                    for (const word of line.words()) {
                        lineContent += word.content;
                    }
                    console.log(`  - "${lineContent}"`);
                }
            }
        }
    }
}

// 處理接收到的 LINE 訊息
function handleEvent(event) {
    if (event.message.type === 'image') {
        const messageContent = client.getMessageContent(event.message.id);
        messageContent.then(async (stream) => {
            try {

                // Save image to Azure Blob Storage
                await createContainer();
                const fileName = `${event.message.id}.jpg`;
                const imageUrl = await saveToBlobStorage(stream, fileName);

                // 儲存圖片
                const filePath = `saved_images/${event.message.id}.jpg`;
                const writableStream = fs.createWriteStream(filePath);
                stream.pipe(writableStream);

                // Send the response to the user
                const replyMessage = { type: 'text', text: `圖片已上傳，圖片網址：${imageUrl}` };
                client.replyMessage(event.replyToken, replyMessage);

                performFormRecognition(imageUrl);

            } catch (error) {
                console.error('Error:', error);
                const replyMessage = { type: 'text', text: '圖片上傳失敗' };
                client.replyMessage(event.replyToken, replyMessage);
            }
        });
    }
}


app.listen(port, () => {
    console.log(`App is listening on port ${port}`);
});