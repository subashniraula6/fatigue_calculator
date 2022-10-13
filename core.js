var moment = require("moment");
const { BreachCalculation } = require("./BreachCalculation");
var { TimeCalculation } = require("./TimeCalculation");

function BreachCalculator(events, ruleSets, checklist = [], ewd = []) {
  function _handleEvent(event) {
    // process event
    var event = processEvent(event);

    console.log("NEW EVENT", event);
    console.log("=================================================");

    // Update checklist
    let updatedChecklist = _updateCurrentChecklist(event, checklist);

    // Calculate breach
    let breaches = _calculateBreach(updatedChecklist);

    // Add new checklist
    let newChecklist = _addChecklistItems(event, updatedChecklist);

    // Cleanup checklist
    updatedChecklist = _cleanupChecklist(updatedChecklist);

    // Change last event
    updatedChecklist = _changeLastEvent(updatedChecklist, event);

    console.log("Checklist at the end", [
      ...updatedChecklist,
      ...newChecklist,
    ]);

    return { checklist: [...updatedChecklist, ...newChecklist], breaches };
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
    console.log(
      "-----------------------------------------------------------------------------------"
    );
    console.log("FOR CHECKLIST ITEM", checklistItem);
    console.log("+++++++++++++++++++++++++++++++++++++++++++");

    // calculate total times
    var updatedItem = __calculateTime(checklistItem, event);
    console.log("UPDATED CHECKLIST ITEM", {
      ...updatedItem,
      breaks: JSON.stringify(updatedItem.breaks),
    });

    // Check Last Relevant Rest And update status
    if ((event.eventType === "work")) {
      updatedItem = __updateLastRelevantRest(updatedItem, event);
    }

    return updatedItem;
  }

  function __updateLastRelevantRest(checklistItem, event) {
    let rule = _fetchRule(checklistItem);
    // Check if last relevant break has occured
    if (rule["period"] / 60 >= 24) {
      let isContinuousBreakRequired = rule["rest"][0]["continuousBreak"]
        ? true
        : false;
      let isNightBreakRequired = rule["rest"][0]["nightBreaks"] ? true : false;

      let isContinuousBreakOccured = false;
      if (isContinuousBreakRequired) {
        isContinuousBreakOccured = ___checkLastRelevantContinuousBreak(
          checklistItem,
          rule
        );
        function ___checkLastRelevantContinuousBreak(checklistItem, rule) {
          console.log("Checking last relevant continuous rest");
          let breakIndex = checklistItem["breaks"][
            "continuousBreaks"
          ].findIndex((contdbrk) => {
            let isExists = false;
            contdbrk["endTimes"].forEach((item) => {
              if (
                item.isSame(event["startTime"]) &&
                contdbrk["continuousMinutes"] >=
                  rule["rest"][0]["continuousBreak"] * 60
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
      } else {
        // Prevent duplication of creating checklist further
        checklistItem.lastRelevantBreak = false;
      }
    }
    return checklistItem;
  }

  function _fetchRule(checklistItem) {
    return ruleSets.find(
      (rule) => rule["period"] / 60 === checklistItem["periodType"]
    );
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
    return checklist.map((checklistItem) => {
      return _changeLastEventForChecklistItem(checklistItem, event);
    });
  }

  function _changeLastEventForChecklistItem(checklistItem, event) {
    console.log("CHANGING LAST EVENT INFO TO " + event["eventType"]);
    return {
      ...checklistItem,
      lastEvent: event["eventType"],
      lastEventTime: toUtc(event["startTime"]),
    };
  }

  function _cleanupChecklist(checklist) {
    return checklist.filter((updatedItem) => {
      return updatedItem.totalPeriod / 60 < updatedItem.periodType;
    });
  }

  function __createChecklistItem(event, rule) {
    let minimumRestTime = null;
    if (rule["rest"].length > 0) {
      let rests = rule["rest"];
      if (rests.length > 0) {
        let sortedRests = rests[0]["breaches"].sort(
          (left, right) => left.from - right.from
        );
        minimumRestTime = sortedRests[0]["to"];
      }
    }

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
      maxMinutesTime: toUtc(event["startTime"]).add({
        minutes: rule["work"][0]["maximumWorkTime"] * 60,
      }),
      restTime: minimumRestTime
        ? toUtc(event["startTime"]).add({
            minutes: minimumRestTime,
          })
        : null,
      periodTime: toUtc(event["startTime"]).add({
        minutes: rule["period"],
      }),
      lastEvent: event["eventType"],
      lastEventTime: toUtc(event["startTime"]),
      breaches: [],
      lastRelevantBreak: false,
    };
  }

  function __addIfNoRelevantRestBreak(updatedChecklist, event) {
    let newChecklist = [];
    ruleSets.forEach((rule) => {
      if (rule["period"] / 60 > 11) {
        // Check if checklistItem completed is of this rule
        let completedChecklist = updatedChecklist.filter((updatedItem) => {
          return (
            updatedItem.totalPeriod / 60 >= updatedItem.periodType &&
            updatedItem.periodType === rule["period"] / 60
          );
        });
        completedChecklist.forEach((completedChecklistItem) => {
          if (completedChecklistItem["lastRelevantBreak"] === false) {
            // No last relevant rest so backtrace to next work event and calculate time upto this event
            let { successiveEvent, eventsAfter } = ___calculateSuccessiveEvent(
              completedChecklistItem,
              event
            );
            // calculate times upto this event
            let checklistItem = __createChecklistItem(successiveEvent, rule);
            eventsAfter.forEach((event) => {
              let updatedChecklistItem = __updateChecklistItem(
                checklistItem,
                event
              );
              updatedChecklistItem = _changeLastEventForChecklistItem(
                updatedChecklistItem,
                event
              );
              checklistItem.length = 0;
              checklistItem = updatedChecklistItem;
            });
            newChecklist.push(checklistItem);
          }
        });
      }
    });
    return newChecklist;
  }

  function _addChecklistItems(event, updatedChecklist) {
    let newChecklist = [];
    let noRelevantChecklists = __addIfNoRelevantRestBreak(updatedChecklist, event);
    noRelevantChecklists.length > 0 &&
      console.log("CHECKLIST ADDED after 'No Relevant break' => ", noRelevantChecklists);
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
            
            let filteredChecklist = updatedChecklist.filter(
              (item) => item["periodType"] === rule["period"] / 60
            );

            filteredChecklist.forEach((checklistItem) => {
              if (checklistItem.lastRelevantBreak) {
                console.log(
                  "ADDING CHECKLIST ITEM AFTER RELEVANT MAX BREAK WITH PERIOD => " +
                  checklistItem['periodType'] +
                    " & START TIME => " +
                    checklistItem['periodStart'].format("YYYY-MM-DD HH:mm")
                );
                let newChecklistItem = __createChecklistItem(event, rule);
                newChecklist.push(newChecklistItem);
              }
            });
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

  function ___calculateSuccessiveEvent(checklistItem, event) {
    console.log("Calculate successive event");
    let eventList = Array.isArray(events) ? events : ewd;
    eventList = eventList.map((event) => processEvent(event));

    let sortedEventList = eventList.sort(function (left, right) {
      return left.startTime.diff(right.startTime);
    });
    let currentChecklistItemIndex = sortedEventList.findIndex((item) =>
      item["startTime"].isSame(checklistItem["periodStart"])
    );
    if (currentChecklistItemIndex === -1) {
      throw new Error("Cannot find successive event");
    }
    var successiveEvent = sortedEventList[currentChecklistItemIndex + 1];
    if (successiveEvent["eventType"].toLowerCase() === "rest") {
      successiveEvent = sortedEventList[currentChecklistItemIndex + 2];
    }

    let eventsAfter = sortedEventList.filter((sortedEvent) =>
      moment(sortedEvent["startTime"]).isBetween(
        successiveEvent["startTime"],
        event["startTime"],
        null,
        "(]"
      )
    );
    return { successiveEvent, eventsAfter };
  }

  if (Array.isArray(events)) {
    let breachList = [];
    events.forEach((event) => {
      const { breaches, checklist: updatedChecklist } = _handleEvent(event);

      // change checklist to updatedChecklist
      checklist.length = 0;
      checklist.push(...updatedChecklist);

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
