import { avatarColor, initials } from "../utils/avatar";

/** A small colored circle with a name's initials — purely decorative. */
export default function Avatar({ name, size = 26 }) {
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
