const { TimeCalculation } = require("./TimeCalculation");
const { isPeriodExceeded } = require("./utility");
const processEvent = require('./utility')['processEvent'];

var minutesToHourMinutes = require("./utility")["minutesToHourMinutes"];

class BreachCalculation {
  constructor(checklistItem, ruleSets, ewd) {
    this.checklistItem = checklistItem;
    this.ruleSets = ruleSets;
    this.ewd = ewd;
  }

  ___calculateRuleEquivalentContinuousBreakCount(
    checklistContinuousBreaks,
    ruleContinuousBreak
  ) {
    let ruleEquivalentContinuousBreakCount = 0;
    checklistContinuousBreaks.forEach((contdBrk) => {
      if (contdBrk["continuousMinutes"] >= ruleContinuousBreak) {
        ruleEquivalentContinuousBreakCount +=
          parseInt(contdBrk["continuousMinutes"] / ruleContinuousBreak) *
          contdBrk["count"];
      }
    });
    return ruleEquivalentContinuousBreakCount;
  }

  ___categorizecontinuousStationaryBreakBreach(
    totalRestBreakMinutes,
    restBreakRule,
    type
  ) {
    console.log("CATEGORIZING REST BREACHES......");
    let breachList = restBreakRule["breaches"];
    var breach = breachList.find((item) => {
      let from = item["from"];
      let to = item["to"];
      return (
        totalRestBreakMinutes >= from * 60 && totalRestBreakMinutes < to * 60
      );
    });
    // If not in a range
    if (!breach) {
      breach = {
        level: "none",
        type: type,
        // breachInstant: breachInstant.format("YYYY-MM-DD HH:mm"),
        description: "Not listed",
      };
      return breach;
    }

    // If In a range
    let from = breach["from"];
    let to = breach["to"];
    let description = `${
      type === "nightBreak" ? "Night" : "Continuous"
    } Rest less than ${minutesToHourMinutes(to * 60)}`;
    if (from !== 0) {
      description += ` and greater than ${minutesToHourMinutes(from * 60)}`;
    }

    return {
      level: breach["level"],
      type,
      description,
    };
  }

