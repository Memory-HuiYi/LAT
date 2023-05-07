'use strict';
const line = require('@line/bot-sdk'),
  express = require('express'),
  configGet = require('config');
const { TextAnalyticsClient, AzureKeyCredential } = require("@azure/ai-text-analytics");

//Line config
const configLine = {
  channelAccessToken: configGet.get("CHANNEL_ACCESS_TOKEN"),
  channelSecret: configGet.get("CHANNEL_SECRET")
};

//Azure Text Sentiment
const endpoint = configGet.get("ENDPOINT");
const apiKey = configGet.get("TEXT_ANALYTICS_API_KEY");

const client = new line.Client(configLine);
const app = express();

const port = process.env.PORT || process.env.port || 3001;

app.listen(port, () => {
  console.log(`listening on ${port}`);
});

async function MS_TextSentimentAnalysis(thisEvent) {
  console.log("[MS_TextSentimentAnalysis] in");
  const analyticsClient = new TextAnalyticsClient(endpoint, new AzureKeyCredential(apiKey));
  let documents = [];
  documents.push(thisEvent.message.text);
  //這裡開始有改
  //"zh-Hant", { includeOpinionMining: true }：開啟Opinion Mining的判斷(?
  const results = await analyticsClient.analyzeSentiment(documents, "zh-Hant", { includeOpinionMining: true });
  console.log("[results] ", JSON.stringify(results));
  // console.log("[results] ", JSON.stringify(results, null, 2));

  let maxSentiment = null;
  let maxConfidence = 0;

  //抓結果maxSentiment、信心值maxConfidence

  for (const result of results) {
    const sentiment = result.sentiment;
    const confidence = result.confidenceScores[sentiment];

    if (confidence > maxConfidence) {
      maxSentiment = sentiment;
      maxConfidence = confidence;
    }
  }

  //判斷結果，把結果變為中文存到myResult、信心值存到myResult

  let myResult = '';
  if (maxSentiment === 'positive') {
    myResult = `正向，信心值${maxConfidence}`;
  } else if (maxSentiment === 'negative') {
    myResult = `負向，信心值${maxConfidence}`;
  } else if (maxSentiment === 'neutral') {
    myResult = `中性，信心值${maxConfidence}`;
  }

  //如果有抓到主詞(?)，myResult+上主詞

  if (results[0].sentences[0].opinions && results[0].sentences[0].opinions.length > 0) {
    const opinion = results[0].sentences[0].opinions[0];
    if (opinion.target) {
      const targetText = opinion.target.text;
      myResult = `${myResult}，${targetText}`;
    }
  }
  
  console.log(myResult);

  const echo = {

    type: 'text',
    // text: event.message.text
    text: myResult  //改的最後一行，輸出myResult
  };
  
  return client.replyMessage(thisEvent.replyToken, echo);
}

app.post('/callback', line.middleware(configLine), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  MS_TextSentimentAnalysis(event)
  .catch((err)=>{
    console.error("Error:",err);
  });  
}