const { duration } = require("moment");
var moment = require("moment");
const { BreachCalculation } = require("./BreachCalculation");
//RuleSets
var ruleSets = require("./ruleSets")["ruleSets"];
var TimeCalculation = require("./TimeCalculation")["TimeCalculation"];

function toUtc(datetime) {
  let offset = datetime.toString().slice(16);
  var utcDateTime = new moment.utc(datetime).utcOffset(offset);
  return utcDateTime;
}

// Pre-processing dataset
// Convert to utc datetime
function processEvent(event) {
  return {
    ...event,
    eventType: event.eventType.toLowerCase(),
    startTime: toUtc(event.startTime),
  };
}

// UPDATE CHECKLIST ITEM
function __updateChecklistItem(checklistItem, event, state) {
  console.log("FOR CHECKLIST ITEM", checklistItem);
  console.log("+++++++++++++++++++++++++++++++++++++++++++");

  // calculate total times
  var updatedItem = __calculateTime(checklistItem, event);
  console.log("UPDATED CHECKLIST ITEM", {
    ...updatedItem,
    breaks: JSON.stringify(updatedItem.breaks),
  });

  function __calculateTime(checklistItem, event) {
    console.log("CALCULATING TIMES...");
    let updatedChecklistItem;

    const timeCalculation = new TimeCalculation(checklistItem, event);
    updatedChecklistItem = timeCalculation._calculateTotalPeriod();
    updatedChecklistItem = timeCalculation._calculateWorkTime();
    updatedChecklistItem = timeCalculation._calculateRestTime();

    return updatedChecklistItem;
  }

  // updatedItem = __calculateBreach(updatedItem, ruleSets);
  // function __calculateBreach(checklistItem, ruleSets) {
  //   console.log("BREACH CALCULATION");

  //   const breachCalculation = new BreachCalculation(checklistItem, ruleSets);

  //   // 1. MAXIMUM WORK BREACH
  //   var updatedChecklistItem = breachCalculation._calculateMaxWorkBreach();

  //   console.log(".........................................................");
  //   console.log("SELECTED BREACH");
  //   console.log(updatedChecklistItem["breaches"]);

  //   // 2. REST BREAKS BREACH
  //   var updatedChecklistItem = breachCalculation._calculateRestBreach(
  //     ruleSets,
  //     updatedChecklistItem
  //   );
  //   console.log("AFTER REST BREACH", updatedChecklistItem);

  //   return updatedChecklistItem;
  // }

  

  // Update before cleanup
  console.log("UPDATING STATE");
  console.log(JSON.stringify(updatedItem));
  updateState(updatedItem, state);
  function updateState(updatedItem, state) {
    // Max work breaches
    if (updatedItem.breaches.length > 0) {
      updatedItem.breaches.forEach((breach) => {
        if (breach["severity"] === "noBreach") {
          state.noBreaches.push(updatedItem);
        } else if (breach["type"] === "maxWorkBreach") {
          state.maxWorkBreaches.push(updatedItem);
        } else {
          console.log("I am here");
          state.restBreaches.push(updatedItem);
        }
      });
    }
  }
  // CLEANUP CHECKLIST ITEM
  var updatedItem = __cleanupChecklistItem(updatedItem);
  console.log("AFTER CLEANUP: ", updatedItem);
  console.log(
    "Note: -->> 'UPDATED_CHECKLIST_ITEM' => null means item is removed from checklist"
  );

  function __cleanupChecklistItem(updatedItem) {
    console.log(".........................................................");
    console.log("CLEANUP CHECKLIST.....");

    if (updatedItem.totalPeriod / 60 >= updatedItem.periodType) {
      updatedItem = null;
    } // OR updatedItem['breach'] != null
    return updatedItem;
  }

  //CHANGING LAST EVENT INFO
  console.log("CHANGING LAST EVENT INFO");
  var updatedItem = changeLastEventInfo(updatedItem, event);
  function changeLastEventInfo(updatedItem, event) {
    if (updatedItem !== null) {
      updatedItem["lastEvent"] = event["eventType"];
      updatedItem["lastEventTime"] = toUtc(event["startTime"]);
    }
    return updatedItem;
  }
  return updatedItem;
}

function _addChecklistItems(checklist, ruleSets, event) {
  if (event["eventType"] === "work") {
    console.log("ADDING - CHECKLIST ITEMS");
    var ruleSetName = ruleSets[0]["rulesetName"];
    var rules = ruleSets[0]["rules"];

    rules.forEach((rule) => {
      var periodTime = toUtc(event["startTime"]).add({
        minutes: rule["period"],
      });

      checklist.push({
        periodType: rule["period"] / 60,
        periodStart: toUtc(event["startTime"]),
        ruleSets: ruleSetName,
        totalRest: 0,
        totalWork: 0,
        breaks: {
          continuousBreaks: [],
          nightBreaks: [],
          stationaryRest: [],
          consecutiveNightBreaks: 0,
        },
        totalPeriod: 0,
        maxMinutes: rule["maximumWork"],
        periodTime: periodTime,
        lastEvent: event["eventType"],
        lastEventTime: toUtc(event["startTime"]),
        breaches: [],
      });
    });
  }
}

function BreachCalculator(state, events, ruleSets) {
  function _handleEvent(event) {
    let { dataSet, checklist } = state;
    //push event to dataset
    dataSet.push(event);

    // process event
    var event = processEvent(event);

    console.log("NEW EVENT", event);
    console.log("=================================================");

    function _updateCurrentChecklist(_event, checklist) {
      return checklist.map((checklistItem) => {
        return __updateChecklistItem(checklistItem, _event, state);
      });
    }

    //Update checklist
    checklist = _updateCurrentChecklist(event, checklist);


    // //Update checklist
    // checklist.forEach((checklistItem, index, checklist) => {
    //   let updatedChecklistItem = __updateChecklistItem(
    //     checklistItem,
    //     event,
    //     state
    //   );
    //   console.log(updatedChecklistItem);
    //   checklist[index] = updatedChecklistItem;
    // });
    console.log("checklist", checklist);

    // Add new checklist
    _addChecklistItems(checklist, ruleSets, event);
    // Filter null checklist
    state.checklist = checklist.filter(
      (checklistItem) => checklistItem !== null
    );
    console.log(".........................................................");
    console.log("BREACH CHECKLIST AFTER FILTERING");
    console.log(checklist);
    console.log(".........................................................");
  }

  if (Array.isArray(events)) {
    events.forEach((event) => {
      _handleEvent(event);
    });
  } else {
    _handleEvent(events);
  }
}

module.exports = { BreachCalculator };
