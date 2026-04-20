import React, { useState, useEffect, useRef } from 'react';

const WALK_W  = 260;  // walking strip width at bottom-right of screen (px)
const PANDA_W = 36;   // panda element width

/* ─── Walking Panda SVG ─── */
const PandaWalk = () => (
  <svg viewBox="0 0 36 44" width="34" height="42" fill="none" overflow="visible">
    <defs>
      <filter id="pw-ol" x="-25%" y="-25%" width="150%" height="150%">
        <feMorphology operator="dilate" radius="1.3" in="SourceAlpha" result="d" />
        <feFlood floodColor="rgba(255,255,255,0.88)" result="c" />
        <feComposite in="c" in2="d" operator="in" result="o" />
        <feMerge><feMergeNode in="o" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    <g filter="url(#pw-ol)">
      {/* Legs (behind body, animated) */}
      <g className="panda-leg-l">
        <ellipse cx="13" cy="36" rx="4" ry="6" fill="#111" />
      </g>
      <g className="panda-leg-r">
        <ellipse cx="23" cy="36" rx="4" ry="6" fill="#111" />
      </g>
      {/* Body + head group that bobs */}
      <g className="panda-walk">
        <ellipse cx="18" cy="27"   rx="11.5" ry="10"  fill="white" stroke="#111" strokeWidth="1.2" />
        <ellipse cx="18" cy="28.5" rx="6.5"  ry="7"   fill="#efefef" />
        <ellipse cx="7"  cy="23.5" rx="3.5"  ry="6"   fill="#111" transform="rotate(-10 7 23.5)" />
        <ellipse cx="29" cy="23.5" rx="3.5"  ry="6"   fill="#111" transform="rotate(10 29 23.5)" />
        <circle  cx="18" cy="11"   r="9.5"             fill="white" stroke="#111" strokeWidth="1.2" />
        <circle  cx="10" cy="3.5"  r="4.2"             fill="#111" />
        <circle  cx="26" cy="3.5"  r="4.2"             fill="#111" />
        <circle  cx="10" cy="3.5"  r="1.8"             fill="#2a2a2a" />
        <circle  cx="26" cy="3.5"  r="1.8"             fill="#2a2a2a" />
        <ellipse cx="13.2" cy="10.5" rx="3.8" ry="3.4" fill="#111" transform="rotate(-10 13.2 10.5)" />
        <ellipse cx="22.8" cy="10.5" rx="3.8" ry="3.4" fill="#111" transform="rotate(10 22.8 10.5)" />
        <circle  cx="13.2" cy="10.8" r="1.6"           fill="white" />
        <circle  cx="22.8" cy="10.8" r="1.6"           fill="white" />
        <circle  cx="13.7" cy="10.8" r="0.75"          fill="#111" />
        <circle  cx="23.3" cy="10.8" r="0.75"          fill="#111" />
        <circle  cx="14.2" cy="10.2" r="0.35"          fill="white" />
        <circle  cx="23.8" cy="10.2" r="0.35"          fill="white" />
        <ellipse cx="18"   cy="14.5" rx="2.2"  ry="1.5" fill="#444" />
        <path d="M15.8 16 Q18 17.8 20.2 16" stroke="#555" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      </g>
    </g>
  </svg>
);

