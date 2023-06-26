import { execSync } from 'child_process';
export function getDependents(packageName) {
    const command = `npm why ${packageName} --json`;
    let out = execSync(command,'utf-8');
    out=JSON.parse(out);
    let alldependents= new Set();
    let stack=[...out];
    //console.log(out);
    while(stack.length){
        let obj=stack.pop();
        if(obj==undefined)continue;
        alldependents.add(`${obj[`name`]}`);
        stack.push(obj[`from`]);
        if(obj[`dependents`])
        stack.push(...obj[`dependents`]);
    }
    return [...alldependents];
}