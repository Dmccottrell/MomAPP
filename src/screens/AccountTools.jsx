import { useState } from "react";
import Avatar from "../components/Avatar";
import { updateEmail, updatePassword, verifyPassword, sendPasswordReset } from "../utils/auth";
import { updateSocialLinks } from "../utils/profiles";
import { uploadAvatar, removeAvatar } from "../utils/avatarStorage";

const SOCIAL_FIELDS = [
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "x", label: "X (Twitter)" },
  { key: "linkedin", label: "LinkedIn" },
];

/**
 * The expanded account tools gated behind the 'account-profile-tools'
 * feature flag (see Settings.jsx and utils/featureFlags.js): a profile
 * photo, changing your email or password, and social profile links.
 * Everything here writes straight to Supabase — RLS on `profiles` lets a
 * user change their own row (except admin/permission flags), and the
 * `avatars` storage bucket's policies restrict uploads to each user's own
 * folder, so none of this depends on this component behaving.
 */
export default function AccountTools({ profile, onProfileChange }) {
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const [email, setEmail] = useState(profile.email || "");
  const [emailStatus, setEmailStatus] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [forgotStatus, setForgotStatus] = useState("");

  const [links, setLinks] = useState({
    facebook: "",
    instagram: "",
    x: "",
    linkedin: "",
    ...profile.social_links,
  });
  const [socialStatus, setSocialStatus] = useState("");

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError("");
    setAvatarBusy(true);
    try {
      const url = await uploadAvatar(file, profile.id);
      onProfileChange({ ...profile, avatar_url: url });
    } catch (err) {
      setAvatarError(err.message || "Couldn't upload that image.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleRemoveAvatar() {
    setAvatarError("");
    setAvatarBusy(true);
    try {
      await removeAvatar(profile.id);
      onProfileChange({ ...profile, avatar_url: null });
    } catch (err) {
      setAvatarError(err.message || "Couldn't remove that.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setEmailStatus("");
    if (!email.trim() || email.trim() === profile.email) return;
    try {
      await updateEmail(email.trim());
      setEmailStatus("Check your inbox to confirm the new address — it won't change until you click the link.");
    } catch (err) {
      setEmailStatus(err.message || "Couldn't start that change.");
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordStatus("");
    if (!currentPassword) {
      setPasswordStatus("Enter your current password.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus("Passwords don't match.");
      return;
    }
    setPasswordBusy(true);
    try {
      const ok = await verifyPassword(profile.email, currentPassword);
      if (!ok) {
        setPasswordStatus("Current password is incorrect.");
        return;
      }
      await updatePassword(newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStatus("Password updated.");
    } catch (err) {
      setPasswordStatus(err.message || "Couldn't update that.");
    } finally {
      setPasswordBusy(false);
    }
  }

  async function handleForgotPassword() {
    setForgotStatus("Sending…");
    try {
      await sendPasswordReset(profile.email);
      setForgotStatus("Reset email sent — check your inbox.");
    } catch (err) {
      setForgotStatus(err.message || "Couldn't send that.");
    }
  }

  async function handleSocialSubmit(e) {
    e.preventDefault();
    setSocialStatus("");
    try {
      await updateSocialLinks(profile.id, links);
      onProfileChange({ ...profile, social_links: links });
      setSocialStatus("Saved.");
    } catch (err) {
      setSocialStatus(err.message || "Couldn't save that.");
    }
  }

  return (
    <>
      <section className="settings-section">
        <h2 className="settings-section__title">Profile photo</h2>
        <div className="avatar-picker">
          <Avatar name={profile.name} avatarUrl={profile.avatar_url} size={64} />
          <div className="avatar-picker__controls">
            <label className="btn btn--ghost btn--sm avatar-picker__upload">
              {avatarBusy ? "Uploading…" : "Change photo"}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={avatarBusy}
                hidden
              />
            </label>
            {profile.avatar_url && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={handleRemoveAvatar}
                disabled={avatarBusy}
              >
                Remove photo
              </button>
            )}
          </div>
        </div>
        {avatarError && <p className="settings-row settings-row--muted">{avatarError}</p>}
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">Email</h2>
        <form className="inline-form" onSubmit={handleEmailSubmit}>
          <input
            className="field-input"
            style={{ flex: 1, minWidth: "12rem" }}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailStatus("");
            }}
          />
          <button type="submit" className="btn btn--ghost" disabled={!email.trim() || email.trim() === profile.email}>
            Save email
          </button>
        </form>
        {emailStatus && <p className="settings-row settings-row--muted">{emailStatus}</p>}
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">Password</h2>
        <form onSubmit={handlePasswordSubmit}>
          <label className="field">
            <span className="field__label">Current password</span>
            <input
              className="field-input"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setPasswordStatus("");
              }}
            />
          </label>
          <label className="field">
            <span className="field__label">New password</span>
            <input
              className="field-input"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setPasswordStatus("");
              }}
            />
          </label>
          <label className="field">
            <span className="field__label">Retype new password</span>
            <input
              className="field-input"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setPasswordStatus("");
              }}
            />
          </label>
          <div className="inline-form">
            <button
              type="submit"
              className="btn btn--ghost"
              disabled={!currentPassword || !newPassword || !confirmPassword || passwordBusy}
            >
              {passwordBusy ? "Saving…" : "Save password"}
            </button>
            <button type="button" className="btn btn--ghost" onClick={handleForgotPassword}>
              Forgot your password?
            </button>
          </div>
        </form>
        {passwordStatus && <p className="settings-row settings-row--muted">{passwordStatus}</p>}
        {forgotStatus && <p className="settings-row settings-row--muted">{forgotStatus}</p>}
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">Social links</h2>
        <p className="settings-row settings-row--muted">
          Just links for your own profile — nowhere in the app shows these
          to anyone else yet.
        </p>
        <form onSubmit={handleSocialSubmit}>
          <div className="field-grid">
            {SOCIAL_FIELDS.map(({ key, label }) => (
              <label className="field" key={key}>
                <span className="field__label">{label}</span>
                <input
                  className="field-input"
                  type="url"
                  placeholder="https://…"
                  value={links[key] || ""}
                  onChange={(e) => setLinks((l) => ({ ...l, [key]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <button type="submit" className="btn btn--ghost">
            Save social links
          </button>
        </form>
        {socialStatus && <p className="settings-row settings-row--muted">{socialStatus}</p>}
      </section>
    </>
  );
}
