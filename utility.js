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


module.exports = { processEvent, toUtc, minutesToHourMinutes };
