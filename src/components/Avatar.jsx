import { avatarColor, initials } from "../utils/avatar";

/** A small circle for a profile: the uploaded photo if there is one, otherwise colored initials. */
export default function Avatar({ name, size = 26, avatarUrl }) {
  if (avatarUrl) {
    return (
      <img
        className="avatar avatar--photo"
        src={avatarUrl}
        alt=""
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.42, background: avatarColor(name) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
