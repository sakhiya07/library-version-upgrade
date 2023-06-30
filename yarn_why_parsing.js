#!/usr/bin/env node

const execSync  =require('child_process');
function getDependents(packageName) {
    const command = `/Users/pradipkumar.singh/Desktop/library-version-upgrade/library-version-upgrade/node_modules/yarn/bin/./yarn why ${packageName} -R --json`;
    let output = execSync.execSync(command, { encoding: 'utf-8' });
    output=JSON.parse(output);
    return Object.keys(output[`children`]);
    
}
module.exports={getDependents};
