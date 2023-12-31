

// Require the express module
const express = require('express');

// Create an express app object
const app = express();

// Use express.json middleware to parse JSON request bodies
app.use(express.json());

const cors = require('cors');
app.use(cors());


const { CosmosClient } = require('@azure/cosmos');

const config = require('../config')
const endpoint = config.endpoint;
const key = config.key;
const client = new CosmosClient({ endpoint, key });


const databaseId = 'db';
const containerId = 'Games';
const container = client.database(databaseId).container(containerId);
const partitionKey = { kind: 'Hash', paths: ['/id'] }

const stocksContainer = client.database(databaseId).container('Stocks');

const { v4: uuidv4 } = require('uuid');

app.post('/games', async (req, res) => {
  // Create a new game object with an id and an empty array of users
  let uuid=uuidv4();
  let Game_id = uuidv4();
  const newGame = {
    id: Game_id,
    current_round:1,
    users: [],
    stocks: await generatestocksforgame(["AAPL","AMZN","CSCO","IBM","MSFT"])
  };

  const user={
    user_id:uuid,
    username:'bot-user',
    balance: 4000,
    profit:0,
    stocksValue:0,
    investments:[]
  }

  // Try to insert the new game into the container
  try {
    newGame.users.push(user);
    const { resource } = await container.items.create(newGame);
   
    // Send a 201 status code and the created game as the response
    res.status(200).json({Game_id});
  } catch (error) {
    // If there is an error, send a 500 status code and the error message as the response
    res.status(500).json(error);
  }
});

app.get('/games/check', async (req, res) => {
  // Get the game id from the query parameter
  const gameId = req.query.id;
  // Try to find an item with the same id in the Games container
  
  const { resource} = await container.item(gameId, gameId).read();
   if(resource!=undefined){
    res.json({valid:true})
  } 
 else{
  res.json({ valid: false }); }
      });


app.get('/games/:id', async (req, res) => {
  // Try to query all the games from the container
  id=req.params.id;
  try {
    const { resource } = await container.item(id, id).read();
    // Send a 200 status code and the games array as the response
    res.status(200).json(resource);
  } catch (error) {
    // If there is an error, send a 500 status code and the error message as the response
    res.status(500).json(error);
  }
});


app.delete("/games/:id", async (req, res) => {
  const id  = req.params.id;
  // Try to delete the game with the given id from the container
  try {
    const { resource } = await container.item(id,id).delete();
    // Send a 200 status code and the deleted game as the response
    res.status(200).json(id+" game session has ended")
  } catch (error) {
    // If there is an error, send a 500 status code and the error message as the response
    res.status(500).json(error);
  }
});



app.post('/games/:id/join-game', async (req,res)=> {
  const id = req.params.id;
  let uuid = uuidv4();
  const user= {
    user_id:uuid,
    username:req.body.username,
    balance: 4000,
    profit:0,
    stocksValue:0,
    investments:[]
  };
  
  // Try to update the game with the given id by adding the user to its users array
  try {
    const { resource } = await container.item(id, id).read()
    resource.users.push(user);
    const { resource: updatedResource } = await container.item(id, id).replace(resource);
    // Send a 201 status code and the updated game as the response
    res.status(201).json({userId: uuid}); 
  } catch (error) {
    // If there is an error, send a 500 status code and the error message as the response
    res.status(500).json(error);
  }
  
})


app.get('/games/:gameId/:userId', async (req, res) => {
  const id=req.params.gameId;
  const userId=req.params.userId;
  
  try {
    const { resource : game} = await container.item(id, id).read();
    const user =game.users.find(u => u.user_id === userId)

    res.status(200).json(user);
  } catch (error) {
    // If there is an error, send a 500 status code and the error message as the response
    res.status(500).json(error);
  }
})


app.put('/games/:id/currentround' , async (req, res) => {
  const id = req.params.id;
   try {
    // Read the game item from the container and get the resource property
    const { resource:game }  = await container.item(id, id).read();
 
      res.status(200).json(game.stocks[game.current_round]);
  }
  catch (error) {
    // If there is an error, send a 500 status code and the error message as the response
    res.status(500).json(error);
  }
});

app.put('/games/:id/round' , async (req, res) => {
  const id = req.params.id;
   try {
    // Read the game item from the container and get the resource property
    const { resource:game }  = await container.item(id, id).read();
    
      res.status(200).json({currentRound:game.current_round});
  }
  catch (error) {
    // If there is an error, send a 500 status code and the error message as the response
    res.status(500).json(error);
  }
});



