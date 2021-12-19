import { importFolder } from "./src/files";
import { ToolpathGenerator } from "./src/main";

import { defaultSettings } from "./test/settings";

async function main() {
  const imported = await importFolder(
    require("path").join(__dirname, "test/fixtures/vortex-test")
  );

  const gen = new ToolpathGenerator(defaultSettings, 2);

  gen.ingest(imported.movementJSONByFrame, defaultSettings, (progress) => {
    console.log(
      `${progress.frameNumber}/${imported.maxFrame} - ${progress.text}${
        progress.minimaFound ? " - minima found" : ""
      }`
    );
  });
}

main();
