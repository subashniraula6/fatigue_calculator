const BreachCalculator = require("./core")["BreachCalculator"];
//RuleSets
var ruleSets = require("./translated_ruleset.json")['rules'];

//DataSets
var dataSet = require("./EWD Test Data - Standard hours SOLO Driver Heavy Vehicle/14days/001-14days Breach_Substantial Rest (night rest).json");

let ewd = [];
let result = BreachCalculator(dataSet["ewd"], ruleSets, [], ewd);
result = {...result, breaches: result.breaches.map(breach => ({...breach, periodStart: breach.periodStart.format("YYYY-MM-DD HH:mm")}))}
// Print final result
console.log("RESULT", JSON.stringify(result));