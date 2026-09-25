import { useRef } from "react";
import { ChevronIcon } from "../components/icons";
import AppearancePreview from "../components/AppearancePreview";
import { DENSITY_OPTIONS } from "../utils/density";
import { CORNER_RADIUS_OPTIONS } from "../utils/cornerRadius";

/** A row-based selector with a chevron — Density and Corner radius have
 * more choices than a segmented control reads well with, and a native
 * <select> underneath keeps real keyboard/screen-reader/mobile-picker
 * behavior instead of a hand-rolled dropdown. */
function RowSelect({ label, value, options, onChange }) {
  const current = options.find((o) => o.value === value)?.label ?? value;
  return (
    <label className="settings-list-row">
      <span className="settings-list-row__label">{label}</span>
      <span className="settings-list-row__control">
        <span className="settings-list-row__value">{current}</span>
        <ChevronIcon className="settings-list-row__chev" />
        <select
          className="settings-list-row__select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

/** A standard on/off switch — used for every boolean appearance setting
 * so there's exactly one toggle style in this whole tab (per the redesign
 * brief: "avoid mixing too many different control styles"). */
function Switch({ label, hint, checked, onChange }) {
  return (
    <label className="settings-list-row settings-list-row--switch">
      <span>
        <span className="settings-list-row__label">{label}</span>
        {hint && <span className="settings-list-row__hint">{hint}</span>}
      </span>
      <span className="switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="switch__track">
          <span className="switch__knob" />
        </span>
      </span>
    </label>
  );
}

/**
 * The Appearance tab — one page, subtle dividers between groups instead
 * of a stack of boxed sections:
 * Density, Corner radius, Animations, Reduce motion, High contrast, a
 * custom accent color, a live preview, and Reset appearance. Every value
 * and setter is a prop from Settings.jsx, which owns the actual
 * utils/*.js read/write calls — this file only renders.
 */
export default function AppearanceSettings({
  theme,
  themeOptions,
  onThemeChange,
  accent,
  accentOptions,
  customAccentHex,
  onAccentChange,
  onCustomAccentHex,
  textSize,
  textSizeOptions,
  onTextSizeChange,
  density,
  onDensityChange,
  cornerRadius,
  onCornerRadiusChange,
  animationsEnabled,
  onAnimationsChange,
  reduceMotion,
  onReduceMotionChange,
  highContrast,
  onHighContrastChange,
  onReset,
}) {
  const customColorRef = useRef(null);

  return (
    <section className="settings-section appearance-settings">
      <h2 className="settings-section__title">Appearance</h2>
      <p className="appearance-settings__lede">Customize how Charting Practice looks and feels.</p>

      <div className="appearance-settings__group">
        <p className="field__label">Theme</p>
        <div className="segmented settings-row" role="radiogroup" aria-label="Theme">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={theme === opt.value}
              className={`segmented__option ${theme === opt.value ? "segmented__option--active" : ""}`}
              onClick={() => onThemeChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="appearance-settings__group appearance-settings__divider">
        <p className="field__label">Colors</p>
        <div className="swatch-picker settings-row" role="radiogroup" aria-label="Accent color">
          {accentOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={accent === opt.value}
              className={`swatch ${accent === opt.value ? "swatch--active" : ""}`}
              style={{ background: opt.swatch }}
              onClick={() => onAccentChange(opt.value)}
            >
              <span className="sr-only">{opt.label}</span>
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={accent === "custom"}
            className={`swatch swatch--custom ${accent === "custom" ? "swatch--active" : ""}`}
            style={accent === "custom" ? { background: customAccentHex } : undefined}
            onClick={() => {
              onAccentChange("custom");
              customColorRef.current?.click();
            }}
          >
            <span className="sr-only">Custom color</span>
          </button>
          <input
            ref={customColorRef}
            type="color"
            className="sr-only"
            value={customAccentHex}
            onChange={(e) => onCustomAccentHex(e.target.value)}
            aria-label="Choose a custom accent color"
          />
        </div>
      </div>

      <div className="appearance-settings__group appearance-settings__divider">
        <p className="field__label">Text &amp; display</p>
        <div className="segmented settings-row" role="radiogroup" aria-label="Text size">
          {textSizeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={textSize === opt.value}
              className={`segmented__option ${textSize === opt.value ? "segmented__option--active" : ""}`}
              onClick={() => onTextSizeChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="appearance-settings__group appearance-settings__divider">
        <p className="field__label">Interface</p>
        <RowSelect label="Density" value={density} options={DENSITY_OPTIONS} onChange={onDensityChange} />
        <RowSelect
          label="Corner radius"
          value={cornerRadius}
          options={CORNER_RADIUS_OPTIONS}
          onChange={onCornerRadiusChange}
        />
        <Switch
          label="Animations"
          hint="Transitions and motion throughout the app"
          checked={animationsEnabled}
          onChange={onAnimationsChange}
        />
      </div>

      <div className="appearance-settings__group appearance-settings__divider">
        <p className="field__label">Accessibility</p>
        <Switch
          label="Reduce motion"
          hint="Same effect as Animations off — a separate switch in case your device's own setting isn't one you control"
          checked={reduceMotion}
          onChange={onReduceMotionChange}
        />
        <Switch
          label="High contrast"
          hint="Stronger text and borders"
          checked={highContrast}
          onChange={onHighContrastChange}
        />
        <p className="settings-list-row__hint appearance-settings__note">
          Larger text uses the Text size setting above — there's no separate control for it.
        </p>
      </div>

      <div className="appearance-settings__group appearance-settings__divider">
        <p className="field__label">Preview</p>
        <AppearancePreview />
      </div>

      <div className="appearance-settings__group appearance-settings__divider">
        <button type="button" className="appearance-settings__reset" onClick={onReset}>
          Reset appearance
        </button>
        <p className="settings-list-row__hint">Restore all appearance settings to their defaults.</p>
      </div>
    </section>
  );
}
