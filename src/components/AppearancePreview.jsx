/**
 * A miniature, non-interactive mockup for Settings → Appearance — reuses
 * the app's real classes (.case, .btn--go, .segmented) inside a bounded
 * frame, so it reflects every appearance setting (theme, accent, custom
 * color, text size, density, corner radius, high contrast) automatically
 * through the same CSS custom properties the real screens read, rather
 * than re-implementing each one's look a second time here.
 */
export default function AppearancePreview() {
  return (
    <div className="appearance-preview" aria-hidden="true">
      <div className="appearance-preview__nav">
        <span className="appearance-preview__brand">Charting Practice</span>
      </div>
      <div className="appearance-preview__body">
        <div className="case appearance-preview__case">
          <span className="case__cat">Risk management</span>
          <span className="case__title">Unwitnessed fall</span>
          <span className="case__meta">Med-Surg · Foundational</span>
        </div>
        <div className="appearance-preview__row">
          <div className="segmented appearance-preview__segmented">
            <span className="segmented__option segmented__option--active">On</span>
            <span className="segmented__option">Off</span>
          </div>
          <button type="button" className="btn btn--go appearance-preview__btn" tabIndex={-1}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
