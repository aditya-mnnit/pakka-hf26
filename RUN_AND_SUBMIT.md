# Run and submit Pakka?

Use this as a completion checklist. Record only results you personally observe; the sample chat is fictional, and no live Gemma run or friend feedback is included in this repository yet.

## 1. Prepare a laptop

- Install Node.js 20 or newer.
- Install Ollama from <https://ollama.com/download>.
- Start Ollama (launch the app, or run `ollama serve` in a terminal).
- In another terminal, from this project folder, run:

  ```sh
  ollama pull gemma4:e2b
  npm test
  npm start
  ```

- Open <http://localhost:3000>. The model download can be several gigabytes; allow time and disk space.

## 2. Run the sample with Gemma

- Click **Try a sample conversation**, then **Find the actual plan**.
- Confirm the page reports `local Ollama` and inspect each status, type, quote, and line number against the displayed fictional chat.
- Check that the sandwich and water commitments stay in the checklist. An event needs a valid date and either a time plus visible duration or an explicit all-day selection before it can be reviewed for export.
- Download the reviewed `.ics` file and inspect it in a text editor before importing it. Record the exact model and what it actually returned. Do not report expected behavior as an observed result.

## 3. Run the synthetic evaluation

- `test/fixtures/evaluation-cases.json` has eight development cases and four held-out cases. All cases are synthetic.
- Run `npm run evaluate:model` during development. Fix real failures without making unsupported performance claims.
- After prompt/code tuning stops, run `npm run evaluate:model -- --split=holdout` once. Review the JSON report under `evaluation-results/`; do not tune against the held-out set.
- The small case set is a behavior check, not a general accuracy estimate.

## 4. Exercise the interface

Use synthetic chats first, then only real text you have permission to share. Include cases that cover:

1. A clearly confirmed gathering with a date and time.
2. A suggested gathering that nobody confirms.
3. A later message that reverses an earlier date or RSVP; check that both messages are cited and the latest state is used.
4. A supply or action commitment, such as bringing food; it must remain a checklist item, not a calendar event.
5. An unresolved question or ambiguous date; it should stay unclear and not export.

For each run, note the input type, what was correct, any incorrect status/date/owner/citation, and whether the calendar file included anything it should not. Treat the five chats as your test set, not as proof the tool is error-free.

## 5. Get real friend feedback

- Ask one friend who coordinates group plans to try the app and explain their actual planning problem in their own words.
- Ask permission before using their name, story, chat excerpts, or feedback publicly. Anonymize details where appropriate; do not paste private chats into hosted mode without explicit permission.
- Record one useful thing, one confusing or incorrect result, and what you changed in response. Leave these details out of the public post if you do not have consent.

## 6. Record the demo

Make a 60–90 second screen recording showing the local model selection, one real model run, evidence review, a checklist item, and a reviewed confirmed event exported to `.ics`. Show the result accurately, including any mistake you found. Use a synthetic conversation unless you have consent for real chat content. Upload the video somewhere the challenge reviewers can access, then add its link to `DEV_SUBMISSION_DRAFT.md`.

## 7. Create the challenge repository

- Confirm the official challenge entry window and submission requirements at <https://dev.to/challenges/hacktoberfest-weekend-2026-10-01> before publishing.
- During the announced October 2–5, 2026 entry window, create a new public GitHub repository for this project. Do not reuse an older repository if the rules require a newly created one.
- Review the staged file list for secrets and model files, then commit and push the project. `.gitignore` excludes common credentials and local model assets; still inspect before pushing.
- Copy the new repository URL into the DEV draft.

## 8. Publish the DEV post

- Replace every bracketed placeholder in `DEV_SUBMISSION_DRAFT.md` with observed, consented details. Delete optional sections that do not apply.
- Keep the real model name, actual evaluation notes, data-sharing mode, code URL, and demo URL accurate. Mention a Gemma prize category only after checking the current rules and demonstrating a live Gemma run.
- Publish with the required challenge tags from the current official instructions. Submit before **October 5, 2026, 12:29 PM IST**, then verify the post and submission are visible.
