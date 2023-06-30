#!/usr/bin/env node

import { getPackageInfo,removePrefix } from 'library-version-upgrade/api_calls.js';
import { getDependents } from 'library-version-upgrade/yarn_why_parsing.js';
import semver from 'semver';
import ora from 'ora';
import chalk from 'chalk';
let tasksCompleted=0,totalTasks;
let spinner = ora(chalk.blue(`generating dependency graph done(${tasksCompleted}/${totalTasks})`));
//import { getDependents } from './npm_why_parsing.js'
let dependencyCache=new Map();
let versionCache=new Map();
let apiCache=new Map();
let fillInfoCache = new Map();
let badPackages=new Set();
const JOINER='$._.$'
function stringify(array){
    return array.join(`${JOINER}`);
}
function destringify(string){
    return string.split(`${JOINER}`);
}
// the chache handling for getPackageInfo
async function fetchPackageInfo(packageName){
    if(!apiCache.has(`${packageName}`)){
        apiCache.set(`${packageName}`,getPackageInfo(packageName)); 
    }
    return apiCache.get(`${packageName}`);
}
// once we have the response of api call we will set versions and dependencies in our respective caches
function sortVersions(versions){
   return versions.sort((a,b)=>semver.compare(a,b));
}
async function fillPackageCache(packageName,packageInfo){
    if(!fillInfoCache.has(`${packageName}`)){
        fillInfoCache.set(`${packageName}`,new Promise((resolve,reject)=>{
            let versions=[];
            packageInfo.forEach(([version,dependencies])=>{
                versions.push(version);
                dependencyCache.set(`${stringify([packageName,version])}`,dependencies);
            })
            versions = sortVersions(versions);
            versionCache.set(`${packageName}`,versions);
            resolve();
        }))
    }
    return fillInfoCache.get(`${packageName}`);
}
//fetching data if necessary and then filling caches if not done
async function extractPackageInfo(packageName){
    return new Promise(async(resolve,reject)=>{
    let packageInfo=await fetchPackageInfo(`${packageName}`);
    if(packageInfo.length)
        await fillPackageCache(packageName,packageInfo);
    else
        badPackages.add(`${packageName}`);
    resolve();
})
}
//if unable to find a package in npm registry mark that as a bad package

//removing prefix
async function removePrefixes(packageName,packageVersion){
    return new Promise(async(resolve,reject)=>{
        let allVersions = await getPackageVersionsList(packageName);
        if(badPackages.has(`${packageName}`)){resolve('0.0.0');return;}
        resolve(removePrefix(packageVersion,allVersions));
    })
}
function getDependentsByYarn(packageName){
    return getDependents(packageName).map(item=>{
        item=item.split('').reverse().join('');
        let version=item.split(':')[0].split('').reverse().join('');
        item = item.replace('@',`${JOINER}`).split('').reverse().join('');
        let Name = item.split(`${JOINER}`)[0];
        return [Name,version]; 
        });
}
//handelling the range cases (only required rarely) 
function allPossibleUpdates(version,allVersions){
    
    return allVersions.filter((item)=>semver.satisfies(item,version));
}
//***************************************************************************************************************************************//
//returns direct dependencies of a package [[dependency1,v1],[dependency2,v2],......]
async function getDirectDependencies(packageName,packageVersion,flag){ 
  
    let packageVersioneq = await removePrefixes(packageName,packageVersion);  
    return new Promise(async (resolve,reject)=>{
    if(badPackages.has(`${packageName}`)){resolve([]);return}
    let Package=[packageName,packageVersioneq];
    if(`${dependencyCache.get(`${stringify(Package)}`)}`==`undefined`){
        await extractPackageInfo(packageName);      
    }
  
    if(`${dependencyCache.get(`${stringify(Package)}`)}`==`undefined`){
        badPackages.add(`${packageName}`);
        resolve([]);    
    }
    else{
        let dependencies=[...(dependencyCache.get(`${stringify(Package)}`))];
        if(flag){
            let range = allPossibleUpdates(packageVersion,[...versionCache.get(`${packageName}`)]);
            range=range.map((item)=>[`${packageName}`,item]);
            dependencies.push(...range);
        }
          resolve(dependencies);
    }
    })  

}

