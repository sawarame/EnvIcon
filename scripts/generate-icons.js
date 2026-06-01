const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const outputDir = path.join(__dirname, "../package/icons");
const sizes = [16, 32, 48, 128];

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// コマンドライン引数に --dev があるか確認
const isDev = process.argv.includes("--dev");

async function generateIconsForFile(inputSvg, outputPrefix = "") {
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `${outputPrefix}icon${size}.png`);
    await sharp(inputSvg).resize(size, size).png().toFile(outputPath);
    console.log(`Generated: ${outputPath}`);
  }
}

async function main() {
  try {
    const normalSvg = path.join(__dirname, "../src/icon.svg");
    const devSvg = path.join(__dirname, "../src/icon_dev.svg");

    if (isDev) {
      if (!fs.existsSync(devSvg)) {
        console.error("Error: src/icon_dev.svg does not exist.");
        process.exit(1);
      }
      console.log("Generating DEV icons (overwriting standard icon filenames)...");
      // 開発モードの時は、manifest.jsonが参照する標準ファイル名（icon16.png等）で出力します
      await generateIconsForFile(devSvg, "");
    } else {
      console.log("Generating Production icons...");
      await generateIconsForFile(normalSvg, "");
    }

    console.log("Successfully generated all icons!");
  } catch (error) {
    console.error("Error generating icons:", error);
    process.exit(1);
  }
}

main();


