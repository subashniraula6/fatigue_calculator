const moment = require("moment");

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

let event = processEvent({
  eventType: "Work",
  startTime: "2018-05-02T10:00+10:00",
});

// function __createChecklistItem(event, rule) {
//   return {
//     periodType: rule["period"] / 60,
//     periodStart: toUtc(event["startTime"]),
//     totalRest: 0,
//     totalWork: 0,
//     breaks: {
//       continuousBreaks: [],
//       nightBreaks: [],
//       stationaryRest: [],
//       consecutiveNightBreaks: 0,
//     },
//     totalPeriod: 0,
//     maxMinutes: rule["work"].length
//       ? rule["work"][0]["maximumWorkTime"] * 60
//       : null,
//     periodTime: toUtc(event["startTime"]).add({
//       minutes: rule["period"],
//     }),
//     lastEvent: event["eventType"],
//     lastEventTime: toUtc(event["startTime"]),
//     breaches: [],
//   };
// }
// let checklistItem = __createChecklistItem(event, rule);

console.log(event);

let checklist = [
  {
    periodType: 11,
    periodStart: "2018-05-01T17:00:00.000Z",
    totalRest: 390,
    totalWork: 90,
    breaks: {
      continuousBreaks: [
        {
          continuousMinutes: 390,
          count: 1,
          endTimes: [toUtc("2018-05-02T10:00+10:00")],
        },
      ],
      nightBreaks: [],
      stationaryRest: [],
      consecutiveNightBreaks: 0,
    },
    totalPeriod: 480,
    maxMinutes: 600,
    periodTime: "2018-05-02T04:00:00.000Z",
    lastEvent: "rest",
    lastEventTime: "2018-05-02T01:00:00.000Z",
    breaches: [],
  },
];

console.log("checklist", checklist);

let rule = { period: 11, rest: [{ continuousBreak: 390 }] };

let currentChecklistItem = checklist.find((checklistItem) => {
  return (
    checklistItem["breaks"]["continuousBreaks"].findIndex((contdbrk) => {
      let isExists = false;
      contdbrk["endTimes"].forEach((item) => {
        if (
          item.isSame(event["startTime"]) &&
          checklistItem["periodType"] === rule["period"] &&
          contdbrk["continuousMinutes"] >= rule["rest"][0]["continuousBreak"]
        ) {
          isExists = true;
        }
      });
      return isExists;
    }) !== -1
  );
});

console.log("currentChecklistItem", currentChecklistItem);
