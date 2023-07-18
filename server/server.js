// Require the express module
const express = require('express');

// Create an express app object
const app = express();

let games=[]
// Define a GET handler for the / route
app.get('/games', (req, res) => {
  // Send the sample text as the response
  res.status(200).json(games);
});
const { v4: uuidv4 } = require('uuid');

app.post('/games', (req,res)=> {
  let uuid = uuidv4();
  const game= {
    id:uuid
  };
  games.push(game);
  res.status(201).json(games);
  
  
})

// Define a DELETE handler for the /games/:id route
app.delete("/games/:id", (req, res) => {
  const id  = req.params.id;
  const index = games.findIndex((g) => g.id === id);
  if (index !== -1) {
    const deletedGame = games.splice(index, 1);
    res.status(200).json(games);
  }
  else {
    res.status(404).json({ message: 'Game not found' });
  }
});

// Listen on port 3000
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
