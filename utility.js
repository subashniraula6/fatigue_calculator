function minutesToHourMinutes(totalMinutes) {
  let hour = parseInt(totalMinutes / 60);
  let minutes = totalMinutes % 60;
  return `${hour} hour ${minutes} minutes`;
}

module.exports = { minutesToHourMinutes };
