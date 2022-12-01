import moment from "moment";
import BreachCalculation from "./BreachCalculation";
import TimeCalculation from "./TimeCalculation";
import { processEvent } from "./utility";
import { toUtc } from "./utility";
import { isPeriodExceeded } from "./utility";
import { fetchRule } from "./utility";

export function BreachCalculator(events, ruleSets, checklist = [], ewd = []) {
  function _handleEvent(event) {
    // process event
    event = processEvent(event);

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

    // Breach instants
    let breachInstants = _simplifyChecklist([...updatedChecklist, ...newChecklist]);

    console.log("Checklist at the end", [...updatedChecklist, ...newChecklist]);

    return { checklist: [...updatedChecklist, ...newChecklist], breaches, ewd, breachInstants };
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

      // 3. Update Breach Time status
      breachCalculation._udpateBreachTime();

      if(breaches.length > 0){
        breaches.forEach(breach => {
          __pushOrReplace(checklistItem, breach)
        });
        // checklistItem.breach.breaches.push(...breaches);    
        breachList.push(checklistItem);
      }
    });
    return breachList;
  }

  function __pushOrReplace(checklistItem, breach) {
    let idx = checklistItem.breach.breaches.findIndex(
      (item) => item["type"] === breach["type"]
    );
    if (idx === -1) {
      checklistItem.breach["breaches"].push(breach);
    } else {
      checklistItem.breach["breaches"][idx] = breach;
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

  function requiresMaxWorkCheck(rule) {
    if (rule["work"].length > 0 && rule["work"][0]["maximumWorkTime"] > 0) {
      return true;
    } else return false;
  }

  function requiresRestBreakCheck(rule, type) {
    if (rule["rest"].length === 0) return false;
    let idx = rule["rest"].findIndex((rest) => {
      if (rest[type] > 0) {
        return true;
      }
    });
    if (idx === -1) return false;
    return true;
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
      periodTime: toUtc(event["startTime"]).add(rule["period"], "minutes"),
      lastEvent: event["eventType"],
      lastEventTime: toUtc(event["startTime"]),
      event: event,
      breach: {
        status: {
          maxWorkBreach: requiresMaxWorkCheck(rule) ? null : false,
          continuousBreakBreach: requiresRestBreakCheck(rule, "continuousBreak")
            ? null
            : false,
          nightBreaksBreach: requiresRestBreakCheck(rule, "nightBreaks")
            ? null
            : false,
          consecutiveNightBreaksBreach: requiresRestBreakCheck(
            rule,
            "consecutiveNightBreaks"
          )
            ? null
            : false,
        },
        breaches: [],
      },
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
    // Update breach time
    newChecklist.forEach((checklistItem) => {
      const breachCalculation = new BreachCalculation(
        checklistItem,
        ruleSets,
        null
      );
      breachCalculation._udpateBreachTime();
    });
    
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

  function _simplifyChecklist(checklist){
    let list = [];
    checklist.forEach(checklistItem => {
      let {nextBreaches} = checklistItem;  
      nextBreaches.forEach(time => {
          list.push({
            periodStart: checklistItem.periodStart.format("YYYY-MM-DD HH:mm"),
            periodType: checklistItem.periodType,
            ...time
          });
      });
    });
    let sortedList = list.sort((left, right) => {
      return left.from.diff(right.from)
    });
    return sortedList.map(time => ({...time, from: time.from.format(), to: time.to.format()}));
  }

  function _estimateTargetRestMinute(){
    let event = processEvent(events);
    let candidateRestMinutes = [];
    let criticalRestMinutes = [];
    checklist.forEach(checklistItem => {
      let rule = fetchRule(checklistItem, ruleSets);
      // Estimate maxwork breach
      // check if maxwork breach already encountered
      let isMaxWorkBreach = checklistItem.breach.breaches.find(breach => breach.type.toLowerCase() === 'maxworkbreach');
      if(!isMaxWorkBreach){
        var maxWorkMinutes = rule["work"][0]["maximumWorkTime"] * 60;

        // Check for possible maxwork breach
        let estimatedLeastTotalWork = 15 + checklistItem.totalWork;
        let remainingWorkMinutes = maxWorkMinutes - checklistItem.totalWork;
        remainingWorkMinutes = Math.floor(remainingWorkMinutes);

        // check if this work causes breach
        if(estimatedLeastTotalWork > maxWorkMinutes){
          let targetRestMinutes = checklistItem.periodTime.clone().subtract(remainingWorkMinutes, "minutes").diff(event.startTime, "minutes");
          console.log("targetRestMinutes", targetRestMinutes)
          criticalRestMinutes.push(targetRestMinutes);
        }
      }

      // Estimate continuous rest breach
      var restBreakRules = rule["rest"];
      let continuousBreakBreach = checklistItem.breach.breaches.find(breach => breach.type.toLowerCase() === 'continuousbreakbreach');
      if(!continuousBreakBreach){
        restBreakRules.forEach((restBreakRule) => {
          //
          if(restBreakRule.continuousBreak && !isPeriodExceeded(checklistItem)){
            // let newRest = checklistItem.lastEventTime.clone().diff(event.startTime, "minutes");
            // let ruleEquivalentRestCount = parseInt(newRest / restBreakRule.continuousBreak)
            // let leastPossibleRestTime = event.startTime.clone().add(1, "minutes");


            // find number of rest upto previous work
            let checklistContinuousBreaks = checklistItem.breaks.continuousBreaks
            let numberOfRestUptoPrevWork = 0;
            checklistContinuousBreaks.forEach((contdBrk) => {
              if (contdBrk["continuousMinutes"] >= restBreakRule.continuousBreak) {
                numberOfRestUptoPrevWork +=
                  parseInt(contdBrk["continuousMinutes"] / restBreakRule.continuousBreak) *
                  contdBrk["count"];
              }
            });
            if(numberOfRestUptoPrevWork < restBreakRule.numberOfContinuousBreaks)
            {
              let requireNoOfContinuousBreaks = restBreakRule.numberOfContinuousBreaks - numberOfRestUptoPrevWork;
              let requiredContinuousBreakMinutes = requireNoOfContinuousBreaks * restBreakRule.continuousBreak; 
              // if(event.startTime.clone().add(requiredContinuousBreakMinutes, "minutes").isSame(checklistItem.periodTime)){

              // }
              // else 
              if(event.startTime.clone().add(requiredContinuousBreakMinutes * 2 + 15, "minutes").isSameOrBefore(checklistItem.periodTime)){
                candidateRestMinutes.push(requiredContinuousBreakMinutes);
              } else {
                criticalRestMinutes.push(requiredContinuousBreakMinutes);
                // criticalRestMinutes.push(checklistItem.periodTime.clone().diff(event.startTime, "minutes"));
              }
            }
          }
        })
      }
    });
    // return lease candidateRest minutes
    let leastCandidateMinute = Math.min(...candidateRestMinutes);
    // if critical rest minutes
    if(criticalRestMinutes.length > 0){
      let maxCriticalRest = Math.max(...criticalRestMinutes);
      if(leastCandidateMinute > maxCriticalRest){
        return maxCriticalRest
      }
      return Math.max(...criticalRestMinutes, leastCandidateMinute);
    }
    return isFinite(leastCandidateMinute) ? leastCandidateMinute: 0;
  }

  if (Array.isArray(events)) {
    let breachList = [];
    events.forEach((event) => {
      // push to ewd
      ewd.push(event);
      const { breaches, checklist: updatedChecklist, breachInstants } = _handleEvent(event);

      // change checklist to updatedChecklist
      checklist.length = 0;
      checklist.push(...updatedChecklist);

      breachList.push(...breaches);
      // Remove reduntant breaches
      let toRemoveIndices = [];
      for (let i = 0; i < breachList.length - 1; i++) {
        for (let j = i; j < breachList.length; j++) {
          if (i !== j &&
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
    let result = _handleEvent(events);
    
    if(events.eventType.toLowerCase() === 'rest'){
      // Find target rest minute
      let targetRestMinutes = _estimateTargetRestMinute();
      result.targetRestMinutes = targetRestMinutes;
    }
    return result;
  }
}

export function estimateNightRestBreachInstants(checklist, ruleSets){
  let nightRestBreachInstants = [];
    checklist.forEach(checklistItem => {
      if(checklistItem.event.eventType !== 'rest'){
        return [];
      }
      let rule = fetchRule(checklistItem, ruleSets);
      var restBreakRules = rule["rest"];
      // Estimate night rest breach
      let nightBreakBreach = checklistItem.breach.breaches.find(breach => breach.type.toLowerCase() === 'nightBreak');
      if(!nightBreakBreach && moment().isSameOrBefore(checklistItem.periodTime)){
        var requiredNightBreaksCount = restBreakRules.reduce((accumulator, restBreakRule) => {
          if(restBreakRule["nightBreaks"]){
            return accumulator + restBreakRule["nightBreaks"];
          }
          if (restBreakRule["consecutiveNightBreaks"]){
            return accumulator + restBreakRule["consecutiveNightBreaks"];
          }
          return accumulator;
        }, 0);
  
        if(requiredNightBreaksCount > 0){
          let validNightBreaks = checklistItem["breaks"]["nightBreaks"].filter(
            (brk) => brk["continuousMinutes"] >= 7 * 60
          );
          let nightBreaksCount = 0;
          validNightBreaks.forEach(brk => {
            for(let i = 0; i < brk.count; i++){
              nightBreaksCount++;
            }
          });

          // Increment current night rest
          let newEventTime = checklistItem.event.startTime;
          let timeCalculation = new TimeCalculation();
          let currentNightRests = timeCalculation.__calculateNightDuration(newEventTime, moment()).filter(rest => rest.continuousMinutes >= 7 * 60);
          let currentNightRestsCount = currentNightRests.length;

          let remainingNightBreaks = requiredNightBreaksCount - (nightBreaksCount + currentNightRestsCount);
          if(remainingNightBreaks > 0){
            let breachCalculation = new BreachCalculation(checklistItem, ruleSets);
            let breachInstant = breachCalculation.___calculateNightBreachInstant(
              checklistItem.periodTime,
              remainingNightBreaks
            );
            if(breachInstant.isSameOrAfter(moment())){
              nightRestBreachInstants.push({
                from: breachInstant, 
                to: breachInstant.clone().add(7, 'hours').add(remainingNightBreaks - 1, 'days')
              });
            }
          }
        }
      }
    });
    return nightRestBreachInstants;
}
