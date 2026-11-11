function BarChart({ data, valueKey, label, format = (v) => v }) {
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  const width = 720;
  const height = 180;
  const gap = 2;
  const barWidth = Math.max(width / data.length - gap, 1);

  return (
    <figure className="chart">
      <figcaption>{label}</figcaption>
      <div className="chart__scroll">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} preserveAspectRatio="none">
          {data.map((d, i) => {
            const barHeight = (d[valueKey] / max) * (height - 4);
            return (
              <rect
                key={d.date}
                x={i * (barWidth + gap)}
                y={height - barHeight}
                width={barWidth}
                height={barHeight}
                className="chart__bar"
              >
                <title>{`${d.date}: ${format(d[valueKey])}`}</title>
              </rect>
            );
          })}
        </svg>
      </div>
      <div className="chart__axis">
        <span>{data[0].date}</span>
        <span>{data[data.length - 1].date}</span>
      </div>
    </figure>
  );
}

export default BarChart;