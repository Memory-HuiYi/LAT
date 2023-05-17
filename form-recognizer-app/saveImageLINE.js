//可以自動儲存LINE的圖片
'use strict';

const line = require('@line/bot-sdk'),
    express = require('express'),
    configGet = require('config');
const fs = require('fs');
//Line config
const configLine = {
    channelAccessToken: configGet.get("CHANNEL_ACCESS_TOKEN"),
    channelSecret: configGet.get("CHANNEL_SECRET")
};

const client = new line.Client(configLine);

const app = express();
const port = process.env.PORT || process.env.port || 3001;

// 設定接收 LINE 訊息的路由
app.post('/callback', line.middleware(configLine), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
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
        messageContent.then((stream) => {
            // 儲存圖片
            const filePath = `saved_images/${event.message.id}.jpg`;
            const writableStream = fs.createWriteStream(filePath);
            stream.pipe(writableStream);

            // 傳送回應給使用者
            const replyMessage = { type: 'text', text: `檔案位置：${filePath}` };

            client.replyMessage(event.replyToken, replyMessage);
        });
    }
}


app.listen(port, () => {
    console.log(`App is listening on port ${port}`);
});