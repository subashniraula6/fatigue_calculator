const testBreaches = require("./core")["testBreaches"];
//RuleSets
var ruleSets = require("./ruleSets")["ruleSets"];
//DataSets
var dataSet = require("./EWD Test Data - Standard hours SOLO Driver Heavy Vehicle/24/001-24_00 Breach_Minor Rest (less than 6h45m).json");

// SYSTEM STATE
let STATE = {
  dataSet: [],
  breachChecklist: [],
  maxWorkBreaches: [],
  restBreaches: [],
  noBreaches: [],
  potentalBreaches: [],
};

testBreaches(STATE, dataSet["ewd"], ruleSets);

// Print final state
console.log("FINAL STATE", JSON.stringify(STATE));
