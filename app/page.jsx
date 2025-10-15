
function TwoThumb({ min, max, step, valueMin, valueMax, onChangeMin, onChangeMax }) {
  const pctMin = ((valueMin - min) / (max - min)) * 100;
  const pctMax = ((valueMax - min) / (max - min)) * 100;

  const base = {
    WebkitAppearance: 'none',
    appearance: 'none',
    width: '100%',
    background: 'transparent',
    outline: 'none',
    position: 'absolute',
    top: 0,
    left: 0,
    height: 24,
    margin: 0,
    pointerEvents: 'auto',
  };

  function clampMin(v) {
    const nv = Math.min(Math.max(v, min), valueMax - step);
    onChangeMin(nv);
  }

  function clampMax(v) {
    const nv = Math.max(Math.min(v, max), valueMin + step);
    onChangeMax(nv);
  }

  return (
    <div style={{ position: 'relative', height: 24 }}>
      {/* track */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 0,
          right: 0,
          height: 4,
          borderRadius: 999,
          background: 'rgba(148,163,184,0.25)',
        }}
      />
      {/* selected range */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          height: 4,
          left: `${pctMin}%`,
          width: `${Math.max(0, pctMax - pctMin)}%`,
          background: '#4f46e5',
          borderRadius: 999,
        }}
      />

      {/* lower thumb */}
      <input
        type="range"
        min={min}
        max={max - step}
        step={step}
        value={valueMin}
        onChange={(e) => clampMin(Number(e.target.value))}
        style={{ ...base, zIndex: valueMin < valueMax ? 3 : 5 }}
      />
      {/* upper thumb */}
      <input
        type="range"
        min={min + step}
        max={max}
        step={step}
        value={valueMax}
        onChange={(e) => clampMax(Number(e.target.value))}
        style={{ ...base, zIndex: valueMax > valueMin ? 4 : 5 }}
      />

      {/* thumb styles */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #2563eb;
          border: 2px solid #93c5fd;
          cursor: pointer;
          margin-top: -6px;
        }
        input[type="range"]::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #2563eb;
          border: 2px solid #93c5fd;
          cursor: pointer;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          height: 4px;
          background: transparent;
        }
        input[type="range"]::-moz-range-track {
          height: 4px;
          background: transparent;
        }
      `}</style>
    </div>
  );
}
