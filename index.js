const BreachCalculator = require("./core")["BreachCalculator"];
//RuleSets
var ruleSets = require("./translated_ruleset.json")['rules'];

//DataSets
var dataSet = require("./TestDataset/test.json");

let ewd = [];
let result = BreachCalculator(dataSet["ewd"], ruleSets, [], ewd);

// Print final result
console.log("RESULT", JSON.stringify(result));