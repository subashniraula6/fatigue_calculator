const BreachCalculator = require("./core")["BreachCalculator"];
//RuleSets
var ruleSets = require("./newRuleset")["rulesets"];
//DataSets
var dataSet = require("./EWD Test Data - Standard hours SOLO Driver Heavy Vehicle/11/001-11_00 Breach_None (EWD 8 mins provision).json");

let ewd = [];
let result = BreachCalculator(dataSet["ewd"], ruleSets, [], ewd);

// Print final result
console.log("RESULT", JSON.stringify(result));
