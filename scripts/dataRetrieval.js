const { CosmosClient } = require('@azure/cosmos');
const fs = require('fs');
const path = require('path');

// Configure connection to Cosmos DB
const endpoint = 'https://stock-game.documents.azure.com:443/';
const key = '0pV793J6MsrYYQLNUF78agfG27tCnl4EwhrB1X1HNHDMhh3RUx3l70zqXXk6JhFsB4MYDPZMjW4xACDbBFF6dw==';

const client = new CosmosClient({ endpoint, key });

// Load and preprocess data from Cosmos DB for each company
async function loadAndPreprocessDataForCompany(companySymbol) {
  // Cosmos DB configuration
  const databaseId = 'db';
  const containerId = 'Stocks';

  const database = client.database(databaseId);
  const container = database.container(containerId);

  // Query or fetch documents from the container for the specific company
  const query = 'SELECT * FROM c WHERE c.Stock_Symbol = @symbol';
  const parameters = [
    { name: '@symbol', value: companySymbol }
  ];

  const { resources: companyData } = await container.items.query(query, parameters).fetchAll();

  // Preprocess data for the specific company as needed
  // ...

  // Save the preprocessed data to a JSON file
  const companyDataFilePath = path.join(__dirname, `${companySymbol}.json`);
  fs.writeFileSync(companyDataFilePath, JSON.stringify(companyData, null, 2));

  console.log(`Data for company ${companySymbol} saved to ${companyDataFilePath}`);
}

// Example usage: Load and preprocess data for a specific company (e.g., 'AAPL')
loadAndPreprocessDataForCompany('AAPL');

module.exports = { loadAndPreprocessDataForCompany };
