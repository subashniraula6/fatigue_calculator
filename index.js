const BreachCalculator = require("./core")["BreachCalculator"];
//RuleSets
var ruleSets = require("./newRuleset")["rulesets"];
//DataSets
var dataSet = require("./EWD Test Data - Standard hours SOLO Driver Heavy Vehicle/24/001-24_00 Breach_Minor Rest (less than 6h45m).json");

let ewd = [];
let result = BreachCalculator(dataSet["ewd"], ruleSets, [], ewd);

// Print final result
console.log("RESULT", JSON.stringify(result));