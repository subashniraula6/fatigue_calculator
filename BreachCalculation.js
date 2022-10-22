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
    let breachList = restBreakRule["breaches"];
    var selectedBreach = breachList.find((item) => {
      let from = item["from"];
      let to = item["to"];
      return (
        totalRestBreakMinutes >= from * 60 && totalRestBreakMinutes <= to * 60
      );
    });
    let from = selectedBreach["from"];
    let to = selectedBreach["to"];
    let description = `${
      type === "nightBreak" ? "Night" : "Continuous"
    } Rest less than ${minutesToHourMinutes(to * 60)}`;
    if (from !== 0) {
      description += ` and greater than ${minutesToHourMinutes(from * 60)}`;
    }
    return {
      level: selectedBreach["level"],
      type,
      description,
    };
  }

  _calculateMaxWorkBreach() {
    let { totalWork, periodType, totalPeriod, periodTime, lastEvent } = this.checklistItem;
    let { startTime: newEventStartTime } = this.event;

    // Calculate only when last event is 'work' 
    if(lastEvent === 'rest') return [];

    var rule = this.ruleSets.find((rule) => rule["period"] / 60 === periodType);
    var maximumWorkTime = rule["work"][0]["maximumWorkTime"];
    
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
    let breachInstant = lastestTime.clone().subtract(exceededMinutes, "minutes");

    console.log("EXCEEDED MINUTES", exceededMinutes);
    console.log("lastet time", lastestTime)

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

    // return breach included checklist item
    maxWorkBreaches.push(this.checklistItem);
    return maxWorkBreaches;
  }

  __pushOrReplace(checklistItem, breach){
    let idx = checklistItem.breach.breaches.findIndex(item => item['type'] === breach['type']);
    if(idx === -1) {
      checklistItem.breach["breaches"].push(breach);
    } else {
      checklistItem.breach["breaches"][idx] = breach;
    }
  }

  __calculateContinuousMinutesBreach() {
    let continuousMinutesBreaches = [];
    let { periodType } = this.checklistItem;
    // fetch rule for the period
    var rule = this.ruleSets.find((rule) => rule["period"] / 60 === periodType);
    var restBreakRules = rule["rest"];

    restBreakRules.forEach((restBreakRule) => {
      console.log("CONTINUOUS BREAK MINUTES CALCULATION ");
      if (restBreakRule["continuousBreak"]) {
        var ruleEquivalentContinuousBreakCount =
          this.___calculateRuleEquivalentContinuousBreakCount(
            this.checklistItem["breaks"]["continuousBreaks"],
            restBreakRule["continuousBreak"] * 60
          );

        // var ruleBreaksCount =
        //   restBreakRule["restBreak"]["minimumTime"] /
        //   restBreakRule["restBreak"]["continuousBreak"];

        var ruleBreaksCount = 1;

        if (ruleEquivalentContinuousBreakCount < ruleBreaksCount) {
            // find largest rest time
            var maxRestTime = this.checklistItem["breaks"][
              "continuousBreaks"
            ].sort(
              (left, right) =>
                right["continuousMinutes"] - left["continuousMinutes"]
            )[0]["continuousMinutes"];
            console.log("MAX REST TIME", maxRestTime);
            // breach encountered
            // calculate severeity based on aggregated break minutes
            console.log("CATEGORIZING REST BREACHES......");
            let breach = this.___categorizecontinuousStationaryBreakBreach(
              maxRestTime,
              restBreakRule,
              "continuousBreak"
            );
            console.log("REST BREACH CALCULATED: ", breach);
          continuousMinutesBreaches.push({
            ...this.checklistItem,
            breaches: [...this.checklistItem.breaches, breach],
          });
        }
      }
    });
    return continuousMinutesBreaches;
  }

  __calculateNightRestBreaches() {
    let nightRestBreaches = [];
    let { periodType, breaks } = this.checklistItem;
    let { nightBreaks } = breaks;
    // fetch rule for the period
    var rule = this.ruleSets.find((rule) => rule["period"] / 60 === periodType);
    var restBreakRules = rule["rest"];

    restBreakRules.forEach((restBreakRule) => {
      console.log("NIGHT REST BREAK MINUTES CALCULATION ");
      if (restBreakRule["nightBreaks"]) {
        let requiredNumberOfBreaks = restBreakRule["nightBreaks"];

        let validNightBreaks = nightBreaks.filter(
          (brk) => brk["continuousMinutes"] >= 7 * 60
        );

        console.log("night breaks", JSON.stringify(nightBreaks));

        if (validNightBreaks.length < requiredNumberOfBreaks) {
          // breach occured
          // find the longest night rest break
          let invalidNightBreaks = nightBreaks.filter(
            (brk) => brk["continuousMinutes"] < 7 * 60
          );

          var maxRestTime = invalidNightBreaks.sort(
            (left, right) =>
              right["continuousMinutes"] - left["continuousMinutes"]
          )[0]["continuousMinutes"];

          let breach = this.___categorizecontinuousStationaryBreakBreach(
            maxRestTime,
            restBreakRule,
            "nightBreak"
          );
          console.log("NIGHT REST BREACH CALCULATED: ", breach);
          nightRestBreaches.push({
            ...this.checklistItem,
            breaches: [...this.checklistItem.breaches, breach],
          });
        }
      }
    });
    return nightRestBreaches;
  }

  __calculateConsecutiveNightRestBreaches() {
    let consecutiveNightBreaches = [];
    let { periodType, breaks } = this.checklistItem;
    let { consecutiveNightBreaks } = breaks;
    // fetch rule for the period
    var rule = this.ruleSets.find((rule) => rule["period"] / 60 === periodType);
    var restBreakRules = rule["rest"];

    restBreakRules.forEach((restBreakRule) => {
      console.log("CONSECUTIVE NIGHT REST BREAK MINUTES CALCULATION ");
      if (restBreakRule["consecutiveNightBreaks"] > 0) {
        if (consecutiveNightBreaks < restBreakRule["consecutiveNightBreaks"]) {
          // breach occured
          let breach = {
            type: "consecutive night breaks",
          };
          console.log("CONSECUTIVE NIGHT REST BREACH CALCULATED: ", breach);
          consecutiveNightBreaches.push({
            ...this.checklistItem,
            breaches: [...this.checklistItem.breaches, breach],
          });
        }
      }
    });
    return consecutiveNightBreaches;
  }

  _calculateRestBreach() {
    let { totalPeriod, periodType, maxMinutes } = this.checklistItem;

    // Check if totalPeriod exceeds RULE PERIOD
    if (totalPeriod < periodType * 60) {
      console.log(
        `No rest breach calculation required => Since checklist totalPeriod(${totalPeriod}) < PeriodType(${
          periodType * 60
        }) i.e. Period Doesnt exceed`
      );
      return [];
      // TODO: estimation of rest hour breaches
    }

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
