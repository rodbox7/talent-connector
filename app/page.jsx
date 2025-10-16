
function SalarySlider() {
  const min = 0, max = 400000, step = 5000;
  const pct = (v) => ((v - min) / (max - min)) * 100;

  const sel = {
    position: 'absolute',
    top: 7,
    left: `${pct(minSalary)}%`,
    right: `${100 - pct(maxSalary)}%`,
    height: 4,
    background: '#4F46E5',
    borderRadius: 999,
    pointerEvents: 'none',
  };

  const clamp = (v) => Math.min(max, Math.max(min, v));
  const onLow = (e) => setMinSalary(Math.min(clamp(+e.target.value), maxSalary - step));
  const onHigh = (e) => setMaxSalary(Math.max(clamp(+e.target.value), minSalary + step));

  return (
    <div>
      <Label>Salary range</Label>
      <div style={trackBase}>
        <div style={rail} />
        <div style={sel} />
        <input
          className="dual-range"
          type="range"
          min={min}
          max={max}
          step={step}
          value={minSalary}
          onChange={onLow}
          style={{ zIndex: 3 }}
        />
        <input
          className="dual-range"
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxSalary}
          onChange={onHigh}
          style={{ zIndex: 4 }}
        />
        <style>{sliderCss}</style>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
        <span>${minSalary.toLocaleString()}</span>
        <span>${maxSalary.toLocaleString()}</span>
      </div>
    </div>
  );
}
``