function removeDuplicates(packages){
    let temp=new Set();
    (packages.map((item)=>`${stringify(item)}`)).forEach((item)=>temp.add(`${item}`));
 
    return [...temp].map((item)=>destringify(item));
}
//get all level dependencies [[dependency1,v1],[dependency2,v2],......]
async function getAllDependencies(packageName,packageVersion,flag){
   
    return new Promise(async (resolve,reject)=>{
    let alldependencies=new Set();
    let newPackages=[[packageName,packageVersion]];
    let iteration=0;
    while(newPackages.length){
        newPackages.forEach((item)=>{alldependencies.add(`${stringify(item)}`);})
        let newPackages_temp=[];
        newPackages=newPackages.map((item)=>getDirectDependencies(item[0],item[1],flag));
        newPackages = await Promise.all(newPackages);
        
        newPackages.forEach((items)=>newPackages_temp.push(...items));
      
        newPackages_temp=newPackages_temp.filter((item)=>!(alldependencies.has(`${stringify(item)}`)));
        newPackages=[...newPackages_temp];
        newPackages = removeDuplicates(newPackages);
        iteration;
        

    }
    resolve([...alldependencies].map((item)=>destringify(item)));})
}
//get an array of versions of a package
async function getPackageVersionsList(packageName){
    return new Promise(async (resolve,reject)=>{
        
        if(!versionCache.has(`${packageName}`)){
           await extractPackageInfo(packageName);  
        }
        resolve (versionCache.get(`${packageName}`));        
})
}
function getAllPossibleUpdates(packages,allVersions){
    let allPackages=[];
    packages.forEach((item)=>{
       allPackages.push(...allPossibleUpdates(item[0],allVersions));
    })
    return removeDuplicates(allPackages);
}
//*************************************************************************************************************************************************//
//to what version we shul update rootPackage so that it depends on  dependency with dependencyRequiredVersion  
async function minNecessaryUpdate(rootPackageName,rootPackageVersion,dependencyName,DependencyRequiredVersion,flag){
    let rootPackageVersions = await getPackageVersionsList(rootPackageName);
    let dependencyVersions = await getPackageVersionsList(dependencyName);
    let rootVersionCount = rootPackageVersions.length; 
    let rootindex=rootVersionCount-1,bit=1<<20,last='-1';
    rootPackageVersion = await removePrefixes(rootPackageName,rootPackageVersion); 
   
    while(bit>0){
        if(bit<1)bit=0  
        if(Number(rootindex-bit)>=0)
        if(Number(semver.compare(`${rootPackageVersion}`,`${rootPackageVersions[rootindex-bit]}`)) <= 0){          
            let allcurrentdependencies=await getAllDependencies(`${rootPackageName}`,`${rootPackageVersions[rootindex-bit]}`,flag);
            let thisdependency=await Promise.all(allcurrentdependencies.filter((item)=>(`${item[0]}`==`${dependencyName}`)).map(async(item)=>[item[0],`${await removePrefixes(`${item[0]}`,`${item[1]}`)}`]));
            
            if(thisdependency.length){
                
                let dependencyVersion=dependencyVersions[dependencyVersions.length-1];
                await Promise.all(thisdependency.map((item)=> new Promise(async(resolve,reject)=>{
                    let thisVersion = await removePrefixes(`${dependencyName}`,`${item[1]}`);
                    
                    if(Number(semver.compare(`${dependencyVersion}`,`${thisVersion}`)) > 0 ){
                        dependencyVersion=thisVersion;
                    }
                    resolve();
                })))
                if(Number(semver.compare(`${dependencyVersion}`,`${DependencyRequiredVersion}`)) >= 0 ){
                   
                    rootindex-=bit;
                    last=dependencyVersion;
                }
            }
            else{
                
                last=dependencyVersions[dependencyVersions.length-1];
                rootindex-=bit;
            }
        }
        bit/=2;  
    }
    tasksCompleted++;
    spinner.text=chalk.blue(`generating dependency graph done(${tasksCompleted}/${totalTasks})`);
    if(tasksCompleted==totalTasks)spinner.succeed();
    return new Promise((resolve,reject)=>{  

    if(`${last}`!='-1'){
        resolve(`${rootPackageVersions[rootindex]}`);
    }
    else {
        resolve(`no favourable outcome because of ${rootPackageName}`);
    }
})
}
// schuduling list update parallely for all the dependents(mainPackages)
async function listUpdate(flag,mainPackages,dependencyName,DependencyRequiredVersion){  
    return new Promise (async (resolve,reject)=>{
    let promiseList = mainPackages.map((item)=>
        minNecessaryUpdate(item[0],item[1],dependencyName,DependencyRequiredVersion,flag)
        );
         Promise.all(promiseList).then((versions)=>{
         resolve(versions.map((item,idx)=>[mainPackages[idx][0],item]));

    }).catch((message)=>reject(message));   
})
}
//**********************************************************************************************************************************************//
async function doTask(Package,flag){
    console.time('completed in ');
        let dependents=getDependentsByYarn(Package[0]);
        console.log(`found`,chalk.greenBright(`${dependents.length}`),`dependent(s):`);
       totalTasks=dependents.length;
       let currentVersions=new Set();
       dependents.forEach((item)=>{
           currentVersions.add(`${stringify(item)}`);
           console.log(chalk.magenta(`${item[0]}`))
        })
        spinner.text=chalk.blue(`generating dependency graph done(${tasksCompleted}/${totalTasks})`);
        spinner.start();
        listUpdate(flag,dependents,...Package).then((arr)=>{        
            arr.forEach(item=>{
                                
                if(item[1].startsWith('no')){
                    chalk.red(console.log(item[1]));
                }
                else if(!currentVersions.has(`${stringify(item)}`))console.log(chalk.yellow(`update ${item[0]} to ${item[1]}`))
                else console.log(chalk.green(chalk.cyanBright(`${item[0]} uptodate`)))})
        }).catch((message)=>console.log(message))
          .finally(()=>{
            console.timeEnd('completed in ');process.exit(0);
        });
    
}
//doTask(['tslib','2.0.0'],0);

let packageName = process.argv[2];
let reqVersion = process.argv[3];
let flag = 0;
if(process.argv[4] == '-deep')flag=1;


doTask([`${packageName}`,`${reqVersion}`],flag);





    
