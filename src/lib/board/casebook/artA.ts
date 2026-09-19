import { canvas as mkCanvas, grain, pinholes, wrapText } from './textures';
import { rnd, clamp } from './util';

export function photoCanvas(
  img: CanvasImageSource | null,
  caption: string,
  style?: string,
): HTMLCanvasElement {
  const c = mkCanvas(512, 600),
    x = c.getContext('2d')!;
  x.fillStyle = '#f2eee2';
  x.fillRect(0, 0, 512, 600);
  x.save();
  x.beginPath();
  x.rect(28, 28, 456, 456);
  x.clip();
  if (img) {
    const iw = (img as HTMLImageElement).width,
      ih = (img as HTMLImageElement).height;
    const s = Math.max(456 / iw, 456 / ih);
    x.drawImage(img, 256 - (iw * s) / 2, 256 + 28 - (ih * s) / 2, iw * s, ih * s);
  } else if (style === 'car') {
    const sky = x.createLinearGradient(0, 28, 0, 484);
    sky.addColorStop(0, '#131720');
    sky.addColorStop(1, '#05070b');
    x.fillStyle = sky;
    x.fillRect(28, 28, 456, 456);
    x.fillStyle = 'rgba(230,200,140,.12)';
    x.beginPath();
    x.arc(360, 120, 90, 0, 7);
    x.fill();
    x.fillStyle = '#0b0e13';
    x.fillRect(28, 340, 456, 144); // road
    x.fillStyle = '#11151c';
    x.beginPath(); // sedan body
    x.moveTo(90, 340);
    x.quadraticCurveTo(120, 268, 210, 262);
    x.quadraticCurveTo(320, 256, 370, 290);
    x.quadraticCurveTo(430, 300, 436, 340);
    x.closePath();
    x.fill();
    x.fillStyle = 'rgba(200,215,235,.16)';
    x.fillRect(160, 272, 140, 34); // windows
    x.fillStyle = 'rgba(255,220,150,.8)';
    x.beginPath();
    x.arc(428, 322, 8, 0, 7);
    x.fill(); // lamp
    ['#05070b', '#05070b'].forEach((cc, i) => {
      x.fillStyle = cc;
      x.beginPath();
      x.arc(150 + i * 200, 344, 26, 0, 7);
      x.fill();
    });
    x.strokeStyle = 'rgba(255,255,255,.07)';
    x.lineWidth = 1.5;
    for (let i = 0; i < 120; i++) {
      const rx = rnd(28, 484),
        ry = rnd(28, 340);
      x.beginPath();
      x.moveTo(rx, ry);
      x.lineTo(rx - 4, ry + 14);
      x.stroke();
    } // rain
    x.fillStyle = 'rgba(255,200,120,.1)';
    x.fillRect(28, 352, 456, 10); // wet glow
  } else if (style === 'alley') {
    x.fillStyle = '#07090d';
    x.fillRect(28, 28, 456, 456);
    const lg = x.createLinearGradient(0, 28, 0, 484);
    lg.addColorStop(0, 'rgba(190,205,230,.32)');
    lg.addColorStop(1, 'rgba(190,205,230,0)');
    x.fillStyle = lg;
    x.beginPath();
    x.moveTo(226, 28);
    x.lineTo(286, 28);
    x.lineTo(340, 484);
    x.lineTo(172, 484);
    x.closePath();
    x.fill();
    x.fillStyle = '#0d1117';
    x.beginPath();
    x.moveTo(28, 28);
    x.lineTo(226, 28);
    x.lineTo(206, 484);
    x.lineTo(28, 484);
    x.closePath();
    x.fill();
    x.fillStyle = '#0a0d12';
    x.beginPath();
    x.moveTo(286, 28);
    x.lineTo(484, 28);
    x.lineTo(484, 484);
    x.lineTo(306, 484);
    x.closePath();
    x.fill();
    x.fillStyle = 'rgba(220,230,250,.08)';
    for (let i = 0; i < 14; i++)
      x.fillRect(rnd(40, 190), rnd(60, 420), rnd(14, 30), rnd(18, 36));
    for (let i = 0; i < 14; i++)
      x.fillRect(rnd(320, 460), rnd(60, 420), rnd(14, 30), rnd(18, 36));
    x.fillStyle = 'rgba(190,205,230,.5)';
    x.fillRect(236, 80, 40, 60); // far light
  } else if (style === 'loft') {
    x.fillStyle = '#0c0f14';
    x.fillRect(28, 28, 456, 456);
    x.fillStyle = '#b9c6da';
    x.fillRect(180, 60, 150, 220); // window
    x.strokeStyle = '#0c0f14';
    x.lineWidth = 8;
    x.strokeRect(180, 60, 150, 220);
    x.beginPath();
    x.moveTo(255, 60);
    x.lineTo(255, 280);
    x.moveTo(180, 170);
    x.lineTo(330, 170);
    x.stroke();
    const beam = x.createLinearGradient(200, 280, 290, 470);
    beam.addColorStop(0, 'rgba(200,215,235,.25)');
    beam.addColorStop(1, 'rgba(200,215,235,0)');
    x.fillStyle = beam;
    x.beginPath();
    x.moveTo(185, 280);
    x.lineTo(330, 280);
    x.lineTo(420, 484);
    x.lineTo(110, 484);
    x.closePath();
    x.fill();
    x.fillStyle = '#141920';
    x.fillRect(60, 330, 150, 80);
    x.fillRect(60, 310, 150, 26); // sofa
    x.fillStyle = '#10141a';
    x.fillRect(250, 370, 130, 50); // table
    x.fillStyle = '#0a0d11';
    x.fillRect(70, 414, 440, 70); // floor shade
  } else if (style === 'fiber') {
    x.fillStyle = '#e8e4d6';
    x.fillRect(28, 28, 456, 456);
    x.strokeStyle = '#8a8574';
    x.lineWidth = 1.5;
    for (let i = 0; i < 10; i++) {
      x.beginPath();
      x.moveTo(48 + i * 44, 440);
      x.lineTo(48 + i * 44, 456);
      x.stroke();
      x.font = '12px monospace';
      x.fillStyle = '#8a8574';
      x.fillText(i + '', 44 + i * 44, 436);
    }
    x.fillStyle = '#14110e';
    for (let i = 0; i < 220; i++) {
      // fiber clump
      x.save();
      x.translate(256 + rnd(-46, 46), 230 + rnd(-40, 40));
      x.rotate(rnd(0, 6.3));
      x.fillRect(0, 0, rnd(4, 26), rnd(1, 2.4));
      x.restore();
    }
    x.fillStyle = 'rgba(176,23,34,.85)';
    x.fillRect(330, 60, 120, 42);
    x.fillStyle = '#fff';
    x.font = 'bold 20px monospace';
    x.textAlign = 'center';
    x.fillText('14-8397', 390, 88);
    x.textAlign = 'left';
  } else {
    const sky = x.createLinearGradient(0, 28, 0, 300);
    sky.addColorStop(0, '#3a4657');
    sky.addColorStop(1, '#141a24');
    x.fillStyle = sky;
    x.fillRect(28, 28, 456, 272);
    x.fillStyle = '#0c0f14';
    x.fillRect(28, 300, 456, 184);
  }
  x.fillStyle = 'rgba(255,255,255,.1)';
  x.fillRect(28, 28, 456, 110);
  for (let i = 0; i < 1200; i++) {
    x.fillStyle = `rgba(0,0,0,${rnd(0.02, 0.08)})`;
    x.fillRect(rnd(28, 484), rnd(28, 484), 1.4, 1.4);
  }
  x.restore();
  x.strokeStyle = 'rgba(0,0,0,.15)';
  x.strokeRect(28, 28, 456, 456);
  x.fillStyle = '#3a352c';
  x.font = '26px "Courier New",monospace';
  x.textAlign = 'center';
  wrapText(x, caption || '', 256, 540, 440, 30);
  grain(x, 512, 600, 900);
  pinholes(x, 512);
  return c;
}

