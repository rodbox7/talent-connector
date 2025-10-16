/* ====== DRAG-FRIENDLY dual-slider CSS (Chrome/Windows) ====== */
const sliderCss = `
  .dual-range { 
    -webkit-appearance:none; appearance:none; background:transparent; 
    position:absolute; left:0; right:0; top:-7px; height:28px; width:100%; margin:0; 
  }
  .dual-range.low  { z-index:3; }
  .dual-range.high { z-index:4; }
  .dual-range::-webkit-slider-runnable-track { background:transparent; }
  .dual-range::-moz-range-track { background:transparent; }
  /* thumbs */
  .dual-range::-webkit-slider-thumb {
    -webkit-appearance:none; width:18px; height:18px; border-radius:999px; 
    background:#22d3ee; border:2px solid #0b0b0b; cursor: pointer;
  }
  .dual-range::-moz-range-thumb {
    width:18px; height:18px; border-radius:999px; 
    background:#22d3ee; border:2px solid #0b0b0b; cursor: pointer;
  }
`;

/* Reusable dual-range with drag lockout on the opposite slider */
function DualRange({ min, max, step, low, high, onLow, onHigh, label, leftText, rightText }) {
  const [dragging, setDragging] = React.useState(null); // 'low' | 'high' | null
  const pct = (v) => ((v - min) / (max - min)) * 100;

  const track = { position: 'relative', height: 4, background: '#1F2937', borderRadius: 999 };
  const sel = {
    position: 'absolute',
    top: 0,
    left: `${pct(low)}%`,
    right: `${100 - pct(high)}%`,
    height: 4,
    background: '#4F46E5',
    borderRadius: 999,
    pointerEvents: 'none',
  };

  // Lock out opposite input while dragging to keep pointer capture
  const lowStyle  = dragging === 'high' ? { pointerEvents: 'none' } : null;
  const highStyle = dragging === 'low'  ? { pointerEvents: 'none' } : null;

  function clamp(v) { return Math.min(max, Math.max(min, v)); }
  function handleLow(e)  { onLow(Math.min(clamp(+e.target.value), high)); }
  function handleHigh(e) { onHigh(Math.max(clamp(+e.target.value), low)); }

  return (
    <div>
      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>{label}</div>
      <div style={{ position: 'relative', height: 28 }}>
        <div style={track} />
        <div style={sel} />
        <input
          className="dual-range low"
          type="range"
          min={min}
          max={max}
          step={step}
          value={low}
          onChange={handleLow}
          onInput={handleLow}
          onPointerDown={() => setDragging('low')}
          onPointerUp={() => setDragging(null)}
          onPointerCancel={() => setDragging(null)}
          style={lowStyle}
        />
        <input
          className="dual-range high"
          type="range"
          min={min}
          max={max}
          step={step}
          value={high}
          onChange={handleHigh}
          onInput={handleHigh}
          onPointerDown={() => setDragging('high')}
          onPointerUp={() => setDragging(null)}
          onPointerCancel={() => setDragging(null)}
          style={highStyle}
        />
        <style>{sliderCss}</style>
      </div>
      <div style={{ display: 'flex', justifyContent: 'between', marginTop: 6, fontSize: 12, justifyContent:'space-between' }}>
        <span>{leftText}</span>
        <span>{rightText}</span>
      </div>
    </div>
  );
}

/* Salary slider (reuses DualRange) */
function SalarySlider() {
  const min = 0, max = 400000, step = 5000;
  return (
    <DualRange
      min={min}
      max={max}
      step={step}
      low={minSalary}
      high={maxSalary}
      onLow={(v) => setMinSalary(v)}
      onHigh={(v) => setMaxSalary(v)}
      label="Salary range"
      leftText={`$${minSalary.toLocaleString()}`}
      rightText={`$${maxSalary.toLocaleString()}`}
    />
  );
}

/* Years slider (reuses DualRange) */
function YearsSlider() {
  const min = 0, max = 50, step = 1;
  return (
    <DualRange
      min={min}
      max={max}
      step={step}
      low={minYears}
      high={maxYears}
      onLow={(v) => setMinYears(v)}
      onHigh={(v) => setMaxYears(v)}
      label="Years of experience"
      leftText={`${minYears} yrs`}
      rightText={`${maxYears} yrs`}
    />
  );
}