  ___calculateNightBreachInstant(periodTime, numberOfBreaks, ewd = null) {
    let nightStart = periodTime
      .clone()
      .subtract(1, "days")
      .set({ h: 22, m: 0, s: 0 });
    let nightEnd = periodTime.clone().set({ h: 8, m: 0, s: 0 });

    let baseTime;
    if (periodTime.isBefore(nightStart.add(7, "hours"))) {
      baseTime = nightEnd.clone().subtract(1, "days");
    } else if (periodTime.isAfter(nightEnd)) {
      baseTime = nightEnd.clone();
    } else {
      baseTime = periodTime.clone();
    }
    let breachInstant = baseTime
      .clone()
      .subtract(numberOfBreaks - 1, "days")
      .subtract(7, "hours");

    if(!ewd) return breachInstant; 

    // Find possible next breach instant that breaks night break
    let instant = breachInstant.clone();
    ewd = ewd.map(event => processEvent(event))
    let eventsAfter = ewd.filter(event => event.startTime.isSameOrAfter(breachInstant));
    if(!breachInstant.isSame(eventsAfter[0])){
      let firstEvent = {
        eventType: eventsAfter[0].eventType === 'work' ? 'rest': 'work', 
        startTime: breachInstant.clone()
      };
      eventsAfter.unshift(firstEvent);
    }
    console.log("events", ewd.map(event => ({...event, startTime: event.startTime.format("YYYY-MM-DD HH:mm")})));
    console.log("breachInstant", breachInstant.format("YYYY-MM-DD HH:mm"))
    console.log("eventsAfter", eventsAfter.map(event => ({...event, startTime: event.startTime.format("YYYY-MM-DD HH:mm")})));
    
    while(1){
      let start = instant.clone().add(7, 'hours').subtract(1, 'days').set({ h: 22, m: 0, s: 0 });
      let end = instant.clone().add(7, 'hours').set({ h: 8, m: 0, s: 0 });
      
      
      start = start.isBefore(breachInstant) ? breachInstant.clone() : start;
      end = end.isAfter(baseTime) ? baseTime.clone() : end;
  
      console.log(`Checking Night rest for Range: start ${start.format("YYYY-MM-DD HH:mm")} && end ${end.format("YYYY-MM-DD HH:mm")} ====>>>>>>>>>>>>>>>>`,)
  
      // Check if night rest lies between start and end
      let isPresent = false;
      for(let i=0; i < eventsAfter.length - 1 ; i++){
        let event = eventsAfter[i];
        let nextEvent = eventsAfter[i+1];
        if(event.eventType === 'rest'){
          if(event.startTime.isSameOrBefore(end) && nextEvent.startTime.isSameOrAfter(start)){
            // this rest lies within start and end
            let intersectRestStart = event.startTime.isSameOrBefore(start) ? start.clone() : event.startTime.clone();
            let intersectRestEnd = nextEvent.startTime.isSameOrAfter(end) ? end.clone() : nextEvent.startTime.clone();
            console.log("intersectRestStart", intersectRestStart.format("YYYY-MM-DD HH:mm"));
            console.log("intersectRestEnd", intersectRestEnd.format("YYYY-MM-DD HH:mm"));
            let intersectDuration = intersectRestEnd.diff(intersectRestStart, "hours");
            if(intersectDuration >= 7){
              isPresent = true;
              console.log("Night Rest found. Skipping this loop....................")
              break;
            }
            console.log("Night Rest Not found")
          }
        }
      }
      !isPresent && console.log("Breaking loop and calculating breach Work Time....")
      if(!isPresent){
        // Find work that lies between end-7 to end
        for(let i=0; i < eventsAfter.length - 1 ; i++){
          let event = eventsAfter[i];
          let nextEvent = eventsAfter[i+1];
          if(event.eventType === 'work'){
            let endMinus7 = end.clone().subtract(7, 'hours');
            if(event.startTime.isSameOrBefore(end) && nextEvent.startTime.isAfter(endMinus7)){
              breachInstant = event.startTime.isSameOrBefore(endMinus7) ? endMinus7.clone() : event.startTime; 
            }
          }
        } 
        break;
      }
      // increment instant to next day
      instant.add(1, 'days');
      if(end.isSameOrAfter(baseTime)){
        break;
      }
    };
  
    console.log("CALCULATED NIGHT BREACH INSTANT", breachInstant.format("YYYY-MM-DD HH:mm"))
    return breachInstant;
  }

  ___findClosestEvents(ewd, date){
    let eventList = ewd.map((event) => processEvent(event));
    let beforeEvents = eventList.filter(event => event.startTime.isSameOrBefore(date));
    let afterEvents = eventList.filter(event => event.startTime.isSameOrAfter(date));
    return {
      beforeEvent: beforeEvents[beforeEvents.length - 1],
      afterEvent: afterEvents[0]
    }
  };

