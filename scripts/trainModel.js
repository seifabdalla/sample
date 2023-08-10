const LogisticRegression = require('logistic-regression');
const fs = require('fs');
const math = require('mathjs');
const { loadAndPreprocessData } = require('./dataRetrieval'); // Adjust the path as needed

// Utility function for train-test split
function trainTestSplit(data, labels, testRatio) {
  const splitIndex = Math.floor(data.length * testRatio);
  const xTrain = data.slice(0, splitIndex);
  const xTest = data.slice(splitIndex);
  const yTrain = labels.slice(0, splitIndex);
  const yTest = labels.slice(splitIndex);
  return { xTrain, xTest, yTrain, yTest };
}

// Utility functions for evaluation metrics
function accuracyScore(trueLabels, predictedLabels) {
  let correctCount = 0;
  for (let i = 0; i < trueLabels.length; i++) {
    if (trueLabels[i] === predictedLabels[i]) {
      correctCount++;
    }
  }
  return correctCount / trueLabels.length;
}

function precisionScore(trueLabels, predictedLabels) {
  let truePositives = 0;
  let falsePositives = 0;

  for (let i = 0; i < trueLabels.length; i++) {
    if (trueLabels[i] === 1 && predictedLabels[i] === 1) {
      truePositives++;
    } else if (trueLabels[i] === 0 && predictedLabels[i] === 1) {
      falsePositives++;
    }
  }

  return truePositives / (truePositives + falsePositives);
}

function recallScore(trueLabels, predictedLabels) {
  let truePositives = 0;
  let falseNegatives = 0;

  for (let i = 0; i < trueLabels.length; i++) {
    if (trueLabels[i] === 1 && predictedLabels[i] === 1) {
      truePositives++;
    } else if (trueLabels[i] === 1 && predictedLabels[i] === 0) {
      falseNegatives++;
    }
  }

  return truePositives / (truePositives + falseNegatives);
}

function f1Score(trueLabels, predictedLabels) {
  const precision = precisionScore(trueLabels, predictedLabels);
  const recall = recallScore(trueLabels, predictedLabels);

  return (2 * precision * recall) / (precision + recall);
}
async function trainModel() {
  const { trainingData, trainingLabels } = await loadAndPreprocessData();

  // Split data into training and testing sets
  const { xTrain, xTest, yTrain, yTest } = trainTestSplit(trainingData, trainingLabels, 0.8);

  // Create and train the model
  const model = new LogisticRegression();
  model.fit(xTrain, yTrain);

  // Validate the model
  const yPred = model.predict(xTest);
  const accuracy = accuracyScore(yTest, yPred);
  const precision = precisionScore(yTest, yPred);
  const recall = recallScore(yTest, yPred);
  const f1 = f1Score(yTest, yPred);

  console.log(`Accuracy: ${accuracy}`);
  console.log(`Precision: ${precision}`);
  console.log(`Recall: ${recall}`);
  console.log(`F1-Score: ${f1}`);
}

// Run the training and evaluation process
trainModel().catch(error => {
  console.error('An error occurred:', error);
});

