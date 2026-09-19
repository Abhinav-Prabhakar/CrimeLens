/**
 * Card art, part B — fingerprint, map, statement, evidence bag, keys, floor plan.
 * Ported byte-for-byte from the reference single-file app.
 */

import { canvas as mkCanvas, grain, pinholes, wrapText } from "./textures";
import { rnd } from "./util";

export function printCanvas(label: string): HTMLCanvasElement {
  const c = mkCanvas(400, 500),
    x = c.getContext("2d")!;
  x.fillStyle = "#f4f0e4";
  x.fillRect(0, 0, 400, 500);
  x.strokeStyle = "#20242a";
  x.lineWidth = 3;
  x.strokeRect(18, 18, 364, 464);
  x.beginPath();
  x.moveTo(200, 18);
  x.lineTo(200, 430);
  x.stroke();
  x.fillStyle = "#20242a";
  x.font = 'bold 20px "Courier New",monospace';
  x.textAlign = "center";
  const two = String(label).split("·");
  (
    [
      [110, two[0] || "F-12"],
      [290, two[1] || "#6-211"],
    ] as [number, string][]
  ).forEach(([cx, lab]) => {
    x.fillStyle = "#20242a";
    x.fillText(lab.trim(), cx, 52);
    x.save();
    x.translate(cx, 250);
    for (let r = 6; r < 78; r += 6) {
      x.strokeStyle = `rgba(25,25,40,${rnd(0.55, 0.9)})`;
      x.lineWidth = rnd(2, 3);
      let a = Math.random() * 6.28;
      for (let s = 0, gaps = (2 + Math.random() * 3) | 0; s < gaps; s++) {
        const len = rnd(1.2, 2.6);
        x.beginPath();
        x.ellipse(
          rnd(-3, 3),
          rnd(-3, 3) + r * 0.12,
          r,
          r * 0.8,
          rnd(-0.2, 0.2),
          a,
          a + len,
        );
        x.stroke();
        a += len + rnd(0.3, 0.9);
      }
    }
    x.restore();
  });
  x.fillStyle = "#5a5244";
  x.font = '16px "Courier New",monospace';
  x.fillText("LIFTED: LOFT 4B · WINDOWSILL", 200, 458);
  grain(x, 400, 500, 600);
  pinholes(x, 400);
  return c;
}

export function mapCanvas(place: string): HTMLCanvasElement {
  const c = mkCanvas(520, 520),
    x = c.getContext("2d")!;
  x.fillStyle = "#dfd6ba";
  x.fillRect(0, 0, 520, 520);
  x.fillStyle = "#c9bd9c";
  x.beginPath();
  x.moveTo(0, 380);
  x.quadraticCurveTo(200, 330, 520, 400);
  x.lineTo(520, 520);
  x.lineTo(0, 520);
  x.closePath();
  x.fill();
  x.strokeStyle = "rgba(90,80,55,.8)";
  for (let i = 0; i < 9; i++) {
    x.lineWidth = rnd(3, 9);
    x.beginPath();
    x.moveTo(rnd(0, 520), 40);
    x.lineTo(rnd(0, 520), 380);
    x.stroke();
  }
  for (let i = 0; i < 7; i++) {
    x.lineWidth = rnd(3, 9);
    x.beginPath();
    x.moveTo(0, rnd(40, 360));
    x.lineTo(520, rnd(40, 360));
    x.stroke();
  }
  for (let i = 0; i < 26; i++) {
    x.fillStyle = `rgba(150,135,95,${rnd(0.25, 0.5)})`;
    x.fillRect(rnd(10, 460), rnd(50, 320), rnd(18, 50), rnd(14, 40));
  }
  x.strokeStyle = "#8a231e";
  x.lineWidth = 6;
  x.beginPath();
  x.ellipse(230, 200, 44, 34, 0.2, 0, 7);
  x.stroke(); // red circle like mock
  x.fillStyle = "#1d1a14";
  x.font = 'bold 24px "Courier New",monospace';
  x.textAlign = "left";
  x.fillText(place.toUpperCase(), 22, 32);
  grain(x, 520, 520, 700);
  pinholes(x, 520);
  return c;
}

