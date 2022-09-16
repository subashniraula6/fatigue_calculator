var moment = require("moment");

class TimeCalculation {
  constructor(checklistItem, event) {
    this.checklistItem = checklistItem;
    this.event = event;
  }

  __roundNearest15(duration, eventType) {
    switch (eventType) {
      case "work":
        // Round up to nearest 15 duration
        return Math.ceil(duration / 15) * 15;
        break;
      case "rest":
        return Math.floor(duration / 15) * 15;
        break;
      default:
        break;
    }
  }

  _calculateTotalPeriod() {
    let { startTime: newEventStartTime } = this.event;
    let { totalPeriod, lastEventTime, periodType } = this.checklistItem;

    // TOTAL EVENT INTERVAL TIME CALCULATION
    let totalDuration = moment.duration(newEventStartTime.diff(lastEventTime)); // newEventStartTime - lastEventTime
    totalPeriod += totalDuration.asMinutes();

    // Set total period to period time if period exceeds
    if (totalPeriod > periodType * 60) {
      totalPeriod = periodType * 60;
    }

    // set checklist totalPeriod
    this.checklistItem["totalPeriod"] = totalPeriod;

    return this.checklistItem;
  }

  _calculateWorkTime() {
    let { startTime: newEventStartTime, eventType: newEventType } = this.event;
    let {
      totalWork,
      totalPeriod,
      lastEvent,
      lastEventTime,
      periodType,
      periodTime,
    } = this.checklistItem;

    let workDuration = 0;
    if (lastEvent === "work" && newEventType === 'rest') {
      if (totalPeriod >= periodType * 60) {
        // period exceeds
        workDuration = moment
          .duration(periodTime.diff(lastEventTime))
          .asMinutes();
      } else {
        // period doesnt exceed
        workDuration = moment
          .duration(newEventStartTime.diff(lastEventTime))
          .asMinutes();
      }

      totalWork += workDuration;
    }

    // set total work
    this.checklistItem["totalWork"] = totalWork;

    return this.checklistItem;
  }

  _calculateRestTime() {
    let { startTime: newEventStartTime, eventType: newEventType } = this.event;
    let {
      totalRest,
      totalPeriod,
      lastEvent,
      lastEventTime,
      periodType,
      periodTime,
    } = this.checklistItem;

    let restDuration = 0;
    if (lastEvent === "rest" && newEventType === 'work') {
      // 1. Total rest
      if (totalPeriod > periodType * 60) {
        // period exceeds
        restDuration = moment
          .duration(periodTime.diff(lastEventTime))
          .asMinutes();
      } else {
        // period doesnt exceed
        restDuration = moment
          .duration(newEventStartTime.diff(lastEventTime))
          .asMinutes();
      }

      totalRest += restDuration;

      // set total rest
      this.checklistItem["totalRest"] = totalRest;

      // 1. Continuous Break
      //Check for continuous break
      var roundedDuration = this.__roundNearest15(restDuration, lastEvent);

      var existingBreakIndex = this.checklistItem["breaks"][
        "continuousBreaks"
      ].findIndex(
        (contBreak) => contBreak["continuousMinutes"] === roundedDuration
      );

      if (existingBreakIndex === -1) {
        // push to countinuous breaks
        this.checklistItem["breaks"]["continuousBreaks"].push({
          continuousMinutes: roundedDuration,
          count: 1,
        });
      } else {
        var existingBreak =
          this.checklistItem["breaks"]["continuousBreaks"][existingBreakIndex];
        // increase count
        this.checklistItem["breaks"]["continuousBreaks"][existingBreakIndex] = {
          ...existingBreak,
          count: existingBreak.count + 1,
        };
      }
    }

    return this.checklistItem;
  }
}

module.exports = { TimeCalculation };
