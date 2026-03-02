/**
 * Prepares dist/ for Render static deploy:
 * - dist/loader.js (embed script)
 * - dist/build/widget.js (widget bundle)
 * - dist/build/index.html (optional demo page)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const distBuildDir = path.join(distDir, "build");

// Create dist and dist/build
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
if (!fs.existsSync(distBuildDir)) fs.mkdirSync(distBuildDir, { recursive: true });

// Copy loader.js to dist/
const loaderSrc = path.join(root, "loader.js");
const loaderDest = path.join(distDir, "loader.js");
if (fs.existsSync(loaderSrc)) {
  fs.copyFileSync(loaderSrc, loaderDest);
  console.log("  \u2713 dist/loader.js");
} else {
  console.error("  \u2717 loader.js not found");
  process.exit(1);
}

// Copy build/widget.js and build/index.html to dist/build/
const buildDir = path.join(root, "build");
["widget.js", "index.html"].forEach((file) => {
  const src = path.join(buildDir, file);
  const dest = path.join(distBuildDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log("  \u2713 dist/build/" + file);
  }
});

// Verify the files exist
const requiredFiles = [
  path.join(distDir, "loader.js"),
  path.join(distBuildDir, "widget.js"),
];
const missing = requiredFiles.filter((f) => !fs.existsSync(f));
if (missing.length > 0) {
  console.error("  ERROR: Missing required files:", missing);
  process.exit(1);
}
console.log("  dist/ ready for deploy (loader.js + build/widget.js)\n");