export function statementCanvas(text: string, sig?: string): HTMLCanvasElement {
  const c = mkCanvas(440, 540),
    x = c.getContext("2d")!;
  x.fillStyle = "#f4f0e2";
  x.fillRect(0, 0, 440, 540);
  // spiral
  for (let i = 0; i < 12; i++) {
    x.strokeStyle = "#8f887a";
    x.lineWidth = 3;
    x.beginPath();
    x.arc(38 + i * 33, 22, 9, 0, 7);
    x.stroke();
    x.fillStyle = "#0c0a09";
    x.beginPath();
    x.arc(38 + i * 33, 22, 4, 0, 7);
    x.fill();
  }
  x.strokeStyle = "rgba(120,110,90,.35)";
  x.lineWidth = 1.5;
  for (let y = 110; y < 510; y += 38) {
    x.beginPath();
    x.moveTo(26, y);
    x.lineTo(414, y);
    x.stroke();
  }
  x.fillStyle = "#1d1a14";
  x.font = 'bold 24px "Courier New",monospace';
  x.textAlign = "center";
  x.fillText("WITNESS STATEMENT", 220, 76);
  x.fillStyle = "#232d52";
  x.font = 'italic 27px "Segoe Script","Bradley Hand",cursive';
  let yy = 142;
  for (const ln of String(text).split("\n"))
    yy = wrapText(x, ln, 220, yy, 370, 38) + 38;
  if (sig) {
    x.textAlign = "right";
    x.font = 'italic 25px "Segoe Script",cursive';
    x.fillText("— " + sig, 404, Math.min(yy + 30, 506));
  }
  grain(x, 440, 540, 500);
  pinholes(x, 440);
  return c;
}

export function bagCanvas(
  no: string,
  date: string,
  notes: string,
): HTMLCanvasElement {
  const c = mkCanvas(430, 560),
    x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 0, 560);
  g.addColorStop(0, "#d8c9a4");
  g.addColorStop(1, "#c7b58c");
  x.fillStyle = g;
  x.fillRect(0, 0, 430, 560);
  x.strokeStyle = "rgba(90,70,40,.5)";
  x.lineWidth = 2;
  x.strokeRect(8, 8, 414, 544);
  x.fillStyle = "#2a241c";
  x.fillRect(8, 8, 414, 52);
  x.fillStyle = "#e8dcc0";
  x.font = 'bold 27px "Courier New",monospace';
  x.textAlign = "center";
  x.fillText("EVIDENCE", 215, 44);
  x.fillStyle = "#2a241c";
  x.font = '17px "Courier New",monospace';
  x.textAlign = "left";
  const rows = [
    ["BAG NO.", no],
    ["DATE", date],
    ["COLLECTED BY", "Det. R. Parker"],
    ["NOTES", ""],
  ];
  let yy = 104;
  for (const [k, v] of rows) {
    x.font = 'bold 15px "Courier New",monospace';
    x.fillStyle = "#5a4d38";
    x.fillText(k, 30, yy);
    x.strokeStyle = "rgba(90,70,40,.6)";
    x.beginPath();
    x.moveTo(30, yy + 34);
    x.lineTo(400, yy + 34);
    x.stroke();
    x.font = 'italic 24px "Segoe Script",cursive';
    x.fillStyle = "#232d52";
    x.fillText(v, 140, yy + 26);
    yy += 72;
  }
  x.font = 'italic 23px "Segoe Script",cursive';
  x.fillStyle = "#232d52";
  wrapText(x, notes, 30, yy - 24, 370, 34);
  x.font = 'bold 15px "Courier New",monospace';
  x.fillStyle = "#5a4d38";
  x.fillText("CHAIN OF CUSTODY", 30, 486);
  x.strokeStyle = "rgba(90,70,40,.6)";
  x.beginPath();
  x.moveTo(30, 516);
  x.lineTo(400, 516);
  x.stroke();
  x.font = 'italic 21px "Segoe Script",cursive';
  x.fillStyle = "#232d52";
  x.fillText("R.P. → forensics lab", 40, 510);
  grain(x, 430, 560, 600);
  pinholes(x, 430);
  return c;
}

