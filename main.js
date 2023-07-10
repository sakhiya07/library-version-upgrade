#!/usr/bin/env node

import { getDependentsByYarn,
         listUpdate,
         printResult,
         makeSet,
        } from "./utils.js";

// the driver function that gets and shows the list of updates to be performed
async function getUpdates(rootPackage) {
  console.time("completed in ");
  const dependents = getDependentsByYarn(rootPackage[0]);
  const currentVersions = makeSet(dependents);
  listUpdate( dependents, ...rootPackage)
    .then((result) => {
      printResult(rootPackage[0], result,currentVersions);
    })
    .catch((message) => console.log(message))
    .finally(() => {
      console.timeEnd("completed in ");
    });
}

const packageName = process.argv[2];
const reqVersion = process.argv[3];
getUpdates([`${packageName}`, `${reqVersion}`]);
