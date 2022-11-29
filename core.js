var moment = require("moment");
const { BreachCalculation } = require("./BreachCalculation");
var { TimeCalculation } = require("./TimeCalculation");
var processEvent = require("./utility")['processEvent'];
var toUtc = require("./utility")['toUtc'];
var isPeriodExceeded = require('./utility')['isPeriodExceeded'];
var fetchRule = require('./utility')['fetchRule'];

function BreachCalculator(events, ruleSets, checklist = [], ewd = []) {
  function _handleEvent(event) {
    // process event
    var event = processEvent(event);

    console.log("NEW EVENT", event);
    console.log("=================================================");

    // Update checklist
    let updatedChecklist = _updateCurrentChecklist(event, checklist);

    // Calculate breach
    let breaches = _calculateBreach(updatedChecklist, ewd);

    // Add new checklist
    let newChecklist = _addChecklistItems(event, updatedChecklist);

    // Cleanup checklist
    updatedChecklist = _cleanupChecklist(updatedChecklist);

    // Change last event
    updatedChecklist = _changeLastEvent(updatedChecklist, event);

    console.log("Checklist at the end", [...updatedChecklist, ...newChecklist]);

    return { checklist: [...updatedChecklist, ...newChecklist], breaches };
  }

  function _updateCurrentChecklist(_event, checklist) {
    return checklist.map((checklistItem) => {
      return __updateChecklistItem(checklistItem, _event);
    });
  }

  // UPDATE CHECKLIST ITEM
  function __updateChecklistItem(checklistItem, event) {
    console.log(
      "-----------------------------------------------------------------------------------"
    );
    console.log("FOR CHECKLIST ITEM", checklistItem);
    console.log("+++++++++++++++++++++++++++++++++++++++++++");

    // Set new event info to checklist item
    checklistItem.event = event;

    // calculate total times
    var updatedItem = __calculateTime(checklistItem);
    console.log("UPDATED CHECKLIST ITEM", {
      ...updatedItem,
      breaks: JSON.stringify(updatedItem.breaks),
    });

    // Check Last Relevant Rest And update status
    if (event.eventType === "work") {
      updatedItem = __updateLastRelevantRest(updatedItem);
    }

    return updatedItem;
  }

  function __updateLastRelevantRest(checklistItem) {
    let { event } = checklistItem;
    let rule = fetchRule(checklistItem, ruleSets);
    // Check if last relevant break has occured
    if (rule["period"] / 60 >= 24) {
      let isContinuousBreakRequired =
        rule["rest"][0]["continuousBreak"] > 0 ? true : false;
      let isNightBreakRequired =
        rule["rest"][0]["nightBreaks"] > 0 ? true : false;
      let isContinuousBreakOccured = false;
      if (isContinuousBreakRequired) {
        isContinuousBreakOccured = ___checkLastRelevantContinuousBreak(
          checklistItem,
          rule
        );
        function ___checkLastRelevantContinuousBreak() {
          console.log("Checking last relevant continuous rest");
          let breakIndex = checklistItem["breaks"][
            "continuousBreaks"
          ].findIndex((contdbrk) => {
            let isExists = false;
            contdbrk["endTimes"].forEach((item) => {
              if (
                item.isSame(event["startTime"]) &&
                contdbrk["continuousMinutes"] >=
                  rule["rest"][0]["continuousBreak"]
              ) {
                isExists = true;
              }
            });
            return isExists;
          });
          if (breakIndex !== -1) {
            console.log(
              "RELEVANT CONTINUOUS REST OCCURED FOR PERIOD " +
                checklistItem["periodType"] +
                " and start time " +
                checklistItem["periodStart"].format("YYYY-MM-DD HH:mm")
            );
            return true;
          } else return false;
        }
      }

      let isNightBreakOccured = false;
      if (isNightBreakRequired) {
        isNightBreakOccured = ___checkLastRelevantNightBreak(
          checklistItem,
          rule
        );
        function ___checkLastRelevantNightBreak(checklist, rule) {
          console.log("Checking last relevant night rest");
          let breakIndex = checklistItem["breaks"]["nightBreaks"].findIndex(
            (nightBrk) => {
              let isExists = false;
              nightBrk["endTimes"].forEach((item) => {
                let requiredNightBreak = 7 * 60;
                if (
                  item.isBetween(
                    checklistItem["lastEventTime"],
                    event["startTime"],
                    null,
                    []
                  ) &&
                  nightBrk["continuousMinutes"] >= requiredNightBreak
                ) {
                  isExists = true;
                }
              });
              return isExists;
            }
          );
          if (breakIndex !== -1) {
            console.log(
              "RELEVANT NIGHT REST OCCURED FOR PERIOD " +
                checklistItem["periodType"] +
                " and start time " +
                checklistItem["periodStart"].format("YYYY-MM-DD HH:mm")
            );
            return true;
          } else return false;
        }
      }

      if (isContinuousBreakOccured || isNightBreakOccured) {
        checklistItem.lastRelevantBreak = true;
        checklistItem.lastRelevantBreakAtThisEvent = true;
      } else {
        // Prevent duplication of creating checklist further
        checklistItem.lastRelevantBreakAtThisEvent = false;
      }
    }
    return checklistItem;
  }

  function __calculateTime(checklistItem, event) {
    console.log("CALCULATING TIMES...");
    let updatedChecklistItem;

    const timeCalculation = new TimeCalculation(checklistItem, event);
    updatedChecklistItem = timeCalculation._calculateTotalPeriod();
    updatedChecklistItem = timeCalculation._calculateWorkTime();
    updatedChecklistItem = timeCalculation._calculateRestTime();

    return updatedChecklistItem;
  }

  function _calculateBreach(checklist, ewd) {
    let breachList = []; 
    checklist.forEach((checklistItem) => {
      const breachCalculation = new BreachCalculation(
        checklistItem,
        ruleSets,
        ewd
      );

      let breaches = [];
      // 1. MAXIMUM WORK BREACH
      var maxWorkBreaches = breachCalculation._calculateMaxWorkBreach();
      breaches.push(...maxWorkBreaches);

      // 2. REST BREAKS BREACH
      var restBreaches = breachCalculation._calculateRestBreach();
      breaches.push(...restBreaches);

      if(breaches.length > 0){
        breaches.forEach(breach => {
          __pushOrReplace(checklistItem, breach)
        });
        // checklistItem.breaches.push(...breaches);    
        breachList.push(checklistItem);
      }
    });
    return breachList;
  }

  function __pushOrReplace(checklistItem, breach) {
    let idx = checklistItem.breaches.findIndex(
      (item) => item["type"] === breach["type"]
    );
    if (idx === -1) {
      checklistItem["breaches"].push(breach);
    } else {
      checklistItem["breaches"][idx] = breach;
    }
  }

  function _changeLastEvent(checklist, event) {
    //CHANGING LAST EVENT INFO
    return checklist.map((checklistItem) => {
      return _changeLastEventForChecklistItem(checklistItem, event);
    });
  }

  function _changeLastEventForChecklistItem(checklistItem, event) {
    console.log("CHANGING LAST EVENT INFO TO " + event["eventType"]);
    return {
      ...checklistItem,
      lastEvent: event["eventType"],
      lastEventTime: event["startTime"],
    };
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
      totalWork: 0,
      totalRest: 0,
      totalPeriod: 0,
      breaks: {
        continuousBreaks: [],
        nightBreaks: [],
        stationaryRest: [],
        consecutiveNightBreaks: 0,
      },
      maxMinutes: rule["work"][0]["maximumWorkTime"] * 60,
      periodTime: toUtc(event["startTime"]).add({
        minutes: rule["period"],
      }),
      lastEvent: event["eventType"],
      lastEventTime: toUtc(event["startTime"]),
      breaches: [],
      lastRelevantBreak: false,
      lastRelevantBreakAtThisEvent: false
    };
  }

  function __addIfNoRelevantRestBreak(updatedChecklist, newEvent) {
    let newChecklist = [];
    updatedChecklist.forEach((checklistItem) => {
      let rule = fetchRule(checklistItem, ruleSets);
      if (
        rule["period"] / 60 >= 24 &&
        isPeriodExceeded(checklistItem) &&
        checklistItem["lastRelevantBreak"] === false
      ) {
        // No last relevant rest so backtrace to next work event and calculate time upto this event
        let nextEvent = ___calculateSuccessiveEvent(checklistItem, events);
        if(nextEvent){
          let { successiveEvent, eventsAfter } = nextEvent;
          eventsAfter = eventsAfter.filter(event => event.startTime.isSameOrBefore(newEvent.startTime));
          // calculate times upto this event
          let newChecklistItem = __createChecklistItem(successiveEvent, rule);
          eventsAfter.forEach((event) => {
            let updatedChecklistItem = __updateChecklistItem(
              newChecklistItem,
              event
            );
            updatedChecklistItem = _changeLastEventForChecklistItem(
              updatedChecklistItem,
              event
            );
            newChecklistItem = updatedChecklistItem;
          });
          newChecklist.push(newChecklistItem);
        }
      }
    });
    return newChecklist;
  }

  function _addChecklistItems(event, updatedChecklist) {
    let newChecklist = [];
    let noRelevantChecklists = __addIfNoRelevantRestBreak(updatedChecklist, event);
    noRelevantChecklists.length > 0 &&
      console.log(
        "CHECKLIST ADDED after 'No Relevant break' => ",
        noRelevantChecklists
      );
    newChecklist.push(...noRelevantChecklists);

    if (event["eventType"] === "work") {
      console.log("ADDING - CHECKLIST ITEMS");

      ruleSets.forEach((rule) => {
        let checklistItem = __createChecklistItem(event, rule);
        if (rule["period"] / 60 < 24) {
          newChecklist.push(checklistItem);
        } else if (rule["period"] / 60 >= 24) {
          // intitial add
          if (!__checklistItemWithPeriodExists(checklistItem["periodType"])) {
            newChecklist.push(checklistItem);
          } else {
            let ruleEquivalentChecklistItem = updatedChecklist.find((item) => item["periodType"] === rule["period"] / 60);
            if(ruleEquivalentChecklistItem && ruleEquivalentChecklistItem.lastRelevantBreakAtThisEvent){
              console.log(
                      "ADDING CHECKLIST ITEM AFTER RELEVANT MAX BREAK WITH PERIOD => " +
                        checklistItem["periodType"]
                    );
              let newChecklistItem = __createChecklistItem(event, rule);
              newChecklist.push(newChecklistItem);
            }
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

  function ___calculateSuccessiveEvent(checklistItem, events) {
    console.log("Calculate successive work event");
    let eventList = Array.isArray(events) ? events : ewd;
    eventList = eventList.map((event) => processEvent(event));

    let sortedEventList = eventList.sort(function (left, right) {
      return left.startTime.diff(right.startTime);
    });

    // Option 1 => Find consecutive event
    // let currentChecklistItemIndex = sortedEventList.findIndex((item) =>
    //   item["startTime"].isSame(checklistItem["periodStart"])
    // );
    // if (currentChecklistItemIndex === -1) {
    //   throw new Error("Cannot find successive event");
    // }
    // var successiveEvent = sortedEventList[currentChecklistItemIndex + 1];
    // if (successiveEvent["eventType"].toLowerCase() === "rest") {
    //   successiveEvent = sortedEventList[currentChecklistItemIndex + 2];
    // }

    // Option 2 => Find next day start event
    let nextDayWorkEvent = sortedEventList.find(item => {
      let nextDay = checklistItem["periodStart"].clone().add(1, 'days');
      return item['startTime'].isBetween(nextDay.clone().startOf('day'), nextDay.clone().endOf('day'), null, []) &&
      item['eventType'] === 'work';
    });
    if(!nextDayWorkEvent) return null;
    var successiveEvent = nextDayWorkEvent;

    let eventsAfter = sortedEventList.filter((sortedEvent) =>
      moment(sortedEvent["startTime"]).isAfter(
        successiveEvent["startTime"]
      )
    );
    return { successiveEvent, eventsAfter };
  }

  if (Array.isArray(events)) {
    let breachList = [];
    events.forEach((event) => {
      // push to ewd
      ewd.push(event);
      const { breaches, checklist: updatedChecklist } = _handleEvent(event);

      // change checklist to updatedChecklist
      checklist.length = 0;
      checklist.push(...updatedChecklist);

      breachList.push(...breaches);
      // Remove reduntant breaches
      let toRemoveIndices = [];
      for (let i = 0; i < breachList.length - 1; i++) {
        for (let j = i; j < breachList.length; j++) {
          if (i != j &&
            breachList[i]["periodStart"].isSame(breachList[j]["periodStart"]) &&
            breachList[i]["periodType"] === breachList[j]["periodType"]
          ) {
            let earlyBreachIndex = breachList[i]["totalPeriod"] > breachList[j]["totalPeriod"] ? 
            j : i;
            toRemoveIndices.push(earlyBreachIndex);
            // //remove early same type breach
            // breachList.splice(earlyBreachIndex, 1);
          }
        }
      }
      toRemoveIndices.forEach(index => {
        breachList.splice(index, 1);
      });
    });
    return { checklist, breaches: breachList };
  } else {
    // push to ewd
    ewd.push(events);
    return _handleEvent(events);
  }
}

module.exports = { BreachCalculator };
