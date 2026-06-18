/* global React */
/*
  FaultyTerminal — thin React wrapper over the framework-free engine in
  components/faulty-terminal-core.js (window.FaultyTerminalMount). The engine
  (THREE full-screen shader, brand edits, reduced-motion handling) lives in the
  core so it can be shared with the vanilla loader boot backdrop without relying
  on Babel timing. Exposed as window.FaultyTerminal.
*/
function FaultyTerminal(props) {
  const p = props || {};
  const { useEffect, useRef } = React;
  const ref = useRef(null);

  useEffect(function () {
    if (!ref.current || typeof window.FaultyTerminalMount !== 'function') return;
    const dispose = window.FaultyTerminalMount(ref.current, {
      scale: p.scale,
      gridMul: p.gridMul,
      digitSize: p.digitSize,
      timeScale: p.timeScale,
      scanlineIntensity: p.scanlineIntensity,
      glitchAmount: p.glitchAmount,
      flickerAmount: p.flickerAmount,
      noiseAmp: p.noiseAmp,
      chromaticAberration: p.chromaticAberration,
      dither: p.dither,
      curvature: p.curvature,
      tint: p.tint,
      mouseReact: p.mouseReact,
      mouseStrength: p.mouseStrength,
      brightness: p.brightness
    });
    return dispose;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.scale, p.digitSize, p.timeScale, p.scanlineIntensity, p.glitchAmount,
      p.flickerAmount, p.noiseAmp, p.chromaticAberration, p.dither, p.curvature,
      p.tint, p.mouseReact, p.mouseStrength, p.brightness]);

  return <div ref={ref} className={'faulty-terminal ' + (p.className || '')} aria-hidden="true" />;
}

window.FaultyTerminal = FaultyTerminal;
