// Require the express module
const express = require('express');

// Create an express app object
const app = express();

// Use express.json middleware to parse JSON request bodies
app.use(express.json());

const cors = require('cors');
app.use(cors());

const { CosmosClient } = require('@azure/cosmos');

const config = require('../config');
const endpoint = config.endpoint;
const key = config.key;
const client = new CosmosClient({ endpoint, key });

const databaseId = 'db';
const containerId = 'Games';
const container = client.database(databaseId).container(containerId);
const partitionKey = { kind: 'Hash', paths: ['/id'] };

const stocksContainer = client.database(databaseId).container('Stocks');

const { v4: uuidv4 } = require('uuid');

app.post('/games/:id/bot-decision', async (req, res) => {
  const gameId = req.params.id;
  const { resource: game } = await container.item(gameId, gameId).read();

  if (!game) {
    res.status(404).json({ message: "Game not found" });
    return;
  }

  const botUserId = 'bot-user';
  const botUser = game.users.find(u => u.user_id === botUserId);

  if (!botUser) {
    res.status(404).json({ message: "Bot user not found" });
    return;
  }

  const symbols = ["AAPL", "AMZN", "CSCO", "IBM", "MSFT"];
  const currentRound = game.current_round;

  // Initialize a list to store bot decisions for this round
  const botDecisions = [];

  for (const symbol of symbols) {
    // Get the predicted decision for the stock symbol
    const predictedDecision = await getStockPredictionFromModel(symbol, currentRound);

    // Decide on a random quantity based on the bot's balance (you can adjust this logic)
    const randomQuantity = Math.floor(Math.random() * 10) + 1;

    // Prepare the response object for this stock
    const decisionData = {
      decision: predictedDecision,
      symbol: symbol,
      quantity: 0, // Default quantity is 0
      user_id: botUserId,
      predicted_price: 0, // Default predicted price is 0
    };

    // Update the decision based on the predicted decision
    if (predictedDecision === 'buy' && botUser.balance > 0) {
      decisionData.decision = 'buy';
      decisionData.quantity = randomQuantity;
      decisionData.predicted_price = await getStockPricePrediction(symbol, currentRound);
      // Adjust the bot's balance and profit based on the purchase
      botUser.balance -= decisionData.predicted_price * decisionData.quantity;
      botUser.profit = await calculateProfit(botUser, game);
    } else if (predictedDecision === 'sell' && botUser.investments.some(i => i.symbol === symbol)) {
      decisionData.decision = 'sell';
      decisionData.quantity = randomQuantity;
      decisionData.predicted_price = await getStockPricePrediction(symbol, currentRound);
      // Adjust the bot's balance and profit based on the sale
      botUser.balance += decisionData.predicted_price * decisionData.quantity;
      botUser.profit = await calculateProfit(botUser, game);
    }

    // Add the decision data to the list
    botDecisions.push(decisionData);
  }

  // Update the game session with the modified user data
  const { resource: updatedGame } = await container.item(gameId, gameId).replace(game);

  res.status(200).json(botDecisions);
});

// Call the logistic regression model to get predictions for a given stock symbol
async function getStockPredictionFromModel(symbol, currentRound) {
  // You should implement this function to call your logistic regression model
  // and get the prediction ("buy", "sell", or "hold") for the given symbol and current round.
  // For now, let's assume it returns a random decision ("buy", "sell", or "hold").
  const decisions = ["buy", "sell", "hold"];
  const predictedDecision = decisions[Math.floor(Math.random() * decisions.length)];
  return predictedDecision;
}

// Implement the getStockPricePrediction function based on your ML model's predictions
// This function should return the predicted price for the given stock symbol and current round
async function getStockPricePrediction(symbol, currentRound) {
  // You should implement this function to get the predicted price for the given symbol and current round.
  // The logic will depend on your machine learning model and how it predicts stock prices.
  // For now, let's assume it returns a random price within a certain range.
  const minPrice = 100; // Minimum price
  const maxPrice = 500; // Maximum price
  const predictedPrice = Math.random() * (maxPrice - minPrice) + minPrice;
  return predictedPrice.toFixed(2);
}

// A function that calculates the profit of the user based on the investments array
async function calculateProfit(user, game) {
  // ... (existing logic for calculating profit)
  // Implement your logic to update the bot's profit based on its decisions and actual stock price changes.
  // You can retrieve the actual stock price for the current round from the game object.
  // Update the bot's profit accordingly.
  // Return the updated profit.
  return updatedProfit.toFixed(2);
}

// ... (other existing endpoints)

// Listen on port 3000
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
