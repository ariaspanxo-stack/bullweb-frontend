const fs = require("fs");
const c = fs.readFileSync("src/pages/CartaQRPage.tsx", "utf8");
const lines = c.split("\n");
let depth = 0, inReturn = false;
for (let i = 285; i < lines.length; i++) {
  const raw = lines[i].replace("\r", "");
  if (!inReturn && raw.trim().startsWith("return (")) { inReturn = true; }
  if (!inReturn) continue;
  let lineDepthChange = 0;
  for (let j = 0; j < raw.length; j++) {
    const ch = raw[j];
    if (ch === "{") { depth++; lineDepthChange++; }
    else if (ch === "}") { depth--; lineDepthChange--; }
  }
  // Report lines with unusual depth changes or depths
  if (depth > 15 || depth < 0 || lineDepthChange < -3) {
    console.log("L"+(i+1)+" depth="+depth+" delta="+lineDepthChange+" | "+raw.trim().slice(0,80));
  }
}
console.log("Final depth:", depth);
