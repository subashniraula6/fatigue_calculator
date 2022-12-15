const moment = require("moment");

// Pre-processing dataset
function processEvent(event) {
  return {
    ...event,
    eventType: event.eventType.toLowerCase(),
    startTime: toUtc(event.startTime),
  };
}

// Convert to utc datetime
function toUtc(datetime) {
  let offset = datetime.toString().slice(16);
  var utcDateTime = new moment.utc(datetime).utcOffset(offset);
  return utcDateTime;
}

function minutesToHourMinutes(totalMinutes) {
  let hour = parseInt(totalMinutes / 60);
  let minutes = totalMinutes % 60;
  return `${hour} hour ${minutes} minutes`;
}

// Check if checklist period exceeds
function isPeriodExceeded(checklistItem){
  if(checklistItem.totalPeriod / 60 >= checklistItem.periodType){
    return true;
  } else {
    return false;
  }
}

// Fetch rule
function fetchRule(checklistItem, ruleSets) {
  return ruleSets.find(
    (rule) => rule["period"] / 60 === checklistItem["periodType"]
  );
}

// Deep clone checklist
function cloneChecklist(checklist) {
  return checklist.map(checklistItem => {
    let clonedChecklistItem = {}
    for(const item in checklistItem){
      let key = item;
      let value = checklistItem[key];
      switch (item) {
        case 'periodStart':
        case 'periodTime':
        case 'lastEventTime':
          clonedChecklistItem[item] = value.clone();
          break;
        
        case 'breaks':
          clonedChecklistItem[item] = {
            ...value,
            continuousBreaks: 
              value.continuousBreaks.map(brk => ({...brk, endTimes: brk.endTimes.map(time => time.clone())})),
            nightBreaks: 
              value.nightBreaks.map(brk => ({...brk, endTimes: brk.endTimes.map(time => time.clone())}))
          };
          break;
          
        case 'event':
          clonedChecklistItem[item] = {
            ...value,
            startTime: value.startTime.clone() 
          };
          break;
          
        default:
          clonedChecklistItem[item] = value;
          break;
      }
    }
    return clonedChecklistItem;
  })
}

module.exports = { processEvent, toUtc, minutesToHourMinutes, isPeriodExceeded, fetchRule, cloneChecklist };
