#!/usr/bin/env node

import { getDependentsByYarn,
         listUpdate,
         setToatalTasks, 
         printDependents,
         printResult,
         makeSet,
         startSpinner
        } from "./utils.js";

// the driver function that gets and shows the list of updates to be performed
async function getUpdates(rootPackage, flag) {
  console.time("completed in ");
  let dependents = getDependentsByYarn(rootPackage[0]);
  printDependents(dependents);
  setToatalTasks(dependents.length);
  let currentVersions = makeSet(dependents)
  startSpinner(dependents);
  listUpdate(flag, dependents, ...rootPackage)
    .then((result) => {
      printResult(result,currentVersions);
    })
    .catch((message) => console.log(message))
    .finally(() => {
      console.timeEnd("completed in ");
      process.exit(0);
    });
}

let packageName = process.argv[2];
let reqVersion = process.argv[3];
let flag = 0;
const DEEPFLAG = `-deep`
if (`${process.argv[4]}` == DEEPFLAG) flag = 1;
getUpdates([`${packageName}`, `${reqVersion}`], flag);
