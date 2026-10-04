import { buildCalendar, calendarReady } from './calendar.js';

const el = id => document.getElementById(id);
const sample = `Riya: Are we still doing the Cubbon Park picnic this Sunday?
Arjun: I might be stuck at work. Don't count me in yet.
Meera: Sunday 11 October works for me. I can bring sandwiches.
Riya: Great, let's meet at the Cubbon Park Metro gate at 9:30 AM on Sunday 11 October.
Meera: Confirmed. I'll bring sandwiches for four.
Arjun: Okay, my shift got cancelled. I'm in. I'll bring water.
Riya: Who is getting the picnic mat?
Meera: Maybe Karan has one, but I haven't asked him.
Arjun: Wait, is the Metro gate the north entrance or the other one?`;
let items = [];

const dateParts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
const part = type => dateParts.find(p => p.type === type).value;
el('today').value = `${part('year')}-${part('month')}-${part('day')}`;
fetch('/api/config').then(r => r.json()).then(config => { el('cloud-option').hidden = !config.cloudAvailable; });
el('sample').addEventListener('click', () => { el('name').value = 'Riya'; el('chat').value = sample; el('message').textContent = 'Synthetic sample loaded. Replace it with a real conversation for the challenge story.'; });

function addText(parent, tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  parent.append(node);
  return node;
}

function addInput(parent, label, value, type, onChange) {
  const wrapper = document.createElement('label');
  wrapper.textContent = label;
  const input = document.createElement('input');
  input.type = type;
  input.value = value;
  input.addEventListener('input', event => onChange(event.target.value));
  wrapper.append(input);
  parent.append(wrapper);
}

function render(data) {
  items = data.items.map(item => ({ ...item, reviewed: false, allDay: false, durationMinutes: 60 }));
  el('results').hidden = false;
  el('summary').textContent = data.summary || `${items.length} potential plan items found.`;
  const eventCards = el('event-cards');
  const taskCards = el('task-cards');
  eventCards.replaceChildren(); taskCards.replaceChildren();
  items.forEach((item, index) => {
    const isCalendarCandidate = item.type === 'event';
    const cards = isCalendarCandidate ? eventCards : taskCards;
    const card = document.createElement('article'); card.className = 'card';
    const top = document.createElement('div'); top.className = 'card-top';
    addText(top, 'span', item.status, `pill ${item.status}`);
    addText(top, 'span', item.type, 'type-label');
    addText(top, 'h3', item.title);
    card.append(top);
    addText(card, 'p', item.reason || 'Review this against the conversation.');
    (item.evidence || []).forEach((span, spanIndex) => addText(card, 'div', `${item.evidence.length > 1 ? `Evidence ${spanIndex + 1} · ` : ''}Line ${span.source_line}: “${span.source_quote}”`, 'evidence'));
    const fields = document.createElement('div'); fields.className = 'edit-row';
    const updateField = (field, value) => {
      items[index][field] = value;
      items[index].reviewed = false;
      checkbox.checked = false;
      checkbox.disabled = item.type === 'event' && !calendarReady(items[index]);
      reviewText.textContent = item.type !== 'event'
        ? 'I reviewed this checklist item (never exported to calendar)'
        : checkbox.disabled
          ? 'Set a valid date and time, or explicitly mark all day, before review/export'
          : 'I checked this confirmed event and want it on my calendar';
    };
    addInput(fields, 'Title', item.title, 'text', value => updateField('title', value));
    addInput(fields, 'Date', item.date, 'date', value => updateField('date', value));
    const timeInput = addInput(fields, 'Time', item.time, 'time', value => updateField('time', value));
    const allDayLabel = document.createElement('label');
    const allDayInput = document.createElement('input');
    allDayInput.type = 'checkbox';
    allDayLabel.append(allDayInput, document.createTextNode(' Explicitly all day'));
    allDayInput.addEventListener('change', () => {
      updateField('allDay', allDayInput.checked);
      timeInput.disabled = allDayInput.checked;
      if (allDayInput.checked) updateField('time', '');
    });
    fields.append(allDayLabel);
    const durationInput = addInput(fields, 'Duration (minutes)', 60, 'number', value => updateField('durationMinutes', Number(value)));
    durationInput.min = '5'; durationInput.max = '1440'; durationInput.step = '5';
    durationInput.disabled = allDayInput.checked;
    card.append(fields);
    const review = document.createElement('label'); review.className = 'review';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox';
    checkbox.disabled = item.type === 'event' && !calendarReady(items[index]);
    checkbox.addEventListener('change', event => { items[index].reviewed = event.target.checked; });
    const eligible = calendarReady(items[index]);
    const reviewText = document.createTextNode(item.type !== 'event'
      ? 'I reviewed this checklist item (never exported to calendar)'
      : eligible
        ? 'I checked this confirmed event and want it on my calendar'
        : 'Set a valid date and time, or explicitly mark all day, before review/export');
    review.append(checkbox, reviewText);
    card.append(review);
    cards.append(card);
  });
  const questions = el('questions'); questions.replaceChildren();
  (data.questions.length ? data.questions : ['Nothing else flagged. Check the source messages yourself before relying on this plan.']).forEach(q => addText(questions, 'li', q));
  el('rejected').textContent = data.rejected.length ? `${data.rejected.length} model suggestion(s) were discarded because one or more evidence quotes did not match the chat.` : 'Every displayed suggestion has 1–2 matching evidence spans. Matching quotes are an audit trail, not proof of interpretation.';
  el('results').scrollIntoView({ behavior: 'smooth' });
}

function invalidateResults() {
  analysisRequestId += 1;
  el('analyze').disabled = false;
  items = [];
  el('results').hidden = true;
}

for (const id of ['name', 'today', 'chat']) {
  el(id).addEventListener('input', invalidateResults);
  el(id).addEventListener('change', invalidateResults);
}

let analysisRequestId = 0;
el('analyze').addEventListener('click', async () => {
  const requestId = ++analysisRequestId;
  el('results').hidden = true; items = [];
  el('analyze').disabled = true; el('message').textContent = 'Gemma is reading the chat…';
  try {
    const provider = document.querySelector('input[name=provider]:checked').value;
    const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: el('name').value, today: el('today').value, chat: el('chat').value, provider }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Analysis failed.');
    if (requestId !== analysisRequestId) return;
    render(data);
    el('message').textContent = `Reviewed by ${data.provider}. ${data.items.length} cited suggestions found.`;
  } catch (error) {
    if (requestId === analysisRequestId) {
      items = []; el('results').hidden = true; el('message').textContent = error.message;
    }
  } finally {
    if (requestId === analysisRequestId) el('analyze').disabled = false;
  }
});

el('download').addEventListener('click', () => {
  const calendar = buildCalendar(items);
  if (!calendar) { el('message').textContent = 'Review at least one confirmed event with a date before exporting.'; return; }
  const url = URL.createObjectURL(new Blob([calendar], { type: 'text/calendar' }));
  const link = document.createElement('a'); link.href = url; link.download = 'pakka-reviewed-plan.ics'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
