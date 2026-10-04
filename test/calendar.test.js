import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCalendar, calendarEligible, calendarReady, eventLines, validCalendarDate } from '../public/calendar.js';

const base = { title: 'Picnic', date: '2026-10-11', time: '09:30', durationMinutes: 60, allDay: false, reviewed: true, type: 'event', status: 'confirmed', evidence: [{ source_line: 2, source_quote: 'Sunday at 9:30 is confirmed.' }] };

test('only reviewed, dated, confirmed event items can become VEVENTs', () => {
  assert.equal(calendarEligible(base), true);
  for (const change of [
    { reviewed: false }, { type: 'task' }, { type: 'question' }, { status: 'proposed' },
    { status: 'unclear' }, { status: 'cancelled' }, { status: 'superseded' }, { date: '' }, { date: 'not-a-date' },
  ]) assert.equal(calendarEligible({ ...base, ...change }), false, JSON.stringify(change));
  assert.equal(eventLines({ ...base, type: 'task' }, 0).length, 0);
});

test('calendar rejects impossible dates, invalid times, and hidden durations', () => {
  assert.equal(validCalendarDate('2026-02-31'), false);
  assert.equal(validCalendarDate('2028-02-29'), true);
  assert.equal(calendarReady({ ...base, date: '2026-02-31' }), false);
  assert.equal(calendarReady({ ...base, time: '', durationMinutes: 60 }), false);
  assert.equal(calendarReady({ ...base, time: '', allDay: true }), true);
  assert.equal(calendarReady({ ...base, durationMinutes: 0 }), false);
});

test('calendar uses the visible editable duration and rolls over midnight', () => {
  const calendar = buildCalendar([base], '2026-10-03T12:00:00.000Z');
  assert.match(calendar, /BEGIN:VEVENT/);
  assert.match(calendar, /DTSTART;TZID=Asia\/Kolkata:20261011T093000/);
  assert.match(calendar, /DTEND;TZID=Asia\/Kolkata:20261011T103000/);
  assert.match(calendar, /Line 2: Sunday at 9:30 is confirmed/);
  const overnight = buildCalendar([{ ...base, date: '2026-10-11', time: '23:30', durationMinutes: 90 }]);
  assert.match(overnight, /DTEND;TZID=Asia\/Kolkata:20261012T010000/);
});

test('explicit all-day selection creates an all-day event', () => {
  const calendar = buildCalendar([{ ...base, allDay: true, time: '', durationMinutes: 60 }]);
  assert.match(calendar, /DTSTART;VALUE=DATE:20261011/);
  assert.match(calendar, /DTEND;VALUE=DATE:20261012/);
});

test('calendar text escapes line breaks and delimiters', () => {
  const calendar = buildCalendar([{ ...base, title: 'Picnic;\nATTENDEE:attacker@example.com' }]);
  assert.match(calendar, /SUMMARY:Picnic\\;\\nATTENDEE:attacker@example.com/);
});

test('tasks and proposed or unclear plans are never included in calendar output', () => {
  const items = [
    { ...base, type: 'task', title: 'Bring sandwiches' },
    { ...base, status: 'proposed', title: 'Maybe picnic' },
    { ...base, status: 'unclear', title: 'Unclear picnic' },
    { ...base, status: 'cancelled', title: 'Cancelled picnic' },
    { ...base, status: 'superseded', title: 'Replaced picnic' },
  ];
  assert.equal(buildCalendar(items), '');
});
