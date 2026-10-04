function icsEscape(text) { return text.replace(/\\/g, '\\\\').replace(/\r\n?/g, '\n').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
function calendarDate(day) { return day.replaceAll('-', ''); }
function nextDay(day) { const date = new Date(`${day}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10); }

export function calendarEligible(item) {
  return item.reviewed === true && calendarReady(item);
}

export function validCalendarDate(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const [year, month, dateOfMonth] = day.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, dateOfMonth));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === dateOfMonth;
}

export function calendarReady(item) {
  if (!item || item.type !== 'event' || item.status !== 'confirmed' || !validCalendarDate(item.date)) return false;
  if (item.allDay === true) return true;
  return Boolean(item.time && /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)
    && Number.isInteger(item.durationMinutes) && item.durationMinutes >= 5 && item.durationMinutes <= 1440);
}

export function eventLines(item, index, stamp = new Date().toISOString()) {
  if (!calendarEligible(item)) return [];
  let start, end;
  if (!item.allDay && item.time && /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)) {
    const [hour, minute] = item.time.split(':').map(Number);
    const endMinutes = hour * 60 + minute + item.durationMinutes;
    start = `DTSTART;TZID=Asia/Kolkata:${calendarDate(item.date)}T${item.time.replace(':', '')}00`;
    const endDate = endMinutes >= 1440 ? nextDay(item.date) : item.date;
    const hh = String(Math.floor((endMinutes % 1440) / 60)).padStart(2, '0');
    const mm = String(endMinutes % 60).padStart(2, '0');
    end = `DTEND;TZID=Asia/Kolkata:${calendarDate(endDate)}T${hh}${mm}00`;
  } else {
    start = `DTSTART;VALUE=DATE:${calendarDate(item.date)}`;
    end = `DTEND;VALUE=DATE:${calendarDate(nextDay(item.date))}`;
  }
  const evidence = (item.evidence || []).map(span => `Line ${span.source_line}: ${span.source_quote}`).join(' | ');
  const dtstamp = stamp.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return ['BEGIN:VEVENT', `UID:pakka-${dtstamp}-${index}@local`, `DTSTAMP:${dtstamp}`, start, end, `SUMMARY:${icsEscape(item.title || 'Group plan')}`, `DESCRIPTION:${icsEscape(evidence)}`, 'END:VEVENT'];
}

export function buildCalendar(items, stamp = new Date().toISOString()) {
  const selected = items.filter(calendarEligible);
  if (!selected.length) return '';
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Pakka//Reviewed Plan//EN', 'CALSCALE:GREGORIAN', ...selected.flatMap((item, index) => eventLines(item, index, stamp)), 'END:VCALENDAR'].join('\r\n') + '\r\n';
}