export function suspectCanvas(
  name: string,
  note: string,
  role?: string,
  gender?: string,
): HTMLCanvasElement {
  const c = mkCanvas(460, 600),
    x = c.getContext('2d')!;
  x.fillStyle = '#e6e0cf';
  x.fillRect(0, 0, 460, 600);
  x.save();
  x.beginPath();
  x.rect(26, 26, 408, 400);
  x.clip();
  x.fillStyle = '#cfd6cf';
  x.fillRect(26, 26, 408, 400);
  x.strokeStyle = 'rgba(60,70,60,.5)';
  x.lineWidth = 1.5;
  for (let y = 46; y < 426; y += 38) {
    x.beginPath();
    x.moveTo(26, y);
    x.lineTo(434, y);
    x.stroke();
    x.fillStyle = 'rgba(60,70,60,.6)';
    x.font = '13px "Courier New",monospace';
    x.textAlign = 'left';
    x.fillText(190 - ((y - 46) / 38) * 10 + '', 34, y - 4);
  }
  x.fillStyle = '#20242a';
  const hw = gender === 'f' ? 58 : 66;
  x.beginPath();
  x.ellipse(230, 200, hw, hw * 1.28, 0, 0, 7);
  x.fill();
  if (gender === 'f') {
    x.beginPath();
    x.ellipse(230, 240, hw * 1.25, hw * 1.1, 0, 0, 7);
    x.fill();
  }
  x.beginPath();
  x.moveTo(120, 426);
  x.quadraticCurveTo(130, 296, 230, 288);
  x.quadraticCurveTo(330, 296, 340, 426);
  x.closePath();
  x.fill();
  x.fillStyle = 'rgba(255,255,255,.05)';
  x.beginPath();
  x.ellipse(206, 178, 18, 30, -0.4, 0, 7);
  x.fill();
  x.restore();
  x.strokeStyle = '#3a352c';
  x.lineWidth = 3;
  x.strokeRect(26, 26, 408, 400);
  x.fillStyle = '#1d1a14';
  x.font = 'bold 33px "Courier New",monospace';
  x.textAlign = 'center';
  x.fillText(name.toUpperCase(), 230, 478, 410);
  x.fillStyle = '#5a5244';
  x.font = '19px "Courier New",monospace';
  wrapText(x, note || '', 230, 514, 400, 24);
  if (role) {
    const cols: Record<string, string> = {
      'PERSON OF INTEREST': '#a8231e',
      DECEASED: '#7a1815',
      WITNESS: '#4a4438',
      ASSOCIATE: '#4a4438',
    };
    x.fillStyle = cols[role] || '#a8231e';
    x.fillRect(90, 556, 280, 34);
    x.fillStyle = '#f0ead8';
    x.font = 'bold 18px "Courier New",monospace';
    x.fillText(role, 230, 579);
  }
  grain(x, 460, 600, 800);
  pinholes(x, 460);
  return c;
}

