import { execSync } from 'child_process';
export function getDependents(packageName) {
    const command = `/Users/pradipkumar.singh/Desktop/project/node_modules/yarn/bin/./yarn why ${packageName} -R --json`;
    let output = execSync(command, { encoding: 'utf-8' });
    output=JSON.parse(output);
    return Object.keys(output[`children`]);
    
}
