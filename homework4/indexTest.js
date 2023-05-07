'use strict';
const express = require('express'),
  configGet = require('config');
const { TextAnalyticsClient, AzureKeyCredential } = require("@azure/ai-text-analytics");

//Azure Text Sentiment
const endpoint = configGet.get("ENDPOINT");
const apiKey = configGet.get("TEXT_ANALYTICS_API_KEY");

const app = express();

const port = process.env.PORT || process.env.port || 3001;

app.listen(port, () => {
  console.log(`listening on ${port}`);
  MS_TextSentimentAnalysis()
    .catch((err) => {
      console.error("Error:", err);
    });
});

async function MS_TextSentimentAnalysis() {
  console.log("[MS_TextSentimentAnalysis] in");
  const analyticsClient = new TextAnalyticsClient(endpoint, new AzureKeyCredential(apiKey));
  let documents = [];
  documents.push("我覺得櫃檯人員很親切");
  // documents.push("同學上課不認真");
  const results = await analyticsClient.analyzeSentiment(documents, "zh-Hant", { includeOpinionMining: true });
  console.log("[results] ", JSON.stringify(results));
  // console.log("[results] ", JSON.stringify(results, null, 2));

  let maxSentiment = null;
  let maxConfidence = 0;

  for (const result of results) {
    const sentiment = result.sentiment;
    const confidence = result.confidenceScores[sentiment];

    if (confidence > maxConfidence) {
      maxSentiment = sentiment;
      maxConfidence = confidence;
    }
  }

  let myResult = '';
  if (maxSentiment === 'positive') {
    myResult = `正向，信心值${maxConfidence}`;
  } else if (maxSentiment === 'negative') {
    myResult = `負向，信心值${maxConfidence}`;
  } else if (maxSentiment === 'neutral') {
    myResult = `中性，信心值${maxConfidence}`;
  }
  if (results[0].sentences[0].opinions && results[0].sentences[0].opinions.length > 0) {
    const opinion = results[0].sentences[0].opinions[0];
    if (opinion.target) {
      const targetText = opinion.target.text;
      myResult = `${myResult}，${targetText}`;
      console.log(myResult);
    }
  }
  
}