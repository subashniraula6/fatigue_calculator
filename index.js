const BreachCalculator = require("./core")["BreachCalculator"];
//RuleSets
var ruleSets = require("./translated_ruleset.json")['rules'];

//DataSets
var dataSet = require("./EWD Test Data - Standard hours SOLO Driver Heavy Vehicle/8/001-08_00 Breach_Minor Work (greater than 7h45m).json");

let ewd = [];
let result = BreachCalculator(dataSet["ewd"], ruleSets, [], ewd);

// Print final result
console.log("RESULT", JSON.stringify(result));