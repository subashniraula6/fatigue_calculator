var minutesToHourMinutes = require("./utility")["minutesToHourMinutes"];

class BreachCalculation {
  constructor(checklistItem, ruleSets) {
    this.checklistItem = checklistItem;
    this.ruleSets = ruleSets;
  }

  ___calculateRuleEquivalentContinuousBreakCount(
    checklistContinuousBreaks,
    ruleContinuousBreak
  ) {
    let ruleEquivalentContinuousBreakCount = 0;
    checklistContinuousBreaks.forEach((contdBrk) => {
      if (contdBrk["continuousMinutes"] > ruleContinuousBreak) {
        ruleEquivalentContinuousBreakCount +=
          parseInt(contdBrk["continuousMinutes"] / ruleContinuousBreak) *
          contdBrk["count"];
      } else if (contdBrk["continuousMinutes"] === ruleContinuousBreak) {
        ruleEquivalentContinuousBreakCount += contdBrk["count"];
      }
    });
    return ruleEquivalentContinuousBreakCount;
  }

  ___categorizecontinuousStationaryBreakBreach(
    totalRestBreakMinutes,
    restBreakRule
  ) {
    let breachList = restBreakRule["breaches"];
    var selectedBreach = breachList.find((item) => {
      let from = item["from"];
      let to = item["to"];
      return (
        totalRestBreakMinutes >= from * 60 && totalRestBreakMinutes <= to * 60
      );
    });
    console.log("totalRestBreakMinutes", totalRestBreakMinutes);
    console.log("Breachlist", breachList);
    console.log(selectedBreach);
    let from = selectedBreach["from"];
    let to = selectedBreach["to"];
    let description = `Rest less than ${minutesToHourMinutes(to * 60)}`;
    if (from !== 0) {
      description += ` and greater than ${minutesToHourMinutes(from * 60)}`;
    }
    return {
      level: selectedBreach["level"],
      type: "continuousStationaryBreakBreach",
      description,
    };
  }

  _calculateMaxWorkBreach() {
    let { totalWork, totalPeriod, periodType, maxMinutes, periodStart } =
      this.checklistItem;

    // if rule has no work rules
    if (maxMinutes === null) return null;

    // Check if totalPeriod exceeds RULE PERIOD
    if (totalPeriod < periodType * 60) {
      console.log(
        `No breach calculation required => Since checklist totalPeriod(${totalPeriod}) < or maxMinutes(${maxMinutes})`
      );
      return null;
      // TODO: estimation of work hour breaches
    }

    console.log(
      "Period exceeded.... For checklist period => " +
        periodType +
        " & start time => " +
        periodStart.format("YYYY-MM-DD HH:mm")
    );

    //CHECK IF NOBREACH
    if (totalWork <= maxMinutes) {
      console.log(
        `No Max Work Breach since checklist total work(${totalWork}) is less than or equal to max minutes(${maxMinutes})`
      );
      return null;
    }

    // fetch rule for the period
    var rule = this.ruleSets.find((rule) => rule["period"] / 60 === periodType);
    var maximumWorkBreachRule = rule["work"][0]["breaches"];

    var selectedBreach = maximumWorkBreachRule.find((item) => {
      let from = item["from"];
      let to = item["to"];
      return totalWork >= from && totalWork <= to;
    });

    // If not in a range
    // Set breach to highest breach range
    if (!selectedBreach) {
      let sortedBreaches = maximumWorkBreachRule.sort(
        (left, right) => right.from - left.from
      );
      let extremeBreach = sortedBreaches[0];
      selectedBreach =
        extremeBreach["from"] <= totalWork ? extremeBreach[0] : null;
    }
    // update breach to checklist item
    let description = null;
    if (selectedBreach) {
      description = `Work more than ${minutesToHourMinutes(
        selectedBreach["from"] - 1
      )}`;
      if (selectedBreach["to"] !== 0) {
        description += ` and less than ${minutesToHourMinutes(
          selectedBreach["to"]
        )}`;
      }
    }
    var breach = {
      level: selectedBreach["level"],
      type: "maxWorkBreach",
      description,
    };
    console.log("MAX WORK BREACH CALCULATED: ", breach);
    return {
      ...this.checklistItem,
      breaches: [...this.checklistItem.breaches, breach],
    };
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
            restBreakRule
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

  // __calculateNightRestBreaches() {
  //   let nightRestBreaches = [];
  //   let { periodType } = this.checklistItem;
  //   // fetch rule for the period
  //   var rule = this.ruleSets.find((rule) => rule["period"] / 60 === periodType);
  //   var restBreakRules = rule["rest"];

  //   restBreakRules.forEach((restBreakRule) => {
  //     console.log("NIGHT REST BREAK MINUTES CALCULATION ");
  //     if (restBreakRule["nightBreaks"]) {
  //       let requiredNumberOfBreaks = restBreakRule["nightBreaks"];

  //     }
  //   });
  // }

  _calculateRestBreach() {
    let restBreaches = [];
    console.log("CALCULATING REST BREACH....");
    let { totalPeriod, periodType, maxMinutes } = this.checklistItem;

    // Check if totalPeriod exceeds RULE PERIOD
    if (totalPeriod < periodType * 60) {
      console.log(
        `No rest breach calculation required => Since checklist totalPeriod(${totalPeriod}) < or maxMinutes(${maxMinutes})`
      );
      return restBreaches;
      // TODO: estimation of rest hour breaches
    }

    // Calculate Continuous Minutes
    let continuousMinutesBreaches = this.__calculateContinuousMinutesBreach();
    restBreaches.push(...continuousMinutesBreaches);

    // // Calculate night rest breaches
    // let nightRestBreaches = this.__calculateNightRestBreaches();
    // restBreaches.push(...nightRestBreaches);

    return restBreaches;
  }
}

module.exports = { BreachCalculation };