app.put('/games/:id/nextround', async (req, res) => {
  const id = req.params.id;
   try {
    // Read the game item from the container and get the resource property
    const { resource }  = await container.item(id, id).read();
    // Assign the resource property to a constant called game
    const game = resource;
    if (game.current_round<10){
      // Increment the current day by one
      game.current_round+=1;
      const users= game.users;
      for (let user of users) {
        user.profit=await calculateProfit(user,game);
        user.stocksValue=calculateStocksValue(game, user);
      }
      // Update the game item with the modified data
      const updatedGame = await container.item(id, id).replace(game);
      // Send a 200 status code and the updated game as the response
      res.status(200).json(game.stocks[game.current_round]);
  
    }
    else{
      // Delete the game item from the container
      //const { resource } = await container.item(id, id).delete();
      // Send a 200 status code and a confirmation message as the response
      res.status(400).json(id+" game session has ended")
    }
  } catch (error) {
    // If there is an error, send a 500 status code and the error message as the response
    res.status(500).json(error);
  }
});

async function createContainer() {
  const { container } = await client
    .database(databaseId)
    .containers.createIfNotExists(
      { id: containerId, partitionKey },
      { offerThroughput: 400 }
    )
}



// Define a function to calculate the rate of change between two numbers in percent
function rateOfChange(oldValue, newValue) {
  return ((newValue - oldValue) / oldValue) * 100;
}

// Define an endpoint to get the rate of change for a specific stock in a game session
app.put('/games/:id/rate-of-change', async (req, res) => {
  // Get the game id from the request parameter
  const gameId = req.params.id;

  // Get the stock symbol from the request body
  const symbol = req.body.symbol;

  // Try to get the game session with the given id from the Games container
  try {
    const { resource: game } = await container.item(gameId, gameId).read();

    // Check if the game session exists
    if (game) {
      // Get the stocks array and the current round from the game session
      const stocks = game.stocks;
      const currentRound = game.current_round;

      // Check if the current round is valid
      if (currentRound > 0 && currentRound < stocks.length) {
        // Get the prices array for the current round and the previous round from the stocks array
        const currentPrices = stocks[currentRound];
        const previousPrices = stocks[currentRound -1];

        // Initialize a variable to store the rate of change value
        let rateOfChangeValue;

        // Loop through each element in the prices array
        for (let i = 0; i < currentPrices.length; i++) {
          // Get the stock symbol, current price, and previous price from the corresponding elements in the prices array
          const currentSymbol = currentPrices[i].stock_symbol;
          const currentPrice = currentPrices[i].price;
          const previousPrice = previousPrices[i].price;

          // Check if the current symbol matches the requested symbol
          if (currentSymbol === symbol) {
            // Calculate the rate of change between the current price and the previous price in percent
            rateOfChangeValue = rateOfChange(previousPrice, currentPrice);

            // Break out of the loop
            break;
          }
        }

        // Check if the rate of change value is defined
        if (rateOfChangeValue !== undefined) {
          // Create an object with the stock symbol and the rate of change value
          const rateOfChangeObject = {
            symbol: symbol,
            rateOfChange: `${rateOfChangeValue.toFixed(2)}%`
          };

          // Send a 200 status code and the rate of change object as the response
          res.status(200).json(rateOfChangeObject);
        } else {
          // If the rate of change value is not defined, send a 404 status code and a message as the response
          res.status(404).json({ message: "Stock not found" });
        }
      } else {
        // If the current round is invalid, send a 400 status code and a message as the response
        res.status(400).json({ message: "Invalid round number" });
      }
    } else {
      // If the game session does not exist, send a 404 status code and a message as the response
      res.status(404).json({ message: "Game not found" });
    }
  } catch (error) {
    // If there is an error, send a 500 status code and the error message as the response
    res.status(500).json(error);
  }
});

createContainer();

// Define a function that takes a game object and a user object as parameters
function calculateStocksValue(game, user) {
  if (user.investments.length === 0) {
    // Return 0 as the total value
    return 0;
    }
  // Initialize a variable to store the total value of the owned stocks
  let totalValue = 0;
  // Loop through the user's investments array
  for (let investment of user.investments) {
    // Find the current price of the stock in the game's stocks array
    const stock = game.stocks[game.current_round].find(s => s.stock_symbol === investment.symbol);
    // Check if the stock exists
    if (stock) {
      // Multiply the number of shares by the current price and add it to the total value
      totalValue += investment.quantity * stock.price;
    }
  }
  // Update the user's stocksValue with the total value
 return totalValue.toFixed(2);
}



