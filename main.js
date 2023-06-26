import { directDependency , extractVersions ,getPackageInfo,removePrefix} from './api_calls.js';
import { getDependents } from './yarn_why_parsing.js';
import fs from 'fs'
//import { getDependents } from './npm_why_parsing.js'
const packageJSON=JSON.parse(fs.readFileSync('package.json','utf-8'));
let dependencyCache=new Map();
let versionCache=new Map();
let setInfoApiCache=new Map();
let setInfoCache = new Map();
let badPackages=new Set();
function stringify(array){
    return array.join('$`$`$`@#$%`$`$`$`$');
}
function destringify(string){
    return string.split('$`$`$`@#$%`$`$`$`$');
}
async function getSetApiPromise(packageName){
    if(!setInfoApiCache.has(`${packageName}`)){
        setInfoApiCache.set(`${packageName}`,getPackageInfo(packageName)); 
    }
    return setInfoApiCache.get(`${packageName}`);
}
async function getSetPromise(packageName,packageInfo){
    if(!setInfoCache.has(`${packageName}`)){
        setInfoCache.set(`${packageName}`,new Promise((resolve,reject)=>{
            let versions=[];
            packageInfo.forEach(([version,dependencies])=>{
                versions.push(version);
                dependencyCache.set(stringify([packageName,version]),dependencies);
            })
            versionCache.set(`${packageName}`,versions);
            resolve();
        }))
    }
    return setInfoCache.get(`${packageName}`);
}
async function set_info(packageName){
    return new Promise(async(resolve,reject)=>{
    let packageInfo=await getSetApiPromise(packageName);
    await getSetPromise(packageName,packageInfo);
    resolve();
})

}
async function getEquivVersion(packageName,packageVersion){
    return new Promise(async(resolve,reject)=>{
        let allVersions = await getver(packageName);
        if(badPackages.has(packageName))resolve('0.0.0');
        resolve(removePrefix(packageVersion,allVersions));
    })
}
async function getCurrentVersion(packageName){
    return new Promise(async(resolve,reject)=>{
    let version=await getEquivVersion(packageName,packageJSON.dependencies[`${packageName}`]);
    resolve(version);
    }
    )
}
function getDependentsByYarn(packageName){
    return getDependents(packageName).map(item=>{
        item=item.split('').reverse().join('');
        let version=item.split(':')[0].split('').reverse().join('');
        item = item.replace('@','*&^%^&*()').split('').reverse().join('');
        let Name = item.split(')(*&^%^&*')[0];
        return [Name,version]; 
        });
}
function allPossibleUpdates(version,allVersions){
    
    if(version.startsWith('*')){
        return [allVersions[allVersions.length-1]];
    }
    if(version.split('.').length<3){
        if(version.split('.').length==2)version=`~${version}.0`;
        else version=`^${version}.0.0`;
    }
    if(version.startsWith('^')){
        version=version.slice(1);
        let favourable_versions = allVersions.filter((item)=>`${item.split('.')[0]}`==`${version.split('.')[0]}`);       
        return favourable_versions;
    }
    else if(version.startsWith('~')){
        version=version.slice(1);
        let favourable_versions = allVersions.filter((item)=>`${item.split('.')[0]==version.split('.')[0]}` && `${item.split('.')[1]==version.split('.')[1]}`);
        return favourable_versions;
    }
    else if(version.startsWith('<=')){
        return [version.slice('2')];
    }
    else if(version.startsWith('>=')||version.startsWith('>')){
        return [allVersions[allVersions.length-1]];
    }
    else return [version.split(/=|~|=|<|>/).join('').split('^').join('')];
}
//***************************************************************************************************************************************//
async function getDirectDependencies(packageName,packageVersion,flag){ 
  
    let packageVersioneq = await getEquivVersion(packageName,packageVersion);  
    return new Promise(async (resolve,reject)=>{
    if(badPackages.has(`${packageName}`))resolve([]);
    let Package=[packageName,packageVersioneq];
    if(!dependencyCache.has(stringify(Package))){
        await set_info(packageName);      
    }
  
    if(`${dependencyCache.get(stringify(Package))}`==`undefined`){
        badPackages.add(packageName);
        resolve([]);      
    }
    else{
        let dependencies=[...(dependencyCache.get(`${stringify(Package)}`))];
        if(flag){
            let range = allPossibleUpdates(packageVersion,versionCache.get(`${packageName}`));
            range=range.map((item)=>[packageName,item]);
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
async function getAllDependencies(packageName,packageVersion,flag){
   
    return new Promise(async (resolve,reject)=>{
    let alldependencies=new Set();
    let newPackages=[[packageName,packageVersion]];
    while(newPackages.length){
        newPackages.forEach((item)=>{alldependencies.add(`${stringify(item)}`);})
        let newPackages_temp=[];
        newPackages=newPackages.map((item)=>getDirectDependencies(item[0],item[1],flag));
        newPackages = await Promise.all(newPackages);
       
        newPackages.forEach((items)=>newPackages_temp.push(...items));
      
        newPackages_temp=newPackages_temp.filter((item)=>!(alldependencies.has(`${stringify(item)}`)));
        newPackages=[...newPackages_temp];
        newPackages=removeDuplicates(newPackages);
    
    }
    
    resolve([...alldependencies].map((item)=>destringify(item)));})
}
async function getver(packageName){
    return new Promise(async (resolve,reject)=>{
        
        if(!versionCache.has(`${packageName}`)){
           await set_info(packageName);
           
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
async function updateThis(rootPackageName,rootPackageVersion,dependencyName,dependencyDestinationVersion,flag){
    let rootPackageVersions = await getver(rootPackageName);
    let dependencyVersions = await getver(dependencyName);
    let inverseRootPackageVersions =new Map();
    let inverseDependencyVersions=new Map();
    rootPackageVersions.forEach((item,idx)=>inverseRootPackageVersions.set(`${item}`,idx));
    dependencyVersions.forEach((item,idx)=>inverseDependencyVersions.set(`${item}`,idx));
    let rootVersionCount = rootPackageVersions.length;
    let rootindex=rootVersionCount-1,bit=1<<20,last='-1';
    rootPackageVersion = await getEquivVersion(rootPackageName,rootPackageVersion); 
    while(bit>0){
        if(bit<1)bit=0       
        if(Number(rootindex-bit)>=Number(inverseRootPackageVersions.get(`${rootPackageVersion}`))){          
            let allcurrentdependencies=await getAllDependencies(`${rootPackageName}`,`${rootPackageVersions[rootindex-bit]}`,flag);
            let thisdependency=allcurrentdependencies.filter((item)=>(`${item[0]}`==`${dependencyName}`) && (`${inverseDependencyVersions.get(`${item[1]}`)}`!=`undefined`));
            
            if(thisdependency.length){
                
                let dependencyVersion=dependencyVersions[dependencyVersions.length-1];
                await Promise.all(thisdependency.map((item)=> new Promise(async(resolve,reject)=>{
                    let thisVersion = await getEquivVersion(dependencyName,item[1]);
                    if(Number(inverseDependencyVersions.get(`${dependencyVersion}`))>Number(inverseDependencyVersions.get(`${thisVersion}`)))dependencyVersion=thisVersion;
                    resolve();
                })))
                if(Number(inverseDependencyVersions.get(`${dependencyVersion}`))>=Number(inverseDependencyVersions.get(`${dependencyDestinationVersion}`))){
                   
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
    return new Promise((resolve,reject)=>{
    
    if(`${last}`!='-1'){
        resolve(`${rootPackageVersions[rootindex]}`);
    }
    else {
        resolve(`no favourable outcome because of ${rootPackageName}`);
    }
})
}
async function listUpdate(flag,mainPackages,dependencyName,dependencyDestinationVersion){  
    return new Promise (async (resolve,reject)=>{
    let promiseList = mainPackages.map((item)=>
        updateThis(item[0],item[1],dependencyName,dependencyDestinationVersion,flag)
        );
        Promise.all(promiseList).then((versions)=>{
         resolve(versions.map((item,idx)=>[mainPackages[idx][0],item]));
    }).catch((message)=>reject(message));   
})
}
//**********************************************************************************************************************************************//
let Package=['isobject','4.0.0'];
async function doTask(flag){
    console.time('binary search on full graph');
        let dependents=getDependentsByYarn(Package[0]); 
        console.log(dependents);
        let currentVersions=new Set();
        dependents.forEach((item)=>{
            currentVersions.add(`${stringify(item)}`,);
        })
        listUpdate(flag,dependents,...Package).then((arr)=>{        
            arr.forEach(item=>{
                if(item[1].startsWith('no')){
                    console.log(item[1]);
                }
                else if(!currentVersions.has(`${stringify(item)}`))console.log(`update ${item[0]} to ${item[1]}`)});          
        }).catch((message)=>console.log(message)).finally(()=>console.timeEnd('binary search on full graph'));
    
}
doTask(0);





    
