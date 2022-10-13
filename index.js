const BreachCalculator = require("./core")["BreachCalculator"];
//RuleSets
var ruleSets = require("./newRuleset")["rulesets"];
//DataSets
var dataSet = require("./EWD Test Data - Standard hours SOLO Driver Heavy Vehicle/7days/001-7days Breach_Substantial Rest (less than 23h15m).json");

let ewd = [];
let result = BreachCalculator(dataSet["ewd"], ruleSets, [], ewd);

// Print final result
console.log("RESULT", JSON.stringify(result));