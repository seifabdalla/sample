// Require the express module
const express = require('express');

// Create an express app object
const app = express();

// Define a GET handler for the / route
app.get('/', (req, res) => {
  // Send the sample text as the response
  res.send('Hello, this is a simple server in node.js using express');
});

// Listen on port 3000
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
