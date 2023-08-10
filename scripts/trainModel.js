const { CosmosClient } = require('@azure/cosmos');
const fs = require('fs');
const path = require('path');

// Configure connection to Cosmos DB
const endpoint = 'YOUR_COSMOS_DB_URI';
const key = 'YOUR_COSMOS_DB_ACCESS_KEY';

const client = new CosmosClient({ endpoint, key });

// Preprocessing logic for the specific company
function preprocessCompanyData(companyData) {
  // Preprocess data for the specific company
  const trainingData = companyData.map(item => {
    // Implement preprocessing logic to extract features from the item
    // and create the input data for the model
    // For simplicity, let's assume the input features are 'open', 'high', 'low', and 'close'
    return [item.open, item.high, item.low, item.close];
  });

  const trainingLabels = companyData.map(item => {
    // Implement logic to create labels (e.g., 0 for "hold", 1 for "buy", 2 for "sell")
    // based on the item's properties
    // For simplicity, let's assume the label is encoded as follows:
    // 'hold': 0, 'buy': 1, 'sell': 2
    if (item.decision === 'hold') return 0;
    else if (item.decision === 'buy') return 1;
    else if (item.decision === 'sell') return 2;
    else return -1; // Undefined label, handle this as needed
  });

  return { trainingData, trainingLabels };
}

// Load and preprocess data from Cosmos DB for each company
async function loadAndPreprocessDataForCompany(companySymbol) {
  // Cosmos DB configuration
  const databaseId = 'YourDatabaseId';
  const containerId = 'YourContainerId';

  const database = client.database(databaseId);
  const container = database.container(containerId);

  // Query or fetch documents from the container for the specific company
  const query = 'SELECT * FROM c WHERE c.Stock_Symbol = @symbol';
  const parameters = [
    { name: '@symbol', value: companySymbol }
  ];

  const { resources: companyData } = await container.items.query(query, parameters).fetchAll();

  // Preprocess data for the specific company
  const { trainingData, trainingLabels } = preprocessCompanyData(companyData);

  // Save the preprocessed data to a JSON file
  const companyDataFilePath = path.join(__dirname, `${companySymbol}.json`);
  fs.writeFileSync(companyDataFilePath, JSON.stringify({ trainingData, trainingLabels }, null, 2));

  console.log(`Data for company ${companySymbol} saved to ${companyDataFilePath}`);
}

// Example usage: Load and preprocess data for a specific company (e.g., 'AAPL')
loadAndPreprocessDataForCompany('AAPL');

module.exports = { loadAndPreprocessDataForCompany };