  ___calculateMaxWorkBreachInstant(checklistItem, rule, ewd){
    let { totalWork, periodType, periodTime, lastEvent, event } = checklistItem;
    // Fetch rule for the period
    var rule = this.ruleSets.find((rule) => rule["period"] / 60 === periodType);
    var maximumWorkTime = rule["work"][0]["maximumWorkTime"];

    // find breach instant
    let exceededMinutes = totalWork - maximumWorkTime * 60;
   
    let breachInstant = isPeriodExceeded(this.checklistItem) ? periodTime.clone(): event.startTime.clone();
    let processedEventList = ewd.map((event) => processEvent(event));
    
    // Remove latest event
    processedEventList.pop();
    let newLatestEvent = isPeriodExceeded(this.checklistItem) ? { eventType: lastEvent === 'rest' ? 'work' : 'rest', startTime: periodTime  } : event; 
    // Add new calculated event
    let eventList = [...processedEventList, newLatestEvent];

    // Go back in time and calculate breach instant
    for(let i = eventList.length - 1; i > 0; i--){
      let event = eventList[i];
      let prevEvent = eventList[i - 1];
      let duration = event.startTime.clone().diff(prevEvent.startTime, "minutes");
      if(event.eventType === 'rest' && prevEvent.eventType === 'work'){
        if(duration > exceededMinutes){
          breachInstant.subtract(exceededMinutes, "minutes");
          break;
        } else {
          breachInstant.subtract(duration, "minutes");  
          exceededMinutes -= duration;
        }
      } else {
        breachInstant.subtract(duration, "minutes");
      }
      if(exceededMinutes <= 0) break;
    }
    return breachInstant;
  }

  _calculateMaxWorkBreach() {
    let { totalWork, periodType, totalPeriod, periodTime, lastEvent, lastEventTime, event } =
      this.checklistItem;
    let { startTime: newEventStartTime, eventType: newEventType } = event;

    // Calculate only when new event is 'rest' if period not exceeded
    if (newEventType === "work" && !isPeriodExceeded(this.checklistItem)) return [];

    // Fetch rule for the period
    var rule = this.ruleSets.find((rule) => rule["period"] / 60 === periodType);
    var maximumWorkTime = rule["work"][0]["maximumWorkTime"];

    // Return empty if work done is less than rule maxwork
    if (totalWork <= maximumWorkTime * 60) {
      return [];
    }

    let maxWorkBreaches = [];
    // breach occured
    var maximumWorkBreaches = rule["work"][0]["breaches"];
    // categorize breach from ruleset
    var breach = maximumWorkBreaches.find((item) => {
      let from = item["from"];
      let to = item["to"];
      if (to === 0 && totalWork >= from) return item;
      return totalWork >= from && totalWork <= to;
    });

    let breachInstant = this.___calculateMaxWorkBreachInstant(this.checklistItem, rule, this.ewd);
    // If not in a range
    if (!breach) {
      breach = {
        level: "none",
        type: "maxWorkBreach",
        breachInstant: breachInstant.format("YYYY-MM-DD HH:mm"),
        description: "Not listed",
      };
    }

    // update breach to checklist item
    let description = null;
    description =
      breach["level"] !== "none"
        ? `Work more than ${minutesToHourMinutes(breach["from"] - 1)}`
        : breach["description"];

    let calculatedBreach = {
      level: breach["level"],
      type: "maxWorkBreach",
      breachInstant: breachInstant.format("YYYY-MM-DD HH:mm"),
      description,
    };

    console.log("MAX WORK BREACH CALCULATED: ", calculatedBreach);

    // // return breach included checklist item
    maxWorkBreaches.push(calculatedBreach);
    return maxWorkBreaches;
  }

  __pushOrReplace(checklistItem, breach) {
    let idx = checklistItem.breach.breaches.findIndex(
      (item) => item["type"] === breach["type"]
    );
    if (idx === -1) {
      checklistItem.breach["breaches"].push(breach);
    } else {
      checklistItem.breach["breaches"][idx] = breach;
    }
  }

