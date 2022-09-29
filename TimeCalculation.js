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

  __calculateNightDuration(lastEventTime, newEventStartTime) {
    let nightBreaks = [];
    let morningStart = lastEventTime.clone().set({ h: 0, m: 0, s: 0 });
    let morningEnd = lastEventTime.clone().set({ h: 8, m: 0, s: 0 });

    if (lastEventTime.isBetween(morningStart, morningEnd, null, [])) {
      let start = lastEventTime;
      let end = newEventStartTime.isAfter(morningEnd)
        ? morningEnd
        : newEventStartTime;
      let duration = end.diff(start, "minutes");
      let roundedDuration = this.__roundNearest15(
        duration,
        this.checklistItem.lastEvent
      );
      if (roundedDuration >= 7 * 60) {
        // push to nightbreaks
        nightBreaks.push({
          continuousMinutes: duration,
          count: 1,
          endTimes: [newEventStartTime],
        });
      }
    }

    let duration;
    do {
      let nightStart = lastEventTime.clone().set({ h: 22, m: 0, s: 0 });
      let nightEnd = lastEventTime
        .clone()
        .add(1, "days")
        .clone()
        .set({ h: 8, m: 0, s: 0 });

      let start = lastEventTime.isBefore(nightStart)
        ? nightStart
        : lastEventTime;

      let end = newEventStartTime.isBefore(nightStart)
        ? nightStart
        : newEventStartTime;
      end = newEventStartTime.isAfter(nightEnd) ? nightEnd : end;

      duration = end.diff(start, "minutes");
      if (duration > 0) {
        // add duration to checklist
        nightBreaks.push({
          continuousMinutes: duration,
          count: 1,
          endTimes: [newEventStartTime],
        });
        lastEventTime = nightEnd.clone().set({ h: 22, m: 0, s: 0 });
      }
      if (duration === 0) break;
    } while (lastEventTime.isBefore(newEventStartTime));
    return nightBreaks;
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
    if (lastEvent === "work" && newEventType === "rest") {
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
    this.__calculateContinuousRestTimes();
    this.__calculateNightRestTimes();

    return this.checklistItem;
  }

  __calculateContinuousRestTimes() {
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
    if (lastEvent === "rest" && newEventType === "work") {
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

      var roundedDuration = this.__roundNearest15(restDuration, lastEvent);
      this.__addBreaksToChecklist(roundedDuration, "continuousBreaks");
    }
  }

  __calculateNightRestTimes() {
    let { startTime: newEventStartTime, eventType: newEventType } = this.event;
    let { totalPeriod, lastEvent, lastEventTime, periodType, periodTime } =
      this.checklistItem;

    if (lastEvent === "rest" && newEventType === "work") {
      if (totalPeriod > periodType * 60) {
        // period exceeds
        let nightBreaks = this.__calculateNightDuration(
          lastEventTime,
          periodTime
        );
        nightBreaks.forEach((brk) => {
          let roundedDuration = this.__roundNearest15(
            brk["continuousMinutes"],
            lastEvent
          );
          this.__addBreaksToChecklist(roundedDuration, "nightBreaks");
        });
      } else {
        // period doesnt exceed
        let nightBreaks = this.__calculateNightDuration(
          lastEventTime,
          newEventStartTime
        );
        nightBreaks.forEach((brk) => {
          let roundedDuration = this.__roundNearest15(
            brk["continuousMinutes"],
            lastEvent
          );
          this.__addBreaksToChecklist(roundedDuration, "nightBreaks");
        });
      }
    }
  }

  __addBreaksToChecklist(duration, restType) {
    let { startTime: newEventStartTime } = this.event;
    var existingBreakIndex = this.checklistItem["breaks"][restType].findIndex(
      (contBreak) => contBreak["continuousMinutes"] === duration
    );

    if (existingBreakIndex === -1) {
      // push to countinuous breaks
      this.checklistItem["breaks"][restType].push({
        continuousMinutes: duration,
        count: 1,
        endTimes: [newEventStartTime],
      });
    } else {
      var existingBreak =
        this.checklistItem["breaks"][restType][existingBreakIndex];
      // increase count
      this.checklistItem["breaks"][restType][existingBreakIndex] = {
        ...existingBreak,
        count: existingBreak.count + 1,
        endTimes: [
          ...this.checklistItem["breaks"][restType][existingBreakIndex][
            "endTimes"
          ],
          newEventStartTime,
        ],
      };
    }
  }
}

module.exports = { TimeCalculation };
