const moment = require("moment");

// // Convert to utc datetime
// function toUtc(datetime) {
//   let offset = datetime.toString().slice(16);
//   var utcDateTime = new moment.utc(datetime).utcOffset(offset);
//   return utcDateTime;
// }

// // Pre-processing dataset
// function processEvent(event) {
//   return {
//     ...event,
//     eventType: event.eventType.toLowerCase(),
//     startTime: toUtc(event.startTime),
//   };
// }

// let event = processEvent({
//   eventType: "Work",
//   startTime: "2018-05-02T10:00+10:00",
// });

// // function __createChecklistItem(event, rule) {
// //   return {
// //     periodType: rule["period"] / 60,
// //     periodStart: toUtc(event["startTime"]),
// //     totalRest: 0,
// //     totalWork: 0,
// //     breaks: {
// //       continuousBreaks: [],
// //       nightBreaks: [],
// //       stationaryRest: [],
// //       consecutiveNightBreaks: 0,
// //     },
// //     totalPeriod: 0,
// //     maxMinutes: rule["work"].length
// //       ? rule["work"][0]["maximumWorkTime"] * 60
// //       : null,
// //     periodTime: toUtc(event["startTime"]).clone().add({
// //       minutes: rule["period"],
// //     }),
// //     lastEvent: event["eventType"],
// //     lastEventTime: toUtc(event["startTime"]),
// //     breaches: [],
// //   };
// // }
// // let checklistItem = __createChecklistItem(event, rule);

// console.log(event);

// let checklist = [
//   {
//     periodType: 11,
//     periodStart: "2018-05-01T17:00:00.000Z",
//     totalRest: 390,
//     totalWork: 90,
//     breaks: {
//       continuousBreaks: [
//         {
//           continuousMinutes: 390,
//           count: 1,
//           endTimes: [toUtc("2018-05-02T10:00+10:00")],
//         },
//       ],
//       nightBreaks: [],
//       stationaryRest: [],
//       consecutiveNightBreaks: 0,
//     },
//     totalPeriod: 480,
//     maxMinutes: 600,
//     periodTime: "2018-05-02T04:00:00.000Z",
//     lastEvent: "rest",
//     lastEventTime: "2018-05-02T01:00:00.000Z",
//     breaches: [],
//   },
// ];

// console.log("checklist", checklist);

// let rule = { period: 11, rest: [{ continuousBreak: 390 }] };

// let currentChecklistItem = checklist.find((checklistItem) => {
//   return (
//     checklistItem["breaks"]["continuousBreaks"].findIndex((contdbrk) => {
//       let isExists = false;
//       contdbrk["endTimes"].forEach((item) => {
//         if (
//           item.isSame(event["startTime"]) &&
//           checklistItem["periodType"] === rule["period"] &&
//           contdbrk["continuousMinutes"] >= rule["rest"][0]["continuousBreak"]
//         ) {
//           isExists = true;
//         }
//       });
//       return isExists;
//     }) !== -1
//   );
// });

// console.log("currentChecklistItem", currentChecklistItem);

///////////////////////////////////////////////////////////////
function __calculateNightDuration(lastEventTime, newEventStartTime) {
  let nightBreaks = [];
  let morningStart = lastEventTime.clone().set({ h: 0, m: 0, s: 0 });
  let morningEnd = lastEventTime.clone().set({ h: 8, m: 0, s: 0 });

  if (lastEventTime.isBetween(morningStart, morningEnd, null, [])) {
    let start = lastEventTime;
    let end = newEventStartTime.isAfter(morningEnd)
      ? morningEnd
      : newEventStartTime;
    let duration = end.diff(start, "minutes");
    // push to nightbreaks
    nightBreaks.push({
      continuousMinutes: duration,
      hour: duration / 60,
      start,
      end,
    });
  }

  do {
    let nightStart = lastEventTime.clone().set({ h: 22, m: 0, s: 0 });
    let nightEnd = lastEventTime
      .clone()
      .add(1, "days")
      .clone()
      .set({ h: 08, m: 0, s: 0 });

    let start = lastEventTime.isBefore(nightStart) ? nightStart : lastEventTime;

    let end = newEventStartTime.isBefore(nightStart)
      ? nightStart
      : newEventStartTime;
    end = newEventStartTime.isAfter(nightEnd) ? nightEnd : end;

    let duration = end.diff(start, "minutes");
    if (duration > 0) {
      // add duration to checklist
      nightBreaks.push({
        continuousMinutes: duration,
        hour: duration / 60,
        start,
        end,
      });
      lastEventTime = nightEnd.clone().set({ h: 22, m: 0, s: 0 });
    }
    if (duration === 0) break;
  } while (lastEventTime.isBefore(newEventStartTime));
  return nightBreaks;
}

let lastEventTime = new moment().set({ h: 9, m: 0, s: 0 });
let newEventStartTime = lastEventTime
  .clone()
  .add(1, "days")
  .set({ h: 23, m: 0, s: 0 });

let nightBreaks = __calculateNightDuration(lastEventTime, newEventStartTime);
console.log("start", lastEventTime);
console.log("end", newEventStartTime);
console.log("NightBreaks", nightBreaks);