  __calculateContinuousMinutesBreach() {
    let continuousMinutesBreaches = [];
    let { periodType, lastEvent, totalPeriod, lastEventTime, periodTime, event } =
      this.checklistItem;
    let { startTime: newEventStartTime, eventType: newEventType } = event;

    // Calculate only when new event is 'rest' if period not exceeded
    if (newEventType === "work" && !isPeriodExceeded(this.checklistItem)) return [];

    // Fetch rule for the period
    var rule = this.ruleSets.find((rule) => rule["period"] / 60 === periodType);
    var restBreakRules = rule["rest"];

    restBreakRules.forEach((restBreakRule) => {
      console.log("CONTINUOUS MINUTES BREACH CALCULATION ");

      if (!restBreakRule["continuousBreak"]) {
        // Continuous break rule doesnt exist
        return;
      }

      var ruleEquivalentContinuousBreakCount =
        this.___calculateRuleEquivalentContinuousBreakCount(
          this.checklistItem["breaks"]["continuousBreaks"],
          restBreakRule["continuousBreak"]
        );

      var ruleBreaksCount = restBreakRule["numberOfContinuousBreaks"];

      if (ruleEquivalentContinuousBreakCount >= ruleBreaksCount) {
        // continuous breaks satisfies the rule
        return;
      }

      let remainingRestMinutes =
        (ruleBreaksCount - ruleEquivalentContinuousBreakCount) *
        restBreakRule["continuousBreak"];
      // RemainingRestMinutes will always be positive at this stage

      let remainingTotalMinutes = periodTime
        .clone()
        .diff(newEventStartTime, "minutes");

      // if period doesnt expire and remaining rest minutes less than or equal remaining toal minutes
      if (
        totalPeriod < periodType * 60 &&
        remainingRestMinutes <= remainingTotalMinutes
      ) {
        // There is still time to take REST before period expires
        return;
      }

      let breachInstant = periodTime
        .clone()
        .subtract(remainingRestMinutes, "minutes");
      // If breach instant is already in REST state it should be next Work time
      let closestEvents = this.___findClosestEvents(this.ewd, breachInstant);
      if(closestEvents.beforeEvent.eventType === 'rest'){
        breachInstant = closestEvents.afterEvent.startTime;
      }

      let breach;
      if (restBreakRule["breaches"].length === 0) {
        breach = {
          level: "none",
          type: "continuousBreak",
          breachInstant: breachInstant.format("YYYY-MM-DD HH:mm"),
          description: `Minimum ${
            restBreakRule["continuousBreak"] * ruleBreaksCount
          } minutes rest time in blocks of ${
            restBreakRule["continuousBreak"]
          } continuous minutes in any ${periodType} hours period`,
        };
      } else {
        // find largest rest time
        let continuousBreaks = this.checklistItem["breaks"]["continuousBreaks"];
        var maxRestTime = continuousBreaks.length > 0
        ? continuousBreaks.sort(
            (left, right) =>
              right["continuousMinutes"] - left["continuousMinutes"]
          )[0]["continuousMinutes"]
        : null;

        let calculatedBreach =
          this.___categorizecontinuousStationaryBreakBreach(
            maxRestTime,
            restBreakRule,
            "continuousBreak"
          );
        breach = {
          ...calculatedBreach,
          breachInstant: breachInstant.format("YYYY-MM-DD HH:mm"),
        };
      }
      console.log("CONTINUOUS REST BREACH CALCULATED: ", breach);
      
      continuousMinutesBreaches.push(breach);
    });
    return continuousMinutesBreaches;
  }

