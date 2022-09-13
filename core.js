var moment = require("moment");
const { BreachCalculation } = require("./BreachCalculation");
var { TimeCalculation } = require("./TimeCalculation");

function BreachCalculator(events, ruleSets, checklist = []) {
  function _handleEvent(event) {
    // process event
    var event = processEvent(event);

    console.log("NEW EVENT", event);
    console.log("=================================================");

    //Update checklist
    let updatedChecklist = _updateCurrentChecklist(event, checklist);

    // Calculate breach and others
    let breaches = _calculateBreach(updatedChecklist);
    updatedChecklist = _changeLastEvent(checklist, event);
    checklist = _cleanupChecklist(updatedChecklist);

    console.log("checklist", checklist);

    // Add new checklist
    let newChecklist = _addChecklistItems(ruleSets, event);
    checklist.push(...newChecklist);
    return { checklist: { ...updatedChecklist, ...newChecklist }, breaches };
  }

  // Convert to utc datetime
  function toUtc(datetime) {
    let offset = datetime.toString().slice(16);
    var utcDateTime = new moment.utc(datetime).utcOffset(offset);
    return utcDateTime;
  }

  // Pre-processing dataset
  function processEvent(event) {
    return {
      ...event,
      eventType: event.eventType.toLowerCase(),
      startTime: toUtc(event.startTime),
    };
  }

  function _updateCurrentChecklist(_event, checklist) {
    return checklist.map((checklistItem) => {
      return __updateChecklistItem(checklistItem, _event);
    });
  }

  // UPDATE CHECKLIST ITEM
  function __updateChecklistItem(checklistItem, event) {
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
    return updatedItem;
  }

  function _calculateBreach(checklist) {
    let breaches = [];
    checklist.forEach((checklistItem) => {
      const breachCalculation = new BreachCalculation(checklistItem, ruleSets);

      // 1. MAXIMUM WORK BREACH
      var maxWorkBreach = breachCalculation._calculateMaxWorkBreach();

      // 2. REST BREAKS BREACH
      var restBreach = breachCalculation._calculateRestBreach();

      if (maxWorkBreach !== null) breaches.push(maxWorkBreach);
      if (restBreach !== null) breaches.push(restBreach);
    });
    return breaches;
  }

  function _changeLastEvent(checklist, event) {
    //CHANGING LAST EVENT INFO
    return checklist.filter((checklistItem) => {
      console.log("CHANGING LAST EVENT INFO");
      if (checklistItem !== null) {
        checklistItem["lastEvent"] = event["eventType"];
        checklistItem["lastEventTime"] = toUtc(event["startTime"]);
      }
      return checklistItem;
    });
  }

  function _cleanupChecklist(checklist) {
    return checklist.filter((updatedItem) => {
      return updatedItem.totalPeriod / 60 < updatedItem.periodType;
    });
  }

  function _addChecklistItems(ruleSets, event) {
    let newChecklist = [];
    if (event["eventType"] === "work") {
      console.log("ADDING - CHECKLIST ITEMS");
      var ruleSetName = ruleSets[0]["rulesetName"];
      var rules = ruleSets[0]["rules"];

      rules.forEach((rule) => {
        var periodTime = toUtc(event["startTime"]).add({
          minutes: rule["period"],
        });

        newChecklist.push({
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
        });
      });
    }
    return newChecklist;
  }

  if (Array.isArray(events)) {
    let breachList = [];
    events.forEach((event) => {
      const { breaches } = _handleEvent(event);
      breachList.push(...breaches);
    });
    return { checklist, breaches: breachList };
  } else {
    return _handleEvent(events);
  }
}

module.exports = { BreachCalculator };
