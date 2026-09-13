import { useState } from "react";
import { canBuildScenarios } from "../utils/profiles";

function buildSteps(profile) {
  const steps = [
    {
      title: "Welcome to Charting Practice",
      body: "A training simulator for nursing documentation. You work a patient scenario from start to finish, then write the note for it — and get feedback on what it covered and what it missed.",
    },
    {
      title: "Home",
      body: "Pick a scenario here. Each one drops you into a situation, gives you a set of actions to take — some right, some tempting mistakes — and then asks you to chart what happened.",
    },
    {
      title: "History",
      body: "Every note you submit is saved here, tied to your account rather than this device, so it follows you if you sign in somewhere else.",
    },
  ];

  if (canBuildScenarios(profile)) {
    steps.push({
      title: "My Scenarios",
      body: "You've been given access to build your own scenarios here. Anything you save is shared with everyone else who signs in — same as the presets on Home.",
    });
  }

  steps.push({
    title: "Settings",
    body: "Switch between light, dark, or system theme, and update your name here. If you're the admin, this is also where you manage who else can build scenarios.",
  });

  return steps;
}

/**
 * A one-time welcome tour shown before anything else on a profile's first
 * sign-in. App.jsx gates this on `needsOnboarding(profile)`; finishing or
 * skipping calls markOnboardingSeen so it never shows again for this
 * account, on any device.
 */
export default function Onboarding({ profile, onDone }) {
  const [steps] = useState(() => buildSteps(profile));
  const [i, setI] = useState(0);
  const step = steps[i];
  const last = i === steps.length - 1;

  return (
    <div className="profile-gate">
      <div className="profile-gate__card onboarding__card">
        <p className="onboarding__step">
          Step {i + 1} of {steps.length}
        </p>
        <h1>{step.title}</h1>
        <p className="profile-gate__lede">{step.body}</p>

        <div className="onboarding__dots">
          {steps.map((_, idx) => (
            <span
              key={idx}
              className={`onboarding__dot ${idx === i ? "onboarding__dot--active" : ""}`}
            />
          ))}
        </div>

        <div className="onboarding__actions">
          <button type="button" className="btn btn--ghost" onClick={onDone}>
            Skip
          </button>
          {last ? (
            <button type="button" className="btn btn--go" onClick={onDone}>
              Get started
            </button>
          ) : (
            <button type="button" className="btn btn--go" onClick={() => setI((n) => n + 1)}>
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
