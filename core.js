var moment = require("moment");
const { BreachCalculation } = require("./BreachCalculation");
var { TimeCalculation } = require("./TimeCalculation");

function BreachCalculator(events, ruleSets, checklist = [], ewd = []) {
  function _handleEvent(event) {
    // process event
    var event = processEvent(event);

    console.log("NEW EVENT", event);
    console.log("=================================================");

    //Update checklist
    let updatedChecklist = _updateCurrentChecklist(event, checklist);

    // Calculate breach and others
    let breaches = _calculateBreach(updatedChecklist);
    updatedChecklist = _changeLastEvent(updatedChecklist, event);

    let removedChecklist = _findRemovedChecklist(updatedChecklist);
    updatedChecklist = _cleanupChecklist(updatedChecklist);

    checklist.length = 0;
    checklist.push(...updatedChecklist);

    // Add new checklist
    let newChecklist = _addChecklistItems(event, removedChecklist);
    checklist.push(...newChecklist);
    console.log("Checklist after addition", checklist);

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
      var restBreaches = breachCalculation._calculateRestBreach();

      if (maxWorkBreach !== null) breaches.push(maxWorkBreach);
      if (restBreaches.length > 0) breaches.push(...restBreaches);
    });
    return breaches;
  }

  function _changeLastEvent(checklist, event) {
    //CHANGING LAST EVENT INFO
    return checklist.filter((checklistItem) => {
      console.log("CHANGING LAST EVENT INFO TO " + event["eventType"]);
      if (checklistItem !== null) {
        checklistItem["lastEvent"] = event["eventType"];
        checklistItem["lastEventTime"] = toUtc(event["startTime"]);
      }
      return checklistItem;
    });
  }

  function _findRemovedChecklist(checklist) {
    return checklist.filter((updatedItem) => {
      return updatedItem.totalPeriod / 60 >= updatedItem.periodType;
    });
  }

  function _cleanupChecklist(checklist) {
    return checklist.filter((updatedItem) => {
      return updatedItem.totalPeriod / 60 < updatedItem.periodType;
    });
  }

  function __createChecklistItem(event, rule) {
    return {
      periodType: rule["period"] / 60,
      periodStart: toUtc(event["startTime"]),
      totalRest: 0,
      totalWork: 0,
      breaks: {
        continuousBreaks: [],
        nightBreaks: [],
        stationaryRest: [],
        consecutiveNightBreaks: 0,
      },
      totalPeriod: 0,
      maxMinutes: rule["work"].length
        ? rule["work"][0]["maximumWorkTime"] * 60
        : null,
      periodTime: toUtc(event["startTime"]).add({
        minutes: rule["period"],
      }),
      lastEvent: event["eventType"],
      lastEventTime: toUtc(event["startTime"]),
      breaches: [],
    };
  }

  function _addChecklistItems(event, removedChecklist = []) {
    let newChecklist = [];
    if (event["eventType"] === "work") {
      console.log("ADDING - CHECKLIST ITEMS");

      ruleSets.forEach((rule) => {
        let checklistItem = __createChecklistItem(event, rule);

        if (rule["period"] / 60 <= 11) {
          newChecklist.push(checklistItem);
        } else if (rule["period"] / 60 > 11) {
          if (!__checklistItemWithPeriodExists(checklistItem["periodType"])) {
            // Check if checklist removed is of this rule
            let removedChecklistItem = removedChecklist.find(
              (checklistItem) => checklistItem["periodType"] === rule["period"]
            );
            if (
              removedChecklistItem &&
              removedChecklistItem.breaches.length > 0
            ) {
              // If breache occured find successive event and create checklist of that event
              let successiveEvent = ___calculateSuccessiveEvent(checklistItem);
              checklistItem = __createChecklistItem(successiveEvent, rule);
            }
            newChecklist.push(checklistItem);
          }
        }
      });
    }
    return newChecklist;
  }

  function __checklistItemWithPeriodExists(period) {
    let existingChecklistIndex = checklist.findIndex((checklistItem) => {
      return checklistItem["periodType"] === period;
    });
    if (existingChecklistIndex === -1) return false;
    else return true;
  }

  function ___calculateSuccessiveEvent(checklistItem) {
    let eventList = Array.isArray(events) ? events : ewd;
    let sortedEventList = eventList.sort(function (left, right) {
      return moment.utc(left.startTime).diff(moment.utc(right.startTime));
    });
    let currentChecklistItemIndex = sortedEventList.findIndex((item) =>
      moment
        .utc(item["startTime"])
        .isSame(moment.utc(checklistItem["periodStart"]))
    );
    if (currentChecklistItemIndex === -1) {
      throw new Error("Cannot find successive event");
    }
    var successiveEvent = sortedEventList[currentChecklistItemIndex + 1];
    if (successiveEvent["eventType"].toLowerCase() === "rest") {
      successiveEvent = sortedEventList[currentChecklistItemIndex + 2];
    }
    return successiveEvent;
  }

  if (Array.isArray(events)) {
    let breachList = [];
    events.forEach((event) => {
      const { breaches } = _handleEvent(event);
      breachList.push(...breaches);
    });
    return { checklist, breaches: breachList };
  } else {
    // push to ewd
    ewd.push(...events);
    return _handleEvent(events);
  }
}

module.exports = { BreachCalculator };
