var minutesToHourMinutes = require("./utility")["minutesToHourMinutes"];

class BreachCalculation {
  constructor(checklistItem, ruleSets) {
    this.checklistItem = checklistItem;
    this.ruleSets = ruleSets;
  }

  __calculateRuleEquivalentContinuousBreakMinutes(
    checklistContinuousBreaks,
    ruleContinuousBreak
  ) {
    let aggregatedBreakMinutes = ruleContinuousBreak;
    let aggregatedBreaksCount = 0;
    checklistContinuousBreaks.forEach((contdBrk) => {
      if (contdBrk["continuousMinutes"] > ruleContinuousBreak) {
        aggregatedBreaksCount +=
          parseInt(contdBrk["continuousMinutes"] / ruleContinuousBreak) *
          contdBrk["count"];
      } else if (contdBrk["continuousMinutes"] === ruleContinuousBreak) {
        aggregatedBreaksCount += contdBrk["count"];
      }
    });
    return {
      aggregatedBreakMinutes,
      aggregatedBreaksCount,
    };
  }

  __categorizecontinuousStationaryBreakBreach(
    totalRestBreakMinutes,
    restBreakRule
  ) {
    let breachList = restBreakRule["breachList"];
    for (let breachSeverity in breachList) {
      let breachSeverityType = breachSeverity;
      let breaches = breachList[breachSeverity][0];
      for (let restBreachType in breaches) {
        if (restBreachType === "continuousStationaryBreakBreach") {
          let range = breaches[restBreachType];
          let from = range["from"];
          let to = range["to"];
          if (totalRestBreakMinutes < from && totalRestBreakMinutes >= to) {
            let description = `Rest less than ${minutesToHourMinutes(from)}`;
            if (to !== 0) {
              description += ` and greater than ${minutesToHourMinutes(to)}`;
            }
            return {
              severity: breachSeverityType,
              type: restBreachType,
              description,
            };
          }
        }
      }
    }
  }

  _calculateMaxWorkBreach() {
    let { totalWork, totalPeriod, periodType, maxMinutes } = this.checklistItem;
    // Check if totalPeriod exceeds RULE PERIOD
    if (totalPeriod < periodType * 60) {
      console.log(
        `No breach calculation required => Since checklist totalPeriod(${totalPeriod}) < or maxMinutes(${maxMinutes})`
      );
      return null;
      // TODO: estimation of work hour breaches
    }

    console.log("Period exceeded....");

    //CHECK IF NOBREACH
    if (totalWork <= maxMinutes) {
      console.log(
        `No Max Work Breach since checklist total work(${totalWork}) is less than or equal to max minutes(${maxMinutes})`
      );
      return null;
    }

    // fetch rule for the period
    var rule = this.ruleSets[0]["rules"].find(
      (rule) => rule["period"] / 60 === periodType
    );
    var maximumWorkBreachRule = rule["maximumWorkBreach"];

    var arr = Object.entries(maximumWorkBreachRule);
    var selectedBreach = arr.find((a) => {
      let from = a[1]["from"];
      let to = a[1]["to"];
      return totalWork >= from && totalWork <= to;
    });

    // If not in a range
    // Set breach to highest breach range
    if (!selectedBreach) {
      let sortedBreaches = arr.sort(
        (left, right) => right[1].from - left[1].from
      );
      selectedBreach = sortedBreaches[0];
    }
    // update breach to checklist item
    let description = null;
    if (selectedBreach) {
      description = `Work more than ${minutesToHourMinutes(selectedBreach[1]["from"])}`;
      if (selectedBreach[1]["to"] !== 0) {
        description += ` and less than ${minutesToHourMinutes(
          selectedBreach[1]["to"]
        )}`;
      }
    }
    var breach = {
      severity: selectedBreach[0],
      type: "maxWorkBreach",
      description,
    };
    return {
      ...this.checklistItem,
      breach
    };
  }

  _calculateRestBreach() {
    console.log("CALCULATING REST BREACH....");
    let { totalPeriod, periodType, maxMinutes } = this.checklistItem;
    // Check if totalPeriod exceeds RULE PERIOD
    if (totalPeriod < periodType * 60) {
      console.log(
        `No rest breach calculation required => Since checklist totalPeriod(${totalPeriod}) < or maxMinutes(${maxMinutes})`
      );
      return null;
      // TODO: estimation of rest hour breaches
    }

    // fetch rule for the period
    var rule = this.ruleSets[0]["rules"].find(
      (rule) => rule["period"] / 60 === periodType
    );
    var restBreakRule = rule["break"][0];

    // Rest break rules
    // 1. Min rest break
    // var totalRestBreak = 0;
    // checklistItem["breaks"]["continuousBreaks"].forEach((contdBrk) => {
    //   totalRestBreak += contdBrk["continuousMinutes"] * contdBrk["count"];
    // });
    // if (totalRestBreak < restBreakRule["restBreak"]["minimumTime"]) {
    //   // categorize breach
    //   let breach = ____categorizeRestBreach(totalRestBreak, restBreakRule);
    //   function ____categorizeRestBreach(totalRestBreak, restBreakRule) {
    //     let breachList = restBreakRule["breachList"];
    //     for (let breachSeverity in breachList) {
    //       let breachSeverityType = breachSeverity;
    //       let breaches = breachList[breachSeverity][0];
    //       for (let restBreachType in breaches) {
    //         if (restBreachType === "restBreakBreach") {
    //           let range = breaches[restBreachType];
    //           let from = range["from"];
    //           let to = range["to"];

    //           if (totalRestBreak >= from && totalRestBreak <= to) {
    //             return {
    //               severity: breachSeverityType,
    //               type: restBreachType,
    //             };
    //           }
    //         }
    //       }
    //     }
    //   }
    //   checklistItem["restBreaches"].push(breach);
    // }

    // 2. Continuous minutes
    console.log("CONTINUOUS BREAK MINUTES CALCULATION ");
    var ruleEquivalentContinuousBreakMinutes =
      this.__calculateRuleEquivalentContinuousBreakMinutes(
        this.checklistItem["breaks"]["continuousBreaks"],
        restBreakRule["restBreak"]["continuousBreak"]
      );

    var ruleBreaksCount =
      restBreakRule["restBreak"]["minimumTime"] /
      restBreakRule["restBreak"]["continuousBreak"];

    var { aggregatedBreakMinutes, aggregatedBreaksCount } =
      ruleEquivalentContinuousBreakMinutes;

    if (aggregatedBreaksCount < ruleBreaksCount) {
      // find largest rest time
      var maxRestTime = this.checklistItem["breaks"]["continuousBreaks"].sort(
        (left, right) => right["continuousMinutes"] - left["continuousMinutes"]
      )[0]["continuousMinutes"];
      console.log("MAX REST TIME", maxRestTime);
      // breach encountered
      // calculate severeity based on aggregated break minutes
      console.log("CATEGORIZING REST BREACHES......");
      let breach = this.__categorizecontinuousStationaryBreakBreach(
        maxRestTime,
        restBreakRule
      );
      console.log("REST BREACH CALCULATED: ", breach);
      return { ...this.checklistItem, breach };
    } else return null;
  }
}

module.exports = { BreachCalculation };
