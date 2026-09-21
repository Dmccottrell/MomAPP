# Writing a scenario

A scenario is one JSON file in `src/scenarios/`. It contains the patient, the
situation, everything the learner can do, and everything the note must contain.
There is no code in it.

The easiest way to start is to copy `fall-01.json`, rename it, and replace the
contents. Keep all the punctuation exactly where it is — JSON is strict about
commas, quotes, and brackets. If the app shows a blank page after you add a
file, a missing comma is the first thing to check.

## The shape of the file

### Identification

```json
"id": "discharge-01",
"title": "Routine discharge",
"category": "Documentation",
"unit": "Med-Surg",
"difficulty": "Foundational",
"estimatedMinutes": 10,
```

`id` must be unique and match the filename. `difficulty` is free text —
"Foundational", "Intermediate", whatever vocabulary makes sense.

### Objectives

What the learner should be able to do afterward. Three is a good number.

```json
"objectives": [
  "Confirm discharge criteria are met before teaching",
  "Document discharge education and who received it"
],
```

### The patient

All fictional. Avoid names of real residents, and avoid combinations of
details distinctive enough to identify someone.

```json
"patient": {
  "name": "Harold Brenner",
  "age": 78,
  "sex": "M",
  "room": "412-B",
  "mrn": "SIM-0041",
  "admitted": "Day 3",
  "diagnosis": "Community-acquired pneumonia",
  "history": ["Atrial fibrillation", "Hypertension"],
  "medications": ["Apixaban 5 mg BID"],
  "allergies": ["Penicillin"],
  "code": "Full code",
  "fallRisk": "High — Morse 55"
},
```

### Vitals and clock

Vitals shown at the start. Any label works — whatever you put here is what
appears in the chart.

```json
"vitals": { "bp": "142/88", "hr": "92", "rr": "20",
            "temp": "98.4", "spo2": "94%", "pain": "3/10" },

"clock": { "start": "21:04", "label": "Time since found" },
```

### Opening

What the learner walks into. Write it in second person, present tense, and stop
before any assessment — the assessment is their job.

```json
"opening": "You are starting your 2100 rounds. As you approach room 412...",
```

### Actions

The heart of the scenario. Each one is something the learner might do.

**A correct action:**

```json
{
  "id": "neuro-check",
  "label": "Perform neuro checks",
  "detail": "He is on apixaban.",
  "correct": true,
  "order": 2,
  "response": "Pupils equal and reactive at 3 mm. Grip strength equal...",
  "reveals": { "pain": "6/10" },
  "timeCost": 2,
  "criticalWhy": "Anticoagulated patient with an unwitnessed fall."
}
```

**A wrong action:**

```json
{
  "id": "lift-immediately",
  "label": "Help him up into bed right away",
  "detail": "He looks uncomfortable on the floor.",
  "correct": false,
  "response": "You move him before assessing. If he has a hip fracture...",
  "penalty": "Moved before assessment",
  "timeCost": 1
}
```

Field by field:

| Field | What it does |
|---|---|
| `id` | Unique within this scenario. Lowercase with dashes. |
| `label` | The button text. |
| `detail` | Small grey text under the label. |
| `correct` | `true` or `false`. Correct actions must all be taken to unlock the note. |
| `order` | Required on correct actions. The clinical sequence. |
| `response` | What happens. On a wrong action, this is where you teach — explain the reasoning, don't just say no. |
| `reveals` | Optional. Vitals that change or appear as a result. |
| `timeCost` | Minutes the action takes. Advances the clock. |
| `criticalWhy` | Optional teaching note shown in amber. |
| `penalty` | Wrong actions only. A short label naming the mistake. |

Aim for five to seven correct actions and two or three wrong ones. The wrong
ones should be plausible — a trap nobody would fall for teaches nothing. The
best distractors are the things new nurses actually do.

### Hints

Shown one at a time when the learner asks. Order them from gentlest nudge to
most direct.

```json
"hints": [
  "He is on an anticoagulant. What does that change?",
  "Before he moves an inch, what do you need to know?"
],
```

### Documentation requirements

What the note must contain. Each requirement is checked against what they wrote.

```json
{
  "id": "anticoag",
  "label": "Anticoagulation status",
  "keywords": ["apixaban", "anticoagul", "blood thinner", "eliquis"],
  "why": "This is why the head CT was ordered."
}
```

**Keywords:** list every reasonable way a nurse might phrase it. Finding any one
of them counts. Partial words work — `"anticoagul"` matches both
"anticoagulant" and "anticoagulated". Being generous here matters, because a
learner marked wrong for correct-but-different wording learns the wrong lesson.

**Smart-grading extras** (only used once the "Smarter note grading" preview flag
is on): matching is by whole words — keywords of three letters or fewer must
match a whole word, longer ones still match as word starts, and common
shorthand like "pulse" or "doctor" is accepted for `hr` and `provider`. A
requirement may also list `"smartKeywords"`, which replace `keywords` under
smart grading — use it when a keyword is too broad (a bare `"notified"` also
credits telling the provider, so the family requirement's `smartKeywords` leave
it out).

**Forbidden words** flip the check — used for things that should *not* appear:

```json
{
  "id": "no-cause",
  "label": "No stated cause you did not observe",
  "keywords": [],
  "forbidden": ["climbed over", "tried to climb", "fell out of bed"],
  "why": "You did not see it happen."
}
```

**`why`** is shown to the learner either way. Write it as teaching, not scoring.

### Model note and pitfalls

```json
"modelNote": "2104 — Found resident sitting on floor at right bedside...",
"pitfalls": [
  "Writing 'patient fell' when no one saw it — say 'found on floor'."
]
```

The model note should be genuinely good, not merely adequate — learners compare
against it. Use `\n\n` for paragraph breaks.

## Before you call it done

- Every correct action has an `order`, numbered consecutively from 1
- Every `id` is unique within the file
- The model note would actually satisfy every requirement you listed
- At least one wrong action tempting enough that you'd expect people to click it
- No real patient details

## Checking it

Add the import to `src/App.jsx`, save, and run it yourself twice: once
correctly, once badly. The bad run is the one that exposes weak feedback.
