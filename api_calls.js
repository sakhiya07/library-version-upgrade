import axios from 'axios';
const options={method: 'GET',timeout: 25000};
export function removePrefix(version,allVersions){

    // if(version.startsWith('*')){
    //     return allVersions[allVersions.length-1];
    // }
    // if(version.split('.').length<3){
    //     if(version.split('.').length==2)version=`~${version}.0`;
    //     else version=`^${version}.0.0`;
    // }
    // if(version.startsWith('^')){
    //     version=version.slice(1);
       
    //     let favourable_versions = allVersions.filter((item)=>`${item.split('.')[0]}`==`${version.split('.')[0]}`);
       
    //     return favourable_versions[favourable_versions.length-1];
    // }
    // else if(version.startsWith('~')){
    //     version=version.slice(1);
    //     let favourable_versions = allVersions.filter((item)=>`${item.split('.')[0]==version.split('.')[0]}` && `${item.split('.')[1]==version.split('.')[1]}`);
    //     return favourable_versions[favourable_versions.length-1];
    // }
    // else if(version.startsWith('<=')){
    //     return version.slice('2');
    // }
    // else if(version.startsWith('>=')||version.startsWith('>')){
    //     return allVersions[allVersions.length-1];
    // }
    return version.split(/=|~|=|<|>/).join('').split('^').join('');
}
export function directDependency(packageName,packageVersion){
    return new Promise(async (resolve,reject)=>{
        let response;
        if(packageVersion.length>1)response = await axios.get(`https://registry.npmjs.org/${packageName}/${packageVersion}`,options);
        else response = await axios.get(`https://registry.npmjs.org/${packageName}`,options);             
        let data=response.data;
        if (data.dependencies) {
            const dependencies = Object.entries(data.dependencies);
            const dependenciesWithVersions = dependencies.map(([name, version]) => [name,version]);
            
            resolve(dependenciesWithVersions);
        } else {
            resolve([]);
        }
    })
}
export async function extractVersions(packageName){
    return new Promise(async(resolve,reject)=>{
        const response = await axios.get(`https://registry.npmjs.org/${packageName}`,options);
        
        const data = response.data;
        const versions = Object.keys(data.versions);
       
        resolve(versions);
    })
}

export async function getPackageInfo(packageName){
return new Promise(async(resolve,reject)=>{
try{
const response =await axios.get(`https://registry.npmjs.org/${packageName}`,options);
let versions_info=response.data.versions;
let dependencies=[];
for(let version in versions_info){
  
    if(versions_info[version]['dependencies']!=undefined)
    {
        let curr_dependency=[]
        for(let dependency in versions_info[version]['dependencies'])
        {
            curr_dependency.push([dependency,versions_info[version]['dependencies'][dependency]]);
        }
        dependencies.push([`${version}`,curr_dependency]);

    }
    else dependencies.push([`${version}`,[]]);
    } 
    resolve(dependencies);
    }catch{
        
        resolve([]);
    }
})
}