# Pakka? — plans, with receipts

Pakka? turns a noisy group conversation into a proposed plan. It uses Gemma 4 to separate confirmed, proposed, unclear, cancelled, and superseded plans, while keeping supplies, RSVPs, and action commitments in a checklist. Each item needs one or two exact evidence spans. If a later message reverses an earlier one, the result should cite both messages. The server rejects an item if any citation does not match its numbered source line. A person reviews every item. Only a reviewed, valid, confirmed event can be exported to an `.ics` calendar file; users must explicitly mark an event all-day when it has no time.

Built from scratch for the Hacktoberfest 2026 Weekend Challenge: **Build for a Friend**.

## Run locally

Requirements: Node.js 20+ and [Ollama](https://ollama.com/).

```sh
ollama pull gemma4:e2b
npm start
```

Open <http://localhost:3000>. A larger model can be selected with `OLLAMA_MODEL=gemma4:e4b npm start`. Check Ollama for the current model download size before pulling it. The app has no third-party JavaScript dependencies. In local mode, the chat is sent only to Ollama on `127.0.0.1`.

The project code is MIT licensed. Gemma 4 has its own [Apache 2.0 model license and terms](https://ai.google.dev/gemma/docs/core/model_card_4); using Gemma does not change this project's code license.

## Optional hosted model mode

Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey), then run:

```sh
GEMMA_API_KEY=your_key npm start
```

This enables a second button for the hosted Gemma 4 26B A4B model. The key remains on the server. Hosted mode sends the conversation to the Gemini API; use only text you have permission to share. A public deployment must set `GEMMA_API_KEY` as a server environment variable and rate-limit access before sharing widely.

## Try the sample

Use **Try a sample conversation**, then analyze after Ollama is running. The included conversation is fictional. It includes a firm picnic time, a changed RSVP, a promised food item, and two unresolved questions. The sample is useful for a walkthrough, but it is not a model evaluation or real user feedback. The real challenge story should use one consenting friend and their actual problem.

## How it works

1. The server numbers up to 80 chat lines and asks Gemma to return structured JSON with item types, statuses, and evidence spans.
2. Each item needs one or two exact quotations and line numbers. A reversal should include both the superseded statement and the latest statement.
3. The server rejects an item if it has no evidence, more than two spans, or any quote absent from the cited line.
4. The interface shows each item in either calendar candidates or the checklist, with editable title/date/time fields and visible event duration. Editing an item clears its review state.
5. Only items marked `type: event`, `status: confirmed`, reviewed by the person, and given a real calendar date and explicit time or all-day selection can become VEVENTs. Tasks, RSVPs, proposals, cancellations, superseded plans, and unclear plans are excluded by the calendar module.

This is deliberately cautious: the model can still misread valid evidence, and the interface cannot prove that a group truly agreed. Exact quotation is an audit trail, not a proof that the interpretation is right. Check the rendered output before relying on it.

## Challenge submission checklist

- [ ] Confirm the entrant is 18+ and has a DEV account in good standing.
- [ ] Put this code in a **new** GitHub repository created during the October 2–5, 2026 entry window.
- [ ] Run it with a real Gemma 4 model; record the exact model name, one successful case, and one mistake or limitation. This repository work has not yet been validated with a live model run.
- [ ] Ask one real friend who coordinates group plans to try it. Get permission before using chat excerpts, quotes, or their name publicly. Anonymize if needed.
- [ ] Record a 60–90 second screen video or deploy a working demo. Show the source quote, human review, and calendar export.
- [ ] Publish one DEV post with the official submission template, required tags, code link, demo, real friend's problem, and explanation of why the open model matters.
- [ ] Submit before **October 5, 2026, 12:29 PM IST**. Verify the contest page's current status before publishing.

## Run tests

```sh
npm test
```

## Synthetic Gemma evaluation

`test/fixtures/evaluation-cases.json` contains eight development cases and four held-out cases. They are synthetic and contain no real chats. With Ollama running and the selected Gemma model available, run the development set first:

```sh
npm run evaluate:model
```

After tuning is complete, run the held-out set once:

```sh
npm run evaluate:model -- --split=holdout
```

Reports are saved under `evaluation-results/`. A 12-case synthetic check is not a general accuracy estimate. Inspect every result and report model failures honestly.

## Current validation status

The automated test suite covers deterministic validation and calendar behavior. **A real Gemma inference and friend usability session are still required before making claims about model performance or user benefit.**
