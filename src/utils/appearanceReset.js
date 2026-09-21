// "Reset appearance" (Settings → Appearance) — clears every appearance
// preference this file's siblings own and re-applies the defaults, all
// in one place so adding a new appearance setting means adding one line
// here too, not hunting down every localStorage key by hand.

import { setThemePreference } from "./theme";
import { setAccentPreference } from "./accent";
import { setTextSizePreference } from "./textSize";
import { setDensityPreference } from "./density";
import { setCornerRadiusPreference } from "./cornerRadius";
import { setAnimationsPreference, setReduceMotionPreference } from "./motion";
import { setHighContrastPreference } from "./contrast";

/** Restores every appearance setting to its default and applies them immediately. */
export function resetAppearance() {
  setThemePreference("system");
  setAccentPreference("forest");
  setTextSizePreference("medium");
  setDensityPreference("comfortable");
  setCornerRadiusPreference("rounded");
  setAnimationsPreference(true);
  setReduceMotionPreference(false);
  setHighContrastPreference(false);
}
