import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const stylesRoot = path.join(
  root,
  "packages",
  "design-tokens",
  "src",
  "styles",
);

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory()
      ? files(full)
      : full.endsWith(".css")
        ? [full]
        : [];
  });
}

function parseBlocks(text) {
  const blocks = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = re.exec(text)))
    blocks.push({ selector: match[1].trim(), body: match[2] });
  return blocks;
}

function parseDeclarations(body) {
  const out = [];
  for (const raw of body.split(";")) {
    const idx = raw.indexOf(":");
    if (idx < 0) continue;
    const name = raw.slice(0, idx).trim();
    if (!name.startsWith("--")) continue;
    const value = raw
      .slice(idx + 1)
      .replace(/\/\*[^]*?\*\//g, "")
      .trim();
    if (value) out.push({ name, value });
  }
  return out;
}

function modeFor(file, selector) {
  const rel = path.relative(stylesRoot, file).replaceAll("\\", "/");
  if (rel.startsWith("primitive/")) return "Primitive";
  if (rel.includes("color-semantic"))
    return selector.includes(".dark") ? "Dark" : "Light";
  if (rel.includes("spacing-semantic")) {
    if (selector.includes("compact")) return "Compact";
    if (selector.includes("comfortable")) return "Comfortable";
    return "Default";
  }
  if (rel.includes("typography-semantic")) {
    if (selector.includes("small")) return "Small";
    if (selector.includes("large")) return "Large";
    return "Default";
  }
  return "Default";
}

function categoryFor(file) {
  const rel = path.relative(stylesRoot, file).replaceAll("\\", "/");
  if (rel.startsWith("primitive/"))
    return `primitive-${path.basename(rel, ".css").replace(/-primitive$/, "")}`;
  return `semantic-${path.basename(rel, ".css").replace(/-semantic$/, "")}`;
}

function figmaName(cssName, category) {
  const raw = cssName.slice(2);
  if (raw.startsWith("vx-"))
    return raw.slice(3).replace(/--+/g, "/").replaceAll("-", "/");
  const group = category.replace(/^semantic-/, "").replace(/^primitive-/, "");
  return `${group}/${raw.replace(/--+/g, "/").replaceAll("-", "/")}`;
}

const byKey = new Map();
for (const file of files(stylesRoot).filter((file) => {
  const rel = path.relative(stylesRoot, file).replaceAll("\\", "/");
  return rel.startsWith("primitive/") || rel.startsWith("semantic/");
})) {
  const text = fs.readFileSync(file, "utf8").replace(/\/\*[^]*?\*\//g, "");
  const category = categoryFor(file);
  for (const block of parseBlocks(text)) {
    const mode = modeFor(file, block.selector);
    for (const decl of parseDeclarations(block.body)) {
      const key = decl.name;
      const token = byKey.get(key) ?? {
        cssName: decl.name.slice(2),
        name: figmaName(decl.name, category),
        category,
        primitive: category.startsWith("primitive-"),
        values: {},
        sourceFiles: [],
      };
      token.values[mode] = decl.value;
      if (
        !token.sourceFiles.includes(
          path.relative(root, file).replaceAll("\\", "/"),
        )
      )
        token.sourceFiles.push(path.relative(root, file).replaceAll("\\", "/"));
      byKey.set(key, token);
    }
  }
}

const tokens = [...byKey.values()].map((token) => {
  const values = Object.values(token.values);
  const sample =
    values.find((v) => v && !v.includes("var(")) ?? values[0] ?? "";
  let type = "STRING";
  if (
    /^(#|rgb\(|rgba\(|hsl\(|hsla\(|oklch\(|oklab\(|color\(|transparent\b)/i.test(
      sample,
    )
  )
    type = "COLOR";
  else if (
    /^(?:calc\(|-?\d|var\(--(?:vx-)?(?:spacing|text|leading|tracking|radius|duration|z-index|opacity|size|breakpoint|container|inset|space|border|icon|media|shadow))/i.test(
      sample,
    ) ||
    /(px|rem|em|ms|s|%|deg)$/.test(sample)
  )
    type = "FLOAT";
  else if (/^(none|normal|auto|inherit|initial|unset)$/i.test(sample))
    type = "STRING";
  if (token.category === "semantic-color") type = "COLOR";
  if (token.category === "semantic-typography") {
    if (/font-family$/.test(token.cssName)) type = "STRING";
    else type = "FLOAT";
  }
  if (
    /easing|font-family|animate|font-(?:sans|serif|mono|brand|cjk)/i.test(
      token.cssName,
    )
  )
    type = "STRING";
  token.type = type;
  return token;
});

const manifest = {
  generatedAt: new Date().toISOString(),
  source: "packages/design-tokens/src/styles",
  count: tokens.length,
  counts: {
    primitive: tokens.filter((t) => t.primitive).length,
    semantic: tokens.filter((t) => !t.primitive).length,
    color: tokens.filter((t) => t.type === "COLOR").length,
    float: tokens.filter((t) => t.type === "FLOAT").length,
    string: tokens.filter((t) => t.type === "STRING").length,
  },
  tokens,
};
const out = path.join(root, "figma-token-manifest-vxture-20260919.json");
fs.writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  JSON.stringify(
    { out, count: manifest.count, counts: manifest.counts },
    null,
    2,
  ),
);
