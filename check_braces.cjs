const fs = require("fs");
const c = fs.readFileSync("src/pages/CartaQRPage.tsx", "utf8");
const lines = c.split("\n");
let depth = 0, inReturn = false;
const log = [];
for (let i = 285; i < lines.length; i++) {
  const raw = lines[i].replace("\r", "");
  if (!inReturn && raw.trim().startsWith("return (")) { inReturn = true; }
  if (!inReturn) continue;
  for (let j = 0; j < raw.length; j++) {
    const ch = raw[j];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth < 0) {
        log.push("NEGATIVE DEPTH at line " + (i+1) + " col " + j + ": " + raw.trim().slice(0, 80));
        depth = 0;
      }
    }
  }
  if (depth > 10) log.push("HIGH DEPTH " + depth + " at line " + (i+1) + ": " + raw.trim().slice(0,60));
}
log.forEach(l => console.log(l));
console.log("Final depth:", depth);
