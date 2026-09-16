import { useCallback, useEffect, useMemo, useState } from "react";
import Avatar from "../components/Avatar";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  listProfiles,
  setCanBuildScenarios,
  setAdminStatus,
} from "../utils/profiles";
import { isBuilderEnabled, setBuilderEnabled } from "../utils/customScenarios";
import { sendPasswordReset } from "../utils/auth";
import { deleteAccount } from "../utils/admin";
import { listAllHistory, summarizeHistoryByUser } from "../utils/storage";

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Everything about other people's accounts, in one place: who can build
 * scenarios, password resets, promoting/demoting admins, and deleting
 * accounts outright. Admin-only — Settings.jsx only renders this tab for
 * an admin profile, and every write here is backed by an RLS policy or
 * (for deletion) the delete-user Edge Function that re-checks admin
 * status server-side, so this screen is a convenience, not the real gate.
 */
export default function UserManagement({ profile }) {
  const [otherProfiles, setOtherProfiles] = useState(null);
  const [historyByUser, setHistoryByUser] = useState({});
  const [query, setQuery] = useState("");

  const [builderEnabled, setBuilderEnabledState] = useState(true);
  const [accessError, setAccessError] = useState("");

  const [accountStatus, setAccountStatus] = useState({});
  const [confirmState, setConfirmState] = useState(null);

  // These three don't depend on each other, so they fire at once rather
  // than one after another — the account list, everyone's activity
  // history, and the builder toggle are all needed before this screen
  // has anything to show.
  const refresh = useCallback(() => {
    Promise.all([listProfiles(), listAllHistory(), isBuilderEnabled()])
      .then(([all, history, enabled]) => {
        setOtherProfiles(all.filter((p) => p.id !== profile.id));
        setHistoryByUser(summarizeHistoryByUser(history));
        setBuilderEnabledState(enabled);
      })
      .catch(() => setOtherProfiles([]));
  }, [profile.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    if (!otherProfiles) return [];
    const q = query.trim().toLowerCase();
    if (!q) return otherProfiles;
    return otherProfiles.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q)
    );
  }, [otherProfiles, query]);

  async function toggleBuilderEnabled() {
    const next = !builderEnabled;
    try {
      await setBuilderEnabled(next);
      setBuilderEnabledState(next);
    } catch (err) {
      setAccessError(err.message || "Couldn't change that.");
    }
  }

  async function toggleProfileAccess(id, allowed) {
    try {
      await setCanBuildScenarios(id, allowed);
      setOtherProfiles((list) =>
        list.map((p) => (p.id === id ? { ...p, can_build_scenarios: allowed } : p))
      );
    } catch (err) {
      setAccessError(err.message || "Couldn't change that.");
    }
  }

  async function handleResetPassword(p) {
    setAccountStatus((s) => ({ ...s, [p.id]: "Sending…" }));
    try {
      await sendPasswordReset(p.email);
      setAccountStatus((s) => ({ ...s, [p.id]: "Reset email sent." }));
    } catch (err) {
      setAccountStatus((s) => ({ ...s, [p.id]: err.message || "Couldn't send that." }));
    }
  }

  function handleToggleAdmin(p) {
    const makingAdmin = !p.is_admin;
    setConfirmState({
      message: makingAdmin
        ? `Make ${p.name} an admin? They'll be able to manage accounts, feature previews, and scenario builder access too.`
        : `Remove admin access from ${p.name}? They'll keep their account and history, just lose admin controls.`,
      confirmLabel: makingAdmin ? "Make admin" : "Remove admin",
      onConfirm: () => runToggleAdmin(p, makingAdmin),
    });
  }

  async function runToggleAdmin(p, makingAdmin) {
    setConfirmState(null);
    setAccountStatus((s) => ({ ...s, [p.id]: makingAdmin ? "Making admin…" : "Removing admin…" }));
    try {
      await setAdminStatus(p.id, makingAdmin);
      setOtherProfiles((list) => list.map((x) => (x.id === p.id ? { ...x, is_admin: makingAdmin } : x)));
      setAccountStatus((s) => ({ ...s, [p.id]: "" }));
    } catch (err) {
      setAccountStatus((s) => ({ ...s, [p.id]: err.message || "Couldn't change that." }));
    }
  }

  function handleDeleteAccount(p) {
    setConfirmState({
      message: `Permanently delete ${p.name}'s account, including their history? This can't be undone.`,
      confirmLabel: "Delete account",
      danger: true,
      onConfirm: () => runDeleteAccount(p),
    });
  }

  async function runDeleteAccount(p) {
    setConfirmState(null);
    setAccountStatus((s) => ({ ...s, [p.id]: "Deleting…" }));
    try {
      await deleteAccount(p.id);
      setOtherProfiles((list) => list.filter((x) => x.id !== p.id));
    } catch (err) {
      setAccountStatus((s) => ({ ...s, [p.id]: err.message || "Couldn't delete that account." }));
    }
  }

  function copyEmail(email) {
    navigator.clipboard?.writeText(email).catch(() => {});
  }

  return (
    <>
      <section className="settings-section">
        <h2 className="settings-section__title">Scenario builder access</h2>
        <p className="settings-row settings-row--muted">
          This is enforced by the database, not just the UI, so it can't be
          bypassed from the browser.
        </p>
        <label className="field field--checkbox settings-row">
          <input type="checkbox" checked={builderEnabled} onChange={toggleBuilderEnabled} />
          <span>Scenario builder turned on for everyone</span>
        </label>
        {accessError && <p className="settings-row settings-row--muted">{accessError}</p>}
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">Accounts</h2>
        <p className="settings-row settings-row--muted">
          Send a password reset, grant scenario-builder or admin access, or
          permanently delete an account. Deletion is real server-side
          deletion — a Supabase Edge Function checks you're an admin, then
          removes the account using a key this app's browser code never has
          access to.
        </p>

        {otherProfiles === null ? null : otherProfiles.length === 0 ? (
          <p className="settings-row--muted">No other accounts yet.</p>
        ) : (
          <>
            <input
              className="field-input settings-row"
              type="search"
              placeholder="Search by name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search accounts"
            />

            {filtered.length === 0 ? (
              <p className="settings-row--muted">No accounts match "{query}".</p>
            ) : (
              filtered.map((p) => {
                const activity = historyByUser[p.id];
                return (
                  <div className="account-row" key={p.id}>
                    <Avatar name={p.name} size={28} />
                    <div className="account-row__info">
                      <p className="account-row__name">
                        {p.name}
                        {p.is_admin && <span className="badge badge--admin">Admin</span>}
                      </p>
                      {p.email && (
                        <p className="account-row__email">
                          {p.email}{" "}
                          <button
                            type="button"
                            className="account-row__copy"
                            onClick={() => copyEmail(p.email)}
                            title="Copy email"
                            aria-label="Copy email"
                          >
                            Copy
                          </button>
                        </p>
                      )}
                      <p className="account-row__meta">
                        Joined {formatDate(p.created_at)}
                        {" · "}
                        {activity
                          ? `${activity.count} scenario${activity.count === 1 ? "" : "s"} completed, last ${formatDate(activity.lastCompletedAt)}`
                          : "no activity yet"}
                      </p>
                      {builderEnabled && !p.is_admin && (
                        <label className="field field--checkbox account-row__access">
                          <input
                            type="checkbox"
                            checked={Boolean(p.can_build_scenarios)}
                            onChange={(e) => toggleProfileAccess(p.id, e.target.checked)}
                          />
                          <span>Can build scenarios</span>
                        </label>
                      )}
                    </div>
                    <div className="account-row__actions">
                      <button className="btn btn--ghost btn--sm" onClick={() => handleResetPassword(p)}>
                        Reset password
                      </button>
                      <button className="btn btn--ghost btn--sm" onClick={() => handleToggleAdmin(p)}>
                        {p.is_admin ? "Remove admin" : "Make admin"}
                      </button>
                      <button className="btn btn--danger btn--sm" onClick={() => handleDeleteAccount(p)}>
                        Delete
                      </button>
                    </div>
                    {accountStatus[p.id] && (
                      <p className="account-row__status">{accountStatus[p.id]}</p>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(confirmState)}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        danger={Boolean(confirmState?.danger)}
        onConfirm={confirmState?.onConfirm}
        onCancel={() => setConfirmState(null)}
      />
    </>
  );
}
