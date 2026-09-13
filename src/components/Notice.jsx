/** A small colored banner for warnings — currently just the one "kind". */
export default function Notice({ kind = "warning", children }) {
  return <p className={`notice notice--${kind}`}>{children}</p>;
}
