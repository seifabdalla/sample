

// Require the express module
const express = require('express');

// Create an express app object
const app = express();

// Use express.json middleware to parse JSON request bodies
app.use(express.json());

const { CosmosClient } = require('@azure/cosmos');

const config = require('../config')
const endpoint = config.endpoint
const key = config.key
const client = new CosmosClient({ endpoint, key });


const databaseId = 'db';
const containerId = 'Games';
const container = client.database(databaseId).container(containerId);
const partitionKey = { kind: 'Hash', paths: ['/id'] }

const { v4: uuidv4 } = require('uuid');

app.post('/games', async (req, res) => {
  // Create a new game object with an id and an empty array of users
  let uuid = uuidv4();
  const newGame = {
    id: uuid,
    current_day:1,
    users: []
  };
  // Try to insert the new game into the container
  try {
    const { resource } = await container.items.create(newGame);
    // Send a 201 status code and the created game as the response
    res.status(201).json(resource);
  } catch (error) {
    // If there is an error, send a 500 status code and the error message as the response
    res.status(500).json(error);
  }
});


app.get('/games', async (req, res) => {
  // Try to query all the games from the container
  try {
    const { resources } = await container.items.query('SELECT * FROM c').fetchAll();
    // Send a 200 status code and the games array as the response
    res.status(200).json(resources);
  } catch (error) {
    // If there is an error, send a 500 status code and the error message as the response
    res.status(500).json(error);
  }
});


app.delete("/games/:id", async (req, res) => {
  const id  = req.params.id;
  // Try to delete the game with the given id from the container
  try {
    const { resource } = await container.item(id).delete();
    // Send a 200 status code and the deleted game as the response
    res.status(200).json(resource);
  } catch (error) {
    // If there is an error, send a 500 status code and the error message as the response
    res.status(500).json(error);
  }
});

app.post('/games/:id/newplayer', async (req,res)=> {
  const id = req.params.id;
  // Create a new user object with an id and a balance of 50
  let uuid = uuidv4();
  const user= {
    user_id:uuid,
    balance: 500
  };
  
  // Try to update the game with the given id by adding the user to its users array
  try {
    const { resource } = await container.item(id, id).read();
    console.log(resource)
    resource.users.push(user);
    const { resource: updatedResource } = await container.item(id, id).replace(resource);
    // Send a 201 status code and the updated game as the response
    res.status(201).json({userId: uuid}); 
  } catch (error) {
    // If there is an error, send a 500 status code and the error message as the response
    res.status(500).json(error);
  }
  
})

async function createContainer() {
  const { container } = await client
    .database(databaseId)
    .containers.createIfNotExists(
      { id: containerId, partitionKey },
      { offerThroughput: 400 }
    )
  console.log(`Created container:\n${config.container.id}\n`)
}

createContainer();


// Listen on port 3000
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});