export function stickyCanvas(text: string, tint?: string): HTMLCanvasElement {
  const c = mkCanvas(420, 420),
    x = c.getContext('2d')!;
  const cols: Record<string, [string, string]> = {
    y: ['#f4d94a', '#e8c62e'],
    p: ['#f2a2c0', '#e389ad'],
    g: ['#b7e07e', '#a3cf67'],
    b: ['#8fd0e8', '#79bfd9'],
  };
  const [c1, c2] = cols[tint || ''] || cols.y;
  const g = x.createLinearGradient(0, 0, 420, 420);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  x.fillStyle = g;
  x.fillRect(0, 0, 420, 420);
  x.fillStyle = 'rgba(255,255,255,.28)';
  x.fillRect(0, 0, 420, 54);
  for (let i = 0; i < 10; i++) {
    x.strokeStyle = `rgba(120,90,10,${rnd(0.03, 0.09)})`;
    x.lineWidth = rnd(1, 3);
    x.beginPath();
    x.moveTo(rnd(0, 420), rnd(0, 420));
    x.quadraticCurveTo(rnd(0, 420), rnd(0, 420), rnd(0, 420), rnd(0, 420));
    x.stroke();
  }
  x.fillStyle = '#26221a';
  x.font = 'italic 600 34px "Segoe Script","Bradley Hand",cursive';
  x.textAlign = 'center';
  const lines = String(text).split('\n');
  let yy = 210 - (lines.length - 1) * 24;
  for (const ln of lines) {
    yy = wrapText(x, ln, 210, yy, 360, 44) + 44;
  }
  grain(x, 420, 420, 400);
  return c;
}

