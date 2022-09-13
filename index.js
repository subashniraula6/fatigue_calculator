const BreachCalculator = require("./core")["BreachCalculator"];
//RuleSets
var ruleSets = require("./ruleSets")["ruleSets"];
//DataSets
var dataSet = require("./EWD Test Data - Standard hours SOLO Driver Heavy Vehicle/24/001-24_00 Breach_Critical Work (greater than 13h30m).json");

let result = BreachCalculator(dataSet["ewd"], ruleSets);

// Print final result
console.log("RESULT", JSON.stringify(result));
