#!/usr/bin/env node\

import execSync from 'child_process';
export function getDependents(packageName) {
    const command = `/Users/pradipkumar.singh/Desktop/library-version-upgrade/library-version-upgrade/node_modules/.bin/./yarn why ${packageName} -R --json`;
    let output = execSync.execSync(command, { encoding: 'utf-8' });
    output=JSON.parse(output);
    return Object.keys(output[`children`]);  
}

