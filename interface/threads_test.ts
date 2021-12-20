import { importFolder } from "./src/files";
import { ToolpathGenerator } from "./src/main";

import { defaultSettings } from "./test/settings";

async function main() {
  const imported = await importFolder(
    require("path").join(__dirname, "test/fixtures/vortex-test")
  );

  const gen = new ToolpathGenerator(defaultSettings, 1);

  gen.ingest(imported.movementJSONByFrame, defaultSettings, (progress) => {
    console.log(
      `${progress.frameNumber}/${imported.maxFrame} - ${progress.text} - ${
        progress.startingCost - progress.currentCost
      }ms improvement over ${progress.timeSpent}ms of computation${
        progress.minimaFound ? " - minima found" : ""
      }`
    );
  });

  await gen.request(12);
  console.log("12 done!");

  await gen.onComplete();
  console.log("all done!");
}

main();
