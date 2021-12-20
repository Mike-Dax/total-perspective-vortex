import { Vector3 } from "three";
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
      `${progress.frameNumber}/${imported.maxFrame} - ${progress.text} - ${
        Math.round((progress.startingCost - progress.currentCost) * 10) / 10
      }ms improvement over ${progress.timeSpent}ms of computation${
        progress.minimaFound ? " - minima found" : ""
      }`
    );
  });

  await gen.request(12);
  console.log("12 done!");

  await gen.request(12);
  console.log("12 done already");

  gen.updateSettings(
    Object.assign({}, defaultSettings, {
      optimisation: {
        startingPoint: new Vector3(0, 0, 0),
        endingPoint: new Vector3(0, 0, 0),
        maxSpeed: 50,
        waitAtStartDuration: 0,
      },
    })
  );

  await gen.request(12);
  console.log("12 done!");

  await gen.teardown();

  console.log("all done!");
}

main();