  __calculateNightRestBreaches() {
    let nightRestBreaches = [];
    let { periodType, lastEvent, totalPeriod, lastEventTime, periodTime, event } =
      this.checklistItem;
    let { startTime: newEventStartTime, eventType: newEventType } = event;

    // Calculate only when new event is 'rest' if period not exceeded
    if (newEventType === "work" && !isPeriodExceeded(this.checklistItem)) return [];

    // Fetch rule for the period
    var rule = this.ruleSets.find((rule) => rule["period"] / 60 === periodType);
    var restBreakRules = rule["rest"];

    restBreakRules.forEach((restBreakRule) => {
      console.log("NIGHT REST BREACHES CALCULATION ");

      if (!restBreakRule["nightBreaks"]) {
        // Night break rule doesnt exist
        return;
      }

      let validNightBreaks = this.checklistItem["breaks"]["nightBreaks"].filter(
        (brk) => brk["continuousMinutes"] >= 7 * 60
      );

      let nightBreaksCount = validNightBreaks.length;

      var ruleBreaksCount = restBreakRule["nightBreaks"];

      if (nightBreaksCount >= ruleBreaksCount) {
        // night breaks satisfies the rule
        return;
      }

      let remainingNightBreaks = ruleBreaksCount - nightBreaksCount;
      // RemainingRestMinutes will always be positive at this stage

      // Remaining total night breaks
      let timeCalculation = new TimeCalculation();
      let totalNightBreaks = timeCalculation.__calculateNightDuration(
        newEventStartTime,
        periodTime
      );
      let validTotalNightBreaks = totalNightBreaks.filter(
        (brk) => brk["continuousMinutes"] >= 7 * 60
      );

      let remainingTotalNightBreaks = validTotalNightBreaks.length;

      // if period doesnt expire and remaining rest minutes less than or equal remaining toal minutes
      if (
        totalPeriod < periodType * 60 &&
        remainingNightBreaks <= remainingTotalNightBreaks
      ) {
        // There is still time to take NIGHT REST before period expires
        return;
      }

      // Find invalid nightbreaks less tha 7 hours
      let invalidNightBreaks = this.checklistItem["breaks"]["nightBreaks"]
      .filter((brk) => brk["continuousMinutes"] < 7 * 60);

      // find largest rest time
      var maxRestTime = invalidNightBreaks.length > 0
      ? invalidNightBreaks.sort(
          (left, right) =>
            right["continuousMinutes"] - left["continuousMinutes"]
        )[0]['continuousMinutes'] : null;

      let breachInstant = this.___calculateNightBreachInstant(
        periodTime,
        remainingNightBreaks,
        this.ewd
      );
      
      let breach = this.___categorizecontinuousStationaryBreakBreach(
        maxRestTime,
        restBreakRule,
        "nightBreak"
      );
      breach = { ...breach, breachInstant: breachInstant.format("YYYY-MM-DD HH:mm")};
      console.log("NIGHT REST BREACH CALCULATED: ", breach);

      // return breach included checklist item
      nightRestBreaches.push(breach);
    });
    return nightRestBreaches;
  }

