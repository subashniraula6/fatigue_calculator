const { TimeCalculation } = require("./TimeCalculation");

var minutesToHourMinutes = require("./utility")["minutesToHourMinutes"];

class BreachCalculation {
  constructor(checklistItem, ruleSets, event) {
    this.checklistItem = checklistItem;
    this.ruleSets = ruleSets;
    this.event = event;
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

  ___calculateNightBreachInstant(periodTime, numberOfBreaks) {
    let nightStart = periodTime
      .clone()
      .subtract(1, "days")
      .set({ h: 22, m: 0, s: 0 });
    let nightEnd = periodTime.clone().set({ h: 8, m: 0, s: 0 });

    let baseTime = periodTime.clone();
    if (periodTime.isBefore(nightStart.add(7, "hours"))) {
      baseTime = nightEnd.clone().subtract(1, "days");
    } else if (periodTime.isAfter(nightEnd.clone())) {
      baseTime = nightEnd.clone();
    }
    let breachInstant = baseTime
      .subtract(numberOfBreaks - 1, "days")
      .subtract(7, "hours");
    return breachInstant;
  }

  _calculateMaxWorkBreach() {
    let { totalWork, periodType, totalPeriod, periodTime, lastEvent } =
      this.checklistItem;
    let { startTime: newEventStartTime } = this.event;

    // Calculate only when last event is 'work'
    if (lastEvent === "rest") return [];

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

    // find breach instant
    let exceededMinutes = totalWork - maximumWorkTime * 60;
    let lastestTime =
      totalPeriod < periodType * 60 ? newEventStartTime : periodTime;
    let breachInstant = lastestTime
      .clone()
      .subtract(exceededMinutes, "minutes");

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

    //set to checklist item
    this.checklistItem.breach["status"]["maxWorkBreach"] =
      calculatedBreach["level"] === "noBreach" ? false : true;
    this.__pushOrReplace(this.checklistItem, calculatedBreach);
    // TODO: Do not push to maxWorkBreaches if new breach is same as already existed
    // same SEVERITY and same TYPE
    // But push if same TYPE and SEVERITY increases

    // return breach included checklist item
    maxWorkBreaches.push(this.checklistItem);
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
    let { periodType, lastEvent, totalPeriod, lastEventTime, periodTime } =
      this.checklistItem;
    let { startTime: newEventStartTime, eventType: newEventType } = this.event;

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
        var maxRest = continuousBreaks.length > 0
        ? continuousBreaks.sort(
            (left, right) =>
              right["continuousMinutes"] - left["continuousMinutes"]
          )[0]
        : null;

        var maxRestTime =
          maxRest
            ? maxRest["continuousMinutes"]
            : 0;

        let calculatedBreach =
          this.___categorizecontinuousStationaryBreakBreach(
            maxRestTime,
            restBreakRule,
            "continuousBreak"
          );

        if(maxRest){
          breachInstant = maxRest['endTimes'][0]; 
        }

        breach = {
          ...calculatedBreach,
          breachInstant: breachInstant.format("YYYY-MM-DD HH:mm"),
        };
      }
      console.log("CONTINUOUS REST BREACH CALCULATED: ", breach);

      //set to checklist item
      this.checklistItem.breach["status"]["continuousBreakBreach"] = true;
      this.__pushOrReplace(this.checklistItem, breach);

      // return breach included checklist item
      continuousMinutesBreaches.push(this.checklistItem);
    });
    return continuousMinutesBreaches;
  }

  __calculateNightRestBreaches() {
    let nightRestBreaches = [];
    let { periodType, lastEvent, totalPeriod, lastEventTime, periodTime } =
      this.checklistItem;
    let { startTime: newEventStartTime, eventType: newEventType } = this.event;

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
      let invalidNightBreaks = this.checklistItem["breaks"][
        "nightBreaks"
      ].filter((brk) => brk["continuousMinutes"] < 7 * 60);

      // find largest rest time
      var maxNightRest = invalidNightBreaks.length > 0
      ? invalidNightBreaks.sort(
          (left, right) =>
            right["continuousMinutes"] - left["continuousMinutes"]
        )[0] : null;
      var maxRestTime = maxNightRest ? maxNightRest['continuousMinutes'] : 0;

      let breachInstant;
      if(maxNightRest){
        // Breach instant will be max night rest End Time
        breachInstant = maxNightRest['endTimes'][0];
        let maxNightRestStart = breachInstant.clone().subtract(maxRestTime, "minutes");
        let remainingMinutes = 7 * 60 - maxRestTime;
        let nightEnd = breachInstant.set({ h: 8, m: 0, s: 0 });
        if(breachInstant.clone().add(remainingMinutes).isAfter(nightEnd) || 
            breachInstant.clone().add(remainingMinutes).isAfter(periodTime)){
              breachInstant = maxNightRestStart.clone().subtract(remainingMinutes, "minutes");
            }
      } else {
        breachInstant = this.___calculateNightBreachInstant(
          periodTime,
          remainingNightBreaks
        );
      };
      
      let breach = this.___categorizecontinuousStationaryBreakBreach(
        maxRestTime,
        restBreakRule,
        "nightBreak"
      );
      breach = { ...breach, breachInstant: breachInstant.format("YYYY-MM-DD HH:mm")};
      console.log("NIGHT REST BREACH CALCULATED: ", breach);

      // Set to checklist item
      this.checklistItem.breach["status"]["nightBreaksBreach"] = true;
      this.__pushOrReplace(this.checklistItem, breach);

      // return breach included checklist item
      nightRestBreaches.push(this.checklistItem);
    });
    return nightRestBreaches;
  }

  __calculateConsecutiveNightRestBreaches() {
    let consecutiveNightBreaches = [];

    let { periodType, lastEvent, totalPeriod, lastEventTime, periodTime } =
      this.checklistItem;
    let { startTime: newEventStartTime, eventType: newEventType } = this.event;

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

      if(maxConsecutiveRest){
        // Breach instant will be max night rest End Time
        breachInstant = maxConsecutiveRest['endTimes'][0];
        let maxNightRestStart = breachInstant.clone().subtract(maxRestTime, "minutes");
        let remainingMinutes = 7 * 60 - maxRestTime;
        let nightEnd = breachInstant.set({ h: 8, m: 0, s: 0 });
        if(breachInstant.clone().add(remainingMinutes).isAfter(nightEnd) || 
            breachInstant.clone().add(remainingMinutes).isAfter(periodTime))
            {
              breachInstant = maxNightRestStart.clone().subtract(remainingMinutes, "minutes");
            }
      } else {
        breachInstant = this.___calculateNightBreachInstant(
          periodTime,
          remainingConsecutiveNightBreaks * 2
        );
      };
      
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

      // Set to checklist item
      this.checklistItem.breach["status"]["consecutiveNightBreaksBreach"] = true;
      this.__pushOrReplace(this.checklistItem, breach);

      // return breach included checklist item
      consecutiveNightBreaches.push(this.checklistItem);
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
}

module.exports = { BreachCalculation };