export function keyCanvas(label: string): HTMLCanvasElement {
  const c = mkCanvas(360, 480),
    x = c.getContext("2d")!;
  x.clearRect(0, 0, 360, 480);
  x.fillStyle = "rgba(0,0,0,0)";
  x.fillRect(0, 0, 360, 480);
  // manila tag
  x.fillStyle = "#e3cf9e";
  x.beginPath();
  x.moveTo(120, 20);
  x.lineTo(240, 20);
  x.lineTo(280, 86);
  x.lineTo(280, 220);
  x.lineTo(80, 220);
  x.lineTo(80, 86);
  x.closePath();
  x.fill();
  x.strokeStyle = "rgba(120,95,50,.7)";
  x.lineWidth = 3;
  x.stroke();
  x.fillStyle = "#f4f0e2";
  x.beginPath();
  x.arc(180, 58, 13, 0, 7);
  x.fill();
  x.strokeStyle = "#8f7c4c";
  x.lineWidth = 3;
  x.stroke();
  x.fillStyle = "#1d1a14";
  x.font = 'bold 44px "Courier New",monospace';
  x.textAlign = "center";
  x.fillText(label, 180, 150);
  x.font = 'bold 26px "Courier New",monospace';
  x.fillText("KEY", 180, 192);
  // key ring + keys
  x.strokeStyle = "#9a8046";
  x.lineWidth = 7;
  x.beginPath();
  x.arc(180, 262, 34, 0, 7);
  x.stroke();
  const key = (kx: number, ky: number, rot: number, len: number) => {
    x.save();
    x.translate(kx, ky);
    x.rotate(rot);
    x.strokeStyle = "#8c8478";
    x.lineWidth = 9;
    x.beginPath();
    x.arc(0, 0, 17, 0, 7);
    x.stroke();
    x.beginPath();
    x.moveTo(0, 17);
    x.lineTo(0, 17 + len);
    x.stroke();
    x.lineWidth = 6;
    x.beginPath();
    x.moveTo(0, 17 + len);
    x.lineTo(14, 17 + len);
    x.moveTo(0, len + 2);
    x.lineTo(11, len + 2);
    x.stroke();
    x.restore();
  };
  key(150, 318, 0.35, 110);
  key(208, 320, -0.2, 96);
  return c;
}

export function planCanvas(): HTMLCanvasElement {
  const c = mkCanvas(480, 560),
    x = c.getContext("2d")!;
  x.fillStyle = "#f0ebdc";
  x.fillRect(0, 0, 480, 560);
  x.strokeStyle = "#20242a";
  x.lineWidth = 5;
  x.strokeRect(50, 60, 380, 420);
  x.lineWidth = 4;
  x.beginPath();
  x.moveTo(50, 240);
  x.lineTo(250, 240);
  x.moveTo(250, 60);
  x.lineTo(250, 320);
  x.moveTo(250, 320);
  x.lineTo(430, 320);
  x.moveTo(160, 240);
  x.lineTo(160, 480);
  x.stroke();
  // doors (arcs)
  x.lineWidth = 2;
  const door = (dx: number, dy: number, r: number, a0: number, a1: number) => {
    x.beginPath();
    x.arc(dx, dy, r, a0, a1);
    x.stroke();
  };
  door(210, 240, 42, Math.PI, Math.PI * 1.5);
  door(250, 290, 36, Math.PI * 0.5, Math.PI);
  door(160, 430, 40, -0.5 * Math.PI, 0);
  x.font = '15px "Courier New",monospace';
  x.fillStyle = "#3c362b";
  x.textAlign = "center";
  x.fillText("BEDROOM", 150, 150);
  x.fillText("LIVING", 340, 180);
  x.fillText("KITCHEN", 100, 370);
  x.fillText("ENTRY", 340, 420);
  // broken lock marker
  x.strokeStyle = "#8a231e";
  x.lineWidth = 5;
  x.beginPath();
  x.arc(430, 400, 26, 0, 7);
  x.stroke();
  x.font = 'bold 15px "Courier New",monospace';
  x.fillStyle = "#8a231e";
  x.fillText("LOCK", 430, 446);
  x.fillStyle = "#1d1a14";
  x.font = 'bold 22px "Courier New",monospace';
  x.fillText("LOFT 4B — FLOOR PLAN", 240, 36);
  x.font = '13px "Courier New",monospace';
  x.fillStyle = "#6a6152";
  x.fillText("SCALE 1:50 · BLDG 220 DOWNTOWN", 240, 522);
  grain(x, 480, 560, 700);
  pinholes(x, 480);
  return c;
}
