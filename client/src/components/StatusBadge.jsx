function StatusBadge({ status }) {
  return <span className={`badge badge--${status}`}>{status}</span>;
}

export default StatusBadge;