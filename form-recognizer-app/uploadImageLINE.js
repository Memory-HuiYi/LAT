//可以自動上傳
'use strict';

const line = require('@line/bot-sdk'),
    express = require('express'),
    configGet = require('config');
const fs = require('fs');
const { BlobServiceClient } = require('@azure/storage-blob');

//Line config
const configLine = {
    channelAccessToken: configGet.get("CHANNEL_ACCESS_TOKEN"),
    channelSecret: configGet.get("CHANNEL_SECRET")
};

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

// 處理接收到的 LINE 訊息
function handleEvent(event) {
    if (event.message.type === 'image') {
        const messageContent = client.getMessageContent(event.message.id);
        messageContent.then(async (stream) => {
            try {
                
                // // 儲存圖片
                // const filePath = `saved_images/${event.message.id}.jpg`;
                // const writableStream = fs.createWriteStream(filePath);
                // stream.pipe(writableStream);

                // Save image to Azure Blob Storage
                await createContainer();
                const fileName = `${event.message.id}.jpg`;
                const imageUrl = await saveToBlobStorage(stream, fileName);

                // Send the response to the user
                const replyMessage = { type: 'text', text: `圖片網址：${imageUrl}` };
                client.replyMessage(event.replyToken, replyMessage);
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