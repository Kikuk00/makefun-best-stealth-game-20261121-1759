// HUD: the top bar (level, timer, score, intel), the detection meter that
// fills when a guard sees the courier, and the alert banner.
export function drawHud(ctx, w, game) {
  const pad = 14;
  const barH = 46;
  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 18, 0.82)';
  ctx.fillRect(0, 0, w, barH);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.fillRect(0, barH, w, 1);

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8e4d8';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  const level = game.levelDef;
  ctx.fillText(`NIGHT COURIER — ${level.name.toUpperCase()}  ·  LEVEL ${game.levelIndex + 1}/3`, pad, barH / 2 - 1);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#9aa3b2';
  const intel = game.intelGot;
  const intelTotal = game.intelTotal;
  ctx.fillText(`TIME ${formatTime(game.elapsed)}    SCORE ${game.score}    INTEL ${intel}/${intelTotal}    ${game.hasParcel ? 'PARCEL ✓  → REACH THE EXIT' : 'FIND THE PARCEL ✦'}`, pad, barH - 12);

  // Detection meter, right side: fills yellow → orange → red as guards see you.
  const meterW = 210;
  const meterH = 16;
  const mx = w - meterW - pad;
  const my = 10;
  const d = game.detection;
  ctx.textAlign = 'right';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillStyle = d > 66 ? '#ff5a4e' : d > 33 ? '#ffb02e' : '#c8ccd4';
  ctx.fillText(d > 66 ? 'SPOTTED!' : d > 33 ? 'SUSPICIOUS' : 'UNSEEN', mx - 10, my + meterH / 2);
  ctx.fillStyle = '#1c2230';
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(mx, my, meterW, meterH, 4);
  ctx.fill();
  ctx.stroke();
  const fillColor = d > 66 ? '#ff4538' : d > 33 ? '#ff9f1c' : '#ffd23e';
  if (d > 0.5) {
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.roundRect(mx + 1, my + 1, Math.max(4, (meterW - 2) * (d / 100)), meterH - 2, 3);
    ctx.fill();
  }
  ctx.fillStyle = '#e8e4d8';
  ctx.textAlign = 'left';
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillText('DETECTION', mx, my + meterH + 11);

  // Alert banner under the bar while any guard is alerted.
  if (game.anyAlerted()) {
    const flash = 0.55 + 0.45 * Math.sin(game.time * 6);
    ctx.fillStyle = `rgba(255, 42, 28, ${0.75 * flash})`;
    ctx.fillRect(0, barH + 1, w, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠  ALARM — BREAK LINE OF SIGHT AND HIDE  ⚠', w / 2, barH + 14);
  }
  ctx.restore();
}

/** mm:ss for the level timer. */
export function formatTime(seconds) {
  const s = Math.floor(seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Bottom hint line, drawn over the play field. */
export function drawHints(ctx, w, h, game) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(232, 228, 216, 0.75)';
  const hint = game.hasParcel
    ? 'WASD / arrows move · Shift run (loud!) · C sneak · click to walk · reach the green EXIT'
    : 'WASD / arrows move · Shift run (loud!) · C sneak · click to walk · grab the glowing PARCEL ✦';
  ctx.fillText(hint, w / 2, h - 10);
  ctx.restore();
}