async function getRandomDays(symbol) {
  // Query the stocks container for the item with the given symbol as the partition key
  const querySpec = {
    query: "SELECT * FROM c WHERE c.Stock_Symbol = @symbol",
    parameters: [
      {
        name: "@symbol",
        value: symbol,
      },
    ],
  };
  const { resources: items } = await stocksContainer.items.query(querySpec).fetchAll();

  if (items.length === 0) {
    // Throw an error or return an empty array
    throw new Error(`No item found with symbol ${symbol}`);
  }
  // Assume there is only one item with the given symbol
  const item = items[0];
  // Get the array of stocks for that item
  const stocks = item.Stocks;
  // Pick a random index between 0 and 270
  const startIndex = Math.floor(Math.random() * (104))+94;
  // Return the 30 elements starting from that index
  return stocks.slice(startIndex, startIndex + 11);
}



// A function to create a new game session with a given id and an array of stock symbols
async function generatestocksforgame(symbols) {
  // Initialize an empty array of arrays of stocks
  let gameStocks = [];
  // For each symbol, get the random days and store them in a map with the symbol as the key
  let stockMap = new Map();
  for (let symbol of symbols) {
    let days = await getRandomDays(symbol);
    stockMap.set(symbol, days);
  }
  // For each day, create an array of stocks for each company and push it to the gameStocks array
  for (let i = 0; i < 11; i++) {
    let dayStocks = [];
    for (let symbol of symbols) {
      // Get the stock for the current day and company from the map
      let stock = stockMap.get(symbol)[i];
      dayStocks.push({stock_symbol:symbol,...stock});
    }
    gameStocks.push(dayStocks);
  }
  return gameStocks;
}

// Buy a stock for a user in a game session
app.post('/games/:id/buy', async (req, res) => {
  // Get the game id, user id, stock symbol, and quantity from the request body
  const gameId = req.params.id;
  const user_id = req.body.user_id;
  const symbol = req.body.Stock_Symbol;
  const quantity = req.body.quantity;
  // Get the current day of the game session
  const { resource:game } = await container.item(gameId, gameId).read();

  const currentRound=game.current_round;
  // Get the stock data for the given symbol and current day
  const stockData = await getStockData(game, symbol, currentRound);
    // Calculate the total cost of buying the stock
    const cost = stockData.price * quantity;
    // Find the user in the game session and check if they have enough balance
    const user = game.users.find(u => u.user_id === user_id);
    if (user && user.balance >= cost) {
      // Deduct the cost from the user's balance
      user.balance -= cost;
      // Add the stock to the user's portfolio or update the quantity if they already have it
      let portfolioItem = user.investments.find(p => p.symbol === symbol);
      if (portfolioItem) {
        portfolioItem.quantity += quantity;
      } else {
        let value=0;
        portfolioItem = { symbol, quantity ,value};
        user.investments.push(portfolioItem);
      }
      user.profit=await calculateProfit(user,game);
      user.stocksValue=  calculateStocksValue(game, user);
      // Update the game session with the modified user data
      const { resource: updatedGame } = await container.item(gameId, gameId).replace(game);
      // Send a 201 status code and a confirmation message as the response
      res.status(201).json(`You bought ${quantity} shares of ${symbol} for ${cost.toFixed(2)}`);
    } else {
     // If the user does not exist or does not have enough balance, send a 400 status code and an error message as the response
      res.status(400).json("You don't have enough money");
    }
});

// Sell a stock for a user in a game session
    app.post('/games/:id/sell', async (req, res) => {
  // Get the game id, user id, stock symbol, and quantity from the request body
  const gameId = req.params.id;
  const user_id = req.body.user_id;
  const symbol = req.body.Stock_Symbol;
  const quantity = req.body.quantity;
  // Get the current day of the game session
  const { resource:game }= await container.item(gameId, gameId).read();
  const currentRound = game.current_round;
  // Get the stock data for the given symbol and current day
  const stockData = await getStockData(game, symbol, currentRound );
  // Calculate the total profit of selling the stock
  const profit = stockData.price * quantity;
  // Find the user in the game session and check if they have enough stocks to sell
  const user = game.users.find(u => u.user_id === user_id);
  let portfolioItem = user.investments.find(p => p.symbol === symbol);
  if (user && portfolioItem && portfolioItem.quantity >= quantity) {
    // Add the profit to the user's balance
    user.balance += profit;
    // Remove the stock from the user's portfolio or update the quantity if they still have some left
    portfolioItem.quantity -= quantity;
    if (portfolioItem.quantity === 0) {
      user.investments = user.investments.filter(p => p.symbol !== symbol);
    }
    user.profit=await calculateProfit(user,game);
    user.stocksValue= calculateStocksValue(game, user);
    // Update the game session with the modified user data
    const { resource: updatedGame } = await container.item(gameId, gameId).replace(game);
    // Send a 201 status code and a confirmation message as the response
    res.status(201).json(`You sold ${quantity} shares of ${symbol} for $${profit.toFixed(2)}`);
  } else {
    // If the user does not exist or does not have enough stocks to sell, send a 400 status code and an error message as the response
    res.status(400).json("You don't own this amount of stocks");
  }
});