export function docCanvas(title: string, body: string): HTMLCanvasElement {
  const c = mkCanvas(460, 620),
    x = c.getContext('2d')!;
  x.fillStyle = '#efe9d8';
  x.fillRect(0, 0, 460, 620);
  x.fillStyle = '#20242a';
  x.fillRect(0, 0, 460, 86);
  x.fillStyle = '#e8dfc8';
  x.font = 'bold 26px "Courier New",monospace';
  x.textAlign = 'left';
  x.fillText('POLICE DEPT — CASE FILE', 24, 40);
  x.font = '17px "Courier New",monospace';
  x.fillText('REF BW-47-0924 · HOMICIDE DIV.', 24, 68);
  x.fillStyle = '#1d1a14';
  x.font = 'bold 26px "Courier New",monospace';
  x.fillText(title.toUpperCase(), 30, 132, 400);
  x.strokeStyle = 'rgba(30,26,18,.5)';
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(30, 148);
  x.lineTo(430, 148);
  x.stroke();
  x.fillStyle = '#3c362b';
  x.font = '20px "Courier New",monospace';
  let yy = wrapText(x, body, 30, 186, 398, 28) + 40;
  for (let i = 0; i < 4 && yy < 540; i++) {
    x.fillStyle = '#14120e';
    x.fillRect(30, yy, rnd(160, 380), 20);
    yy += 34;
  }
  x.save();
  x.translate(340, 560);
  x.rotate(-0.18);
  x.strokeStyle = 'rgba(170,32,26,.75)';
  x.lineWidth = 5;
  x.strokeRect(-105, -28, 210, 56);
  x.fillStyle = 'rgba(170,32,26,.75)';
  x.font = 'bold 28px "Courier New",monospace';
  x.textAlign = 'center';
  x.fillText('CONFIDENTIAL', 0, 10);
  x.restore();
  grain(x, 460, 620, 900);
  pinholes(x, 460);
  return c;
}

export function newsCanvas(
  headline: string,
  paperName?: string,
  chart?: boolean,
): HTMLCanvasElement {
  const c = mkCanvas(540, 640),
    x = c.getContext('2d')!;
  x.fillStyle = '#e9e2cd';
  x.fillRect(0, 0, 540, 640);
  x.fillStyle = '#191510';
  x.font = 'bold 40px Georgia,serif';
  x.textAlign = 'center';
  x.fillText(paperName || 'THE DAILY HERALD', 270, 52);
  x.font = '15px "Courier New",monospace';
  x.fillText('VOL. XCIV · OCT 12, 2023 · 25¢', 270, 80);
  x.strokeStyle = '#191510';
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(24, 94);
  x.lineTo(516, 94);
  x.stroke();
  x.font = 'bold 42px Georgia,serif';
  const endY = wrapText(x, headline.toUpperCase(), 270, 148, 490, 48);
  const top = endY + 34;
  if (chart) {
    // declining stock chart
    x.strokeStyle = '#191510';
    x.lineWidth = 2;
    x.strokeRect(40, top, 220, 150);
    x.strokeStyle = '#7a1815';
    x.lineWidth = 4;
    x.beginPath();
    let px = 48,
      py = top + 26;
    x.moveTo(px, py);
    for (let i = 1; i < 9; i++) {
      px = 48 + i * 25;
      py = top + 26 + i * 13 + rnd(-14, 10);
      x.lineTo(px, clamp(py, top + 10, top + 140));
    }
    x.stroke();
    x.fillStyle = '#191510';
    x.font = '12px "Courier New",monospace';
    x.fillText('LWT −34%', 150, top + 142);
  } else {
    x.fillStyle = '#c9c1ab';
    x.fillRect(40, top, 220, 150);
    for (let yy = top + 4; yy < top + 146; yy += 6)
      for (let xx = 44; xx < 256; xx += 6) {
        x.fillStyle = `rgba(25,21,16,${rnd(0.05, 0.5)})`;
        x.beginPath();
        x.arc(xx, yy, rnd(0.6, 2.2), 0, 7);
        x.fill();
      }
    x.strokeStyle = '#191510';
    x.lineWidth = 2;
    x.strokeRect(40, top, 220, 150);
  }
  x.strokeStyle = 'rgba(25,21,16,.55)';
  x.lineWidth = 2.4;
  const col = (cx: number, cy: number, cw: number, n: number) => {
    for (let i = 0; i < n; i++) {
      x.beginPath();
      x.moveTo(cx, cy + i * 13);
      x.lineTo(cx + cw * rnd(0.72, 1), cy + i * 13);
      x.stroke();
    }
  };
  col(284, top + 6, 214, Math.max(4, (150 / 13) | 0));
  const rows = Math.max(3, ((610 - (top + 178)) / 13) | 0);
  col(40, top + 178, 214, rows);
  col(284, top + 178, 214, rows);
  grain(x, 540, 640, 700);
  pinholes(x, 540);
  return c;
}
