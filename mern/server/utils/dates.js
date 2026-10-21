// Shop owners think in local calendar months, the server may run in UTC.
// TZ_OFFSET_MINUTES: minutes ahead of UTC (Pakistan = 300).
const OFFSET = Number(process.env.TZ_OFFSET_MINUTES ?? 300);

// [start, end) of a local calendar month, as real instants
function monthRange(year, month) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1) - OFFSET * 60000),
    end: new Date(Date.UTC(year, month, 1) - OFFSET * 60000),
  };
}

// local {year, month, day} of an instant
function localParts(date) {
  const d = new Date(new Date(date).getTime() + OFFSET * 60000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

// 'YYYY-MM-DD' (or Date) -> UTC midnight of that calendar day (timezone-safe key for attendance/advances)
function toDay(date) {
  const str = typeof date === 'string' ? date.slice(0, 10) : new Date(date).toISOString().slice(0, 10);
  const [y, m, d] = str.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// UTC range for a calendar month of "day keyed" records
function dayRange(year, month) {
  return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
}

const daysInMonth = (year, month) => new Date(year, month, 0).getDate();

module.exports = { monthRange, localParts, toDay, dayRange, daysInMonth, OFFSET };