app.put('/games/:id/transactions', async (req, res) => {
  // Get the game id, user id, stock symbol, and quantity from the request body
  try{
  const gameId = req.params.id;
  const user_id = req.body.user_id;
  // Get the current day of the game session
  const { resource:game } = await container.item(gameId, gameId).read();
  const user = game.users.find(u => u.user_id === user_id);
  const transactions=user.transactions;
  res.status(200).json(transactions);
  } 
  catch (error) {
    // If there is an error, send a 500 status code and the error message as the response
    res.status(500).json(error);
  }
});

app.put('/games/:id/investments', async (req, res) => {
  // Get the game id, user id, stock symbol, and quantity from the request body
  try{
  const gameId = req.params.id;
  const user_id = req.body.user_id;
  // Get the current day of the game session
  const { resource:game } = await container.item(gameId, gameId).read();
  const user = game.users.find(u => u.user_id === user_id);
  const investments=user.investments;

  res.status(200).json(investments);
  } 
  catch (error) {
    // If there is an error, send a 500 status code and the error message as the response
    res.status(500).json(error);
  }
});

async function getStockData(game, symbol, currentRound) {
  // Get the array of arrays of stocks from the game object
  const gameStocks = game.stocks;
  // Check if the current day is within the range of the gameStocks array
  if (currentRound < 0 || currentRound > gameStocks.length) {
    // Throw an error or return null
    throw new Error(`Invalid current day ${currentRound}`);
  }
  // Get the array of stocks for the current day
  const dayStocks = gameStocks[currentRound];
  // Find the stock data for the given symbol in the dayStocks array
  const stockData = dayStocks.find(stock => stock.stock_symbol === symbol);
  // Check if the stock data exists
  if (!stockData) {
    throw new Error(`No stock data found for symbol ${symbol}`);
  }
  // Return the stock data
  return stockData;
}

// A function that calculates the profit of the user based on the investments array
async function calculateProfit(user, game) {
  // Get the investments, balance, and current day from the user object
  const investments = user.investments;
  const balance = user.balance;
  const currentRound = game.current_round;
  // Initialize the total value variable
  let totalValue = 0;
  // Loop through the investments array
  for (let investment of investments) {
    // Get the symbol, quantity, and value of the investment
    const symbol = investment.symbol;
    const quantity = investment.quantity;
    //let value = investment.value;
    // Get the current price of the stock
    const stockdata = await getStockData(game, symbol, currentRound);
    const currentPrice=stockdata.price;
    // Calculate the value based on the quantity and the current price
    let value = quantity * currentPrice;
    // Update the value property of the investment
    investment.value = value;
    // Update the total value variable
    totalValue += value;
  } 
  // Define the starting balance as a constant
  const startingBalance = 4000;
  // Calculate the profit as the difference between the total value plus balance and the starting balance
  const profit = (totalValue + balance) - startingBalance;
  // Return the profit variable
  return profit.toFixed(2);
}

// Define a function that sorts an array of users by their profit in descending order
function sortByProfit(users) {
  return users.slice().sort((a, b) => b.profit - a.profit);
}

// Define a route that returns the ranked users for a given game id
app.put('/games/:id/rank', async (req, res) => {
  // Get the game id from the request parameter
  const gameId = req.params.id;
  // Try to read the game from the container
  try {
    const { resource: game } = await container.item(gameId, gameId).read();
    // Sort the users by their profit
    const rankedUsers = sortByProfit(game.users);
    // Send a 200 status code and the ranked users array as the response
    res.status(200).json(rankedUsers);
  } catch (error) {
    // If there is an error, send a 500 status code and the error message as the response
    res.status(500).json(error);
  }
});



// Listen on port 3000
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});