  __calculateConsecutiveNightRestBreaches() {
    let consecutiveNightBreaches = [];

    let { periodType, lastEvent, totalPeriod, lastEventTime, periodTime, event } =
      this.checklistItem;
    let { startTime: newEventStartTime, eventType: newEventType } = event;

    // Calculate only when new event is 'rest' if period not exceeded
    if (newEventType === "work" && !isPeriodExceeded(this.checklistItem)) return [];

    // Fetch rule for the period
    var rule = this.ruleSets.find((rule) => rule["period"] / 60 === periodType);
    var restBreakRules = rule["rest"];

    restBreakRules.forEach((restBreakRule) => {
      console.log("CONSECUTIVE NIGHT REST BREACHES CALCULATION ");

      if (!restBreakRule["consecutiveNightBreaks"]) {
        // consecutive night break rule doesnt exist
        return;
      }

      var ruleBreaksCount = restBreakRule["consecutiveNightBreaks"];

      let consecutiveNightBreaks = this.checklistItem['breaks']['consecutiveNightBreaks'];
      if (consecutiveNightBreaks >= ruleBreaksCount) {
        // consecutive night breaks satisfies the rule
        return;
      }

      let remainingConsecutiveNightBreaks = ruleBreaksCount - consecutiveNightBreaks;
      // RemainingConsecutiveNightBreaks will always be positive at this stage

      // Remaining total consecutive night breaks
      let timeCalculation = new TimeCalculation();
      let totalNightBreaks = timeCalculation.__calculateNightDuration(
        newEventStartTime,
        periodTime
      );
      let validTotalNightBreaks = totalNightBreaks.filter(
        (brk) => brk["continuousMinutes"] >= 7 * 60
      );

      let remainingTotalConsecutiveNightBreaks = parseInt(validTotalNightBreaks.length / 2);

      // if period doesnt expire and remaining rest minutes less than or equal remaining toal minutes
      if (
        totalPeriod < periodType * 60 &&
        remainingConsecutiveNightBreaks <= remainingTotalConsecutiveNightBreaks
      ) {
        // There is still time to take CONSECUTIVE NIGHT REST before period expires
        return;
      }

      // Find invalid nightbreaks less than 7 hours
      let invalidNightBreaks = this.checklistItem["breaks"][
        "nightBreaks"
      ].filter((brk) => brk["continuousMinutes"] < 7 * 60);

      // find largest rest time with valid night rest pair(consecutive)
      var orderedInvalidNightRests = invalidNightBreaks.sort(
            (left, right) =>
              right["continuousMinutes"] - left["continuousMinutes"]
          );

      let validNightBreaks = this.checklistItem.breaks['nightBreaks'].filter(
        (brk) => brk["continuousMinutes"] >= 7 * 60
      );
      let breakEndTimes = [];
      validNightBreaks.forEach((brk) => {
        breakEndTimes.push(...brk.endTimes);
      });
      var combinations = timeCalculation.__getConsecutiveDaysCombinations(breakEndTimes);
      // Find combination that is not exactly pair
      var oddCombinations = combinations.filter(combination => combination.length > 1 && (combination.length % 2 !== 0));

      let maxConsecutiveRest = null;
      if(oddCombinations.length > 0 && orderedInvalidNightRests.length > 0){
        for(let i = 0; i < orderedInvalidNightRests.length; i++){
          let invalidNightRest = orderedInvalidNightRests[i];
          // Check if this night rest has valid night rest pair
          let endTimes = invalidNightRest['endTimes'];
          loop1: for(let j = 0; j < endTimes.length; j++){
          loop2:  for(let k = 0; k < oddCombinations.length; k++){
              let endTime = endTimes[j];
              let combination = oddCombinations[k];

              let firstValidRest = combination[0];
              let lastValidRest = combination[combination.length - 1];
              let firstRange = [firstValidRest.clone().subtract(2, 'days').set({ h: 22, m: 0, s: 0 }), 
                                firstValidRest.clone().subtract(1, 'days').set({ h: 8, m: 0, s: 0 })];
              let lastRange = [lastValidRest.clone().set({ h: 22, m: 0, s: 0 }), 
                              firstValidRest.clone().add(1, 'days').set({ h: 8, m: 0, s: 0 })];
              if(endTime.isAfter(firstRange[0]) && endTime.isSameOrBefore(firstRange[1]) || endTime.isAfter(lastRange[0]) && endTime.isSameOrBefore(lastRange[1])){
                maxConsecutiveRest = {...invalidNightRest, endTimes: [endTime]};
                break loop1;
              }
            }
          }
        }
      };
      
      var maxRestTime = maxConsecutiveRest ? maxConsecutiveRest['continuousMinutes'] : 0;

      let breachInstant = null;

      
      breachInstant = this.___calculateNightBreachInstant(
        periodTime,
        remainingConsecutiveNightBreaks * 2,
        this.ewd
      );
      
      let breach = this.___categorizecontinuousStationaryBreakBreach(
        maxRestTime,
        restBreakRule,
        "nightBreak"
      );
      
      breach = {
        ...breach,
        type: "consecutiveNightBreaks",
        breachInstant: breachInstant.format("YYYY-MM-DD HH:mm")
      }; 

      console.log("CONSECUTIVE NIGHT REST BREACH CALCULATED: ", breach);

      // return breach included checklist item
      consecutiveNightBreaches.push(breach);
    });
    return consecutiveNightBreaches;
  }