/* ─── Sitting Panda SVG ─── */
const PandaSit = () => (
  <svg viewBox="0 0 40 38" width="36" height="34" fill="none" overflow="visible">
    <defs>
      <filter id="ps-ol" x="-25%" y="-25%" width="150%" height="150%">
        <feMorphology operator="dilate" radius="1.3" in="SourceAlpha" result="d" />
        <feFlood floodColor="rgba(255,255,255,0.88)" result="c" />
        <feComposite in="c" in2="d" operator="in" result="o" />
        <feMerge><feMergeNode in="o" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    <g filter="url(#ps-ol)">
      <ellipse cx="8.5"  cy="32" rx="7"   ry="3.5" fill="#111" transform="rotate(-18 8.5 32)" />
      <ellipse cx="31.5" cy="32" rx="7"   ry="3.5" fill="#111" transform="rotate(18 31.5 32)" />
      <ellipse cx="20"   cy="24.5" rx="12" ry="9.5" fill="white" stroke="#111" strokeWidth="1.2" />
      <ellipse cx="20"   cy="25.5" rx="7"  ry="7"   fill="#efefef" />
      <ellipse cx="8.5"  cy="21"   rx="3.5" ry="6"  fill="#111" transform="rotate(22 8.5 21)" />
      <ellipse cx="31.5" cy="21"   rx="3.5" ry="6"  fill="#111" transform="rotate(-22 31.5 21)" />
      <circle  cx="20"   cy="10"   r="9.5"           fill="white" stroke="#111" strokeWidth="1.2" />
      <circle  cx="12"   cy="2.5"  r="4.2"           fill="#111" />
      <circle  cx="28"   cy="2.5"  r="4.2"           fill="#111" />
      <circle  cx="12"   cy="2.5"  r="1.8"           fill="#2a2a2a" />
      <circle  cx="28"   cy="2.5"  r="1.8"           fill="#2a2a2a" />
      <ellipse cx="15.2" cy="9.5"  rx="3.8" ry="3.4" fill="#111" transform="rotate(-10 15.2 9.5)" />
      <ellipse cx="24.8" cy="9.5"  rx="3.8" ry="3.4" fill="#111" transform="rotate(10 24.8 9.5)" />
      <circle  cx="15.2" cy="9.8"  r="1.6"           fill="white" />
      <circle  cx="24.8" cy="9.8"  r="1.6"           fill="white" />
      <ellipse cx="15.2" cy="10.3" rx="1.6" ry="0.85" fill="#111" />
      <ellipse cx="24.8" cy="10.3" rx="1.6" ry="0.85" fill="#111" />
      <ellipse cx="20"   cy="13.5" rx="2.2" ry="1.5"  fill="#444" />
      <path d="M17.8 15 Q20 16.8 22.2 15" stroke="#555" strokeWidth="0.9" fill="none" strokeLinecap="round" />
    </g>
  </svg>
);

/* ─── Panda component ─── */
const Panda = () => {
  const [visible, setVisible] = useState(!document.hidden);
  const [x, setX]             = useState(10);
  const [dir, setDir]         = useState(1);       // 1 = right, -1 = left
  const [sitting, setSitting] = useState(false);
  const stRef = useRef({ x: 10, dir: 1, sitting: false });

  // Hide when tab is hidden / window minimised
  useEffect(() => {
    const handler = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // Walk loop — no auto-sit
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden || stRef.current.sitting) return;
      const maxX = WALK_W - PANDA_W;
      const next = stRef.current.x + stRef.current.dir * 1.3;
      if (next >= maxX || next <= 0) {
        const nd = -stRef.current.dir;
        stRef.current.dir = nd;
        setDir(nd);
        return;
      }
      stRef.current.x = next;
      setX(next);
    }, 35);
    return () => clearInterval(id);
  }, []);

  // Click → toggle sit / resume walking
  const handleClick = () => {
    const next = !sitting;
    stRef.current.sitting = next;
    setSitting(next);
  };

  if (!visible) return null;

  return (
    /* Fixed walking strip — bottom-right of viewport */
    <div style={{
      position:      'fixed',
      bottom:        16,
      right:         0,
      width:         WALK_W,
      height:        60,
      pointerEvents: 'none',
      zIndex:        9999,
    }}>
      <div
        onClick={handleClick}
        style={{
          position:        'absolute',
          bottom:          0,
          left:            x,
          transform:       `scaleX(${dir > 0 ? 1 : -1})`,
          transformOrigin: 'center bottom',
          transition:      'transform 0.14s ease',
          pointerEvents:   'auto',
          cursor:          'pointer',
        }}
      >
        {sitting ? <PandaSit /> : <PandaWalk />}
      </div>
    </div>
  );
};

export default Panda;
