/**
 * What this app is, and who built it — the content itself, with no page
 * wrapper. Shared by the top-level About screen and Settings' About tab,
 * so both show the same full write-up instead of one being a condensed
 * copy of the other.
 */
export default function AboutContent() {
  return (
    <>
      <section className="settings-section">
        <h2 className="settings-section__title">What Charting Practice is</h2>
        <p className="settings-row">
          Charting Practice is a training simulator for nursing documentation.
          Nursing programs teach what to chart, but rarely let students
          practice charting under the conditions where it actually goes
          wrong — after a messy event, from memory, at the end of a shift.
          This app puts you through the event first, then asks you to write
          the note for it, so the skill gets practiced under real pressure
          instead of in the abstract.
        </p>
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">Darryl McCottrell</h2>
        <p className="settings-row">
          Darryl McCottrell built Charting Practice — the idea, the product
          direction, and every decision about what it should do and how it
          should feel, from the first working version through the real
          accounts and admin controls it runs on today. He saw a real gap
          between what nursing programs teach and what new nurses are
          actually asked to do under pressure, and set out to build
          something that closes it.
        </p>
        <p className="settings-row">
          The original scenarios are written by a practicing nurse. Newer
          scenarios are drafted by AI, aiming for clinical accuracy and
          checked against the app's own grading and safety checks — and a
          clinician reviews each one before it's added, since getting this
          content right matters more here than almost anywhere else.
        </p>
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">Built with Claude</h2>
        <p className="settings-row">
          This app was built collaboratively with Claude, Anthropic's AI
          assistant. Darryl coded and assisted throughout — every decision,
          every feature, every fix started with him. Claude formalized and
          cleaned up that work, and designed the layout of the website: the
          visual system, the screens, and how it all fits together.
        </p>
      </section>
    </>
  );
}