  _calculateRestBreach() {
    console.log("CALCULATING REST BREACH....");
    let restBreaches = [];

    // Calculate Continuous Minutes
    let continuousMinutesBreaches = this.__calculateContinuousMinutesBreach();
    restBreaches.push(...continuousMinutesBreaches);

    // Calculate night rest breaches
    let nightRestBreaches = this.__calculateNightRestBreaches();
    restBreaches.push(...nightRestBreaches);

    // Calculate Consecutive night breaks breaches
    let consecutiveNightBreaches =
      this.__calculateConsecutiveNightRestBreaches();
    restBreaches.push(...consecutiveNightBreaches);

    return restBreaches;
  }

  _udpateBreachTime() {
    let { event, totalWork, periodType, periodTime } = this.checklistItem;
    if(event.eventType === 'work' && !isPeriodExceeded(this.checklistItem)){
      console.log("CALCULATING BREACH TIME....");
      // MaxWork Breach Time
      // Fetch rule for the period
      var rule = this.ruleSets.find((rule) => rule["period"] / 60 === periodType);
      var maximumWorkTime = rule["work"][0]["maximumWorkTime"] * 60;
      let remainingWorkMinutes = maximumWorkTime - totalWork;
      let maxWorkBreachInstant = event.startTime.clone().add(remainingWorkMinutes, 'minutes');

      let continuousMinutesBreachTime = null;
      let nightBreachTime = null;
      let consecutiveNightBreachTime = null;
      
      var restBreakRules = rule["rest"];
      restBreakRules.forEach((restBreakRule) => {
        if (restBreakRule["continuousBreak"]) {
          // Continuous Minutes Breach Time
          var ruleEquivalentContinuousBreakCount =
            this.___calculateRuleEquivalentContinuousBreakCount(
              this.checklistItem["breaks"]["continuousBreaks"],
              restBreakRule["continuousBreak"]
            );
          
          var ruleBreaksCount = restBreakRule["numberOfContinuousBreaks"];
          let remainingRestMinutes =
          (ruleBreaksCount - ruleEquivalentContinuousBreakCount) *
          restBreakRule["continuousBreak"];
          
          continuousMinutesBreachTime = periodTime.clone().subtract(remainingRestMinutes, "minutes");
        }

        if (restBreakRule["nightBreaks"]) {
          // Night break rule breach time
          let validNightBreaks = this.checklistItem["breaks"]["nightBreaks"].filter(
            (brk) => brk["continuousMinutes"] >= 7 * 60
          );
          let nightBreaksCount = validNightBreaks.length;

          var ruleBreaksCount = restBreakRule["nightBreaks"];

          if (nightBreaksCount < ruleBreaksCount) {
            let remainingNightBreaks = ruleBreaksCount - nightBreaksCount;
            nightBreachTime = this.___calculateNightBreachInstant(periodTime, remainingNightBreaks);
          
          }
        }

        if (restBreakRule["consecutiveNightBreaks"]) {
          // Consecutive night break rule breach time
          var ruleBreaksCount = restBreakRule["consecutiveNightBreaks"];
          let consecutiveNightBreaks = this.checklistItem['breaks']['consecutiveNightBreaks'];
          if (consecutiveNightBreaks < ruleBreaksCount) {
            let remainingConsecutiveNightBreaks = ruleBreaksCount - consecutiveNightBreaks;
            consecutiveNightBreachTime = this.___calculateNightBreachInstant(periodTime, remainingConsecutiveNightBreaks * 2);  
          
          }
        }
      });
      // Find lated breach time
      let breachTimes = [{maxWorkBreach: maxWorkBreachInstant}];
      continuousMinutesBreachTime && breachTimes.push({continuousMinutes: continuousMinutesBreachTime});
      nightBreachTime && breachTimes.push({nightBreak: nightBreachTime});
      consecutiveNightBreachTime && breachTimes.push({consecutiveNightBreak: consecutiveNightBreachTime});
      
      this.checklistItem.nextBreaches = breachTimes;
    }
  }
}

module.exports = { BreachCalculation };
