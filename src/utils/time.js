// Clock helpers for the scenario's in-simulation time display.

/**
 * Adds a number of minutes to a "HH:MM" clock string, wrapping past
 * midnight if needed. Used to turn "minutes elapsed since the scenario
 * started" into a wall-clock time to show the learner.
 *
 * @param {string} hhmm - starting time, e.g. "21:04"
 * @param {number} mins - minutes to add
 * @returns {string} the resulting time, zero-padded as "HH:MM"
 */
export function addMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = String(Math.floor((total % 1440) / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
