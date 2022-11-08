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
// function __calculateNightDuration(lastEventTime, newEventStartTime) {
//   let nightBreaks = [];
//   let morningStart = lastEventTime.clone().set({ h: 0, m: 0, s: 0 });
//   let morningEnd = lastEventTime.clone().set({ h: 8, m: 0, s: 0 });

//   if (lastEventTime.isBetween(morningStart, morningEnd, null, [])) {
//     let start = lastEventTime;
//     let end = newEventStartTime.isAfter(morningEnd)
//       ? morningEnd
//       : newEventStartTime;
//     let duration = end.diff(start, "minutes");
//     // push to nightbreaks
//     nightBreaks.push({
//       continuousMinutes: duration,
//       hour: duration / 60,
//       start,
//       end,
//     });
//   }

//   do {
//     let nightStart = lastEventTime.clone().set({ h: 22, m: 0, s: 0 });
//     let nightEnd = lastEventTime
//       .clone()
//       .add(1, "days")
//       .clone()
//       .set({ h: 08, m: 0, s: 0 });

//     let start = lastEventTime.isBefore(nightStart) ? nightStart : lastEventTime;

//     let end = newEventStartTime.isBefore(nightStart)
//       ? nightStart
//       : newEventStartTime;
//     end = newEventStartTime.isAfter(nightEnd) ? nightEnd : end;

//     let duration = end.diff(start, "minutes");
//     if (duration > 0) {
//       // add duration to checklist
//       nightBreaks.push({
//         continuousMinutes: duration,
//         endTimes: [end],
//       });
//       lastEventTime = nightEnd.clone().set({ h: 22, m: 0, s: 0 });
//     }
//     if (duration === 0) break;
//   } while (lastEventTime.isBefore(newEventStartTime));
//   return nightBreaks;
// }

// let lastEventTime = new moment().set({ h: 23, m: 0, s: 0 });
// let newEventStartTime = lastEventTime
//   .clone()
//   .add(5, "days")
//   .set({ h: 10, m: 0, s: 0 });

// let nightBreaks = __calculateNightDuration(lastEventTime, newEventStartTime);
// console.log("start", lastEventTime);
// console.log("end", newEventStartTime);
// console.log("NightBreaks", nightBreaks);

// const test = (arr) => {
//   let sorted_arr = arr.sort((left, right) =>
//     moment.utc(left).diff(moment.utc(right))
//   );
//   let result = [[sorted_arr[0]]];
//   let j = 0;
//   for (let i = 1; i < arr.length; i++) {
//     var date = sorted_arr[i];
//     var prev_date = sorted_arr[i - 1];

//     if (date.diff(prev_date, 'days') > 1) {
//       j++;
//       result.push([date]);
//     } else {
//       result[j].push(date);
//     }
//   }
//   return result;
// };

// const arr = [
//   new moment(),
//   new moment().add(1, "days"),
//   new moment().add(2, "days"),
//   new moment().add(4, "days"),
//   new moment().add(5, "days"),
// ];
// let result = test(arr);
// let maxCombinations = Math.max(
//   ...result.map((combination) => combination.length)
// );
// console.log(result);
// console.log(maxCombinations)
// let date = new moment();

// function calculateNightBreachInstant(periodTime, numberOfBreaks){
//     let nightStart = periodTime.clone().subtract(1, "days").set({ h: 22, m: 0, s: 0 });
//     let nightEnd = periodTime.clone().set({ h: 8, m: 0, s: 0 });
    
//     let baseTime = periodTime.clone();
//     if(periodTime.isBefore(nightStart.add(7, "hours"))){
//       baseTime = nightEnd.clone().subtract(1, 'days');
//     } else if(periodTime.isAfter(nightEnd.clone())){
//         baseTime = nightEnd.clone();
//     }
//     let breachInstant = baseTime.subtract(numberOfBreaks - 1, 'days')
//                                         .subtract(7, 'hours');
//     return breachInstant;
// }
// let periodTime = new moment().set({h: 21, m: 0, s: 0});
// console.log("Period Time ", periodTime.format("YYYY-MM-DD HH:mm"));
// let breachInstant = calculateNightBreachInstant(periodTime, 1);
// console.log("Breach Instant", breachInstant.format("YYYY-MM-DD HH:mm"));

let events = [
  {
    eventType: "work",
    startTime: moment.parseZone("2018-05-13T14:00+10:00")
  },
  {
      eventType: "rest",
      startTime: moment.parseZone("2018-05-13T16:00+10:00")
  },
  {
      eventType: "work",
      startTime: moment.parseZone("2018-05-15T03:00+10:00")
  },
  {
      eventType: "rest",
      startTime: moment.parseZone("2018-05-15T06:00+10:00")
  }
];
function ___calculateNightBreachInstant(periodTime, numberOfBreaks, ewd) {
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

  // TODO: If this breach instant is in REST state, it should be next workTime that breaks night break 
  let instant = breachInstant.clone();
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

  return breachInstant;
}
let period = moment.parseZone("2018-05-15T05:00+10:00");
let numberOfBreaks = 2;
var breachInstant = ___calculateNightBreachInstant(period, numberOfBreaks, events);
formattedEvents = events.map(event => ({...event, startTime: event.startTime.format("YYYY-MM-DD HH:mm")}));
console.log("Events...", formattedEvents);
console.log("Number of rest breaks", numberOfBreaks)
console.log("Period...............", period.format("YYYY-MM-DD HH:mm"))
console.log("breach instant.......", breachInstant.format("YYYY-MM-DD HH:mm"));