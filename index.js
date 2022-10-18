const BreachCalculator = require("./core")["BreachCalculator"];
//RuleSets
var ruleSets = require("./translated_ruleset.json")['rules'];

//DataSets
var dataSet = require("./EWD Test Data - Standard hours SOLO Driver Heavy Vehicle/14days/001-14days Breach_Compliant.json");

let ewd = [];
let result = BreachCalculator(dataSet["ewd"], ruleSets, [], ewd);

// Print final result
console.log("RESULT", JSON.stringify(result));