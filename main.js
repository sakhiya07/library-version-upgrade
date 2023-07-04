#!/usr/bin/env node

import { getDependentsByYarn, listUpdate, setToatalTasks, stringify } from "./utils.js";
import { getSpinner } from "./utils.js";
import chalk from "chalk";

let spinner = getSpinner();

// the driver function that gets and shows the list of updates to be performed
async function getUpdates(rootPackage, flag) {
  console.time("completed in ");
  let dependents = getDependentsByYarn(rootPackage[0]);
  console.log(`found`, chalk.greenBright(`${dependents.length}`), `dependent(s):`);
  setToatalTasks(dependents.length);
  let currentVersions = new Set();
  dependents.forEach((item) => {
    currentVersions.add(`${stringify(item)}`);
    console.log(chalk.magenta(`${item[0]}`));
  });
  spinner.text = chalk.blue(
    `generating dependency graph done(0/${dependents.length})`
  );
  spinner.start();
  listUpdate(flag, dependents, ...rootPackage)
    .then((arr) => {
      arr.forEach((item) => {
        if (item[1].startsWith("no")) {
          chalk.red(console.log(item[1]));
        } else if (!currentVersions.has(`${stringify(item)}`))
          console.log(chalk.yellow(`update ${item[0]} to ${item[1]}`));
        else console.log(chalk.green(chalk.cyanBright(`${item[0]} uptodate`)));
      });
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
if (process.argv[4] == "-deep") flag = 1;

getUpdates([`${packageName}`, `${reqVersion}`], flag);
