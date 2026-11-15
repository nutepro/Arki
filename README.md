# Arki

Arki is a Junction 2026 browser prototype for everyday support after depression treatment, built for Aalto University's **Beyond the Clinic** challenge. It illustrates a loop of noticing changes in a person's routines, offering small personally meaningful actions, and adapting suggestions to their preferences.

[Try the demo](https://arki.rjc.iffe.eu/) · [Watch the demo video](https://arki.rjc.iffe.eu/arki-demo-v4-under-2min.mp4)

## Run locally

Requires Node.js 18 or newer. No dependencies, installation, API keys, or accounts are needed.

```sh
cd web
npm start
```

Open http://localhost:5173. To use another port: `PORT=5174 npm start`. Stop with Ctrl+C. You can also open `web/dist/index.html` directly. Internet access is needed for public event searches and external Spotify links.

## Explore the demo

1. Complete or skip onboarding: interests, example close people, and desired involvement.
2. Switch between Aino and Elias, whose routines and preferences differ.
3. Try the four situations: a normal week, one unusual day, three quieter days, and finding your rhythm again.
4. Open the phone widget or Videos, or manually preview a suggestion from the gallery. Try an editable greeting, favourite memory, music, or a dance/language activity.
5. Use Profile to change interests, people and involvement. Use Next day to explore subsequent suggestions; Restart or reload clears the session.
6. Expand the background panels to inspect simulated signals, personal baselines, and the explanation of planned models.

Demo notifications use accelerated presentation timings. The normal-week greeting has a separate daily allowance from routine-change suggestions.

## What works today

- Interactive phone UI, onboarding, two fictional profiles, four scenarios, and editable preferences.
- Local analysis of synthetic daily observations: personal median/MAD baselines, repeated changes across domains, and heuristic recommendation ranking.
- Session-based feedback, hidden suggestions, daily limits, local recipient inboxes and optional follow-up steps.
- User-triggered public Helsinki Linked Events searches for dance and language activities, with source links and a local alternative when no suitable result is available.
- Spotify handoff to a fictional profile's favourite track; playback happens on Spotify.
- Local short-video feed with credited media and reduced-motion support.

## Simulation and planned work

The browser does **not** collect phone sensors, location, messages, contacts, health records or social-media histories. People, observations and profile connections are fictional. Greetings appear only in simulated recipient inboxes; no real messages or bookings are sent. State lives in memory and resets on reload. There is no account backend or persistent storage.

The current analysis uses unvalidated prototype heuristics. Phone inactivity is not measured sleep, and accepting a suggestion does not establish participation or improved wellbeing. This demo does not diagnose depression or demonstrate clinical efficacy.

The planned phone app would learn a personal baseline over weeks of real observations. Isolation Forest for routine-change detection and a contextual bandit such as LinUCB for preference learning are planned approaches; neither is trained or running in this demo.

The two external paths are public event GET requests and user-opened Spotify links. Event requests contain search criteria rather than personal observations or contact names. Feed selection is scripted and does not imply that any video genre causes mood changes.

## Source layout

The files in `web/dist/` are the directly editable application source; no bundler or build step is required.

| Path | Purpose |
| --- | --- |
| `web/dist/index.html`, `style.css` | Page structure and responsive styling |
| `web/dist/app.js` | UI, session state and interaction flow |
| `web/dist/engine.js` | Synthetic observations, baseline analysis and recommendation rules |
| `web/dist/opportunities.js` | Public event lookup and result filtering |
| `web/dist/videos.js`, `media/` | Scenario feed and credited video clips |
| `web/server.mjs` | Local static development server |
| `web/tests/` | Behaviour, UI-state and event-search tests |
| `CREDITS.md` | Asset provenance and third-party notices |

## Verify

```sh
cd web
npm test
npm run check
```

Tests use Node's built-in test runner. Event-search tests use mocked responses; they do not establish current availability of the external service. UI-state tests do not replace a full browser accessibility audit.

This repository is a standalone submission snapshot with fresh Git history. It contains the browser demo and required assets, without internal discussions, earlier prototypes or video-production files.

## License

Project code and documentation are available under the [MIT License](LICENSE). Bundled third-party media retains its own terms; see [CREDITS.md](CREDITS.md) and the [media notices](web/dist/media/README.md).
