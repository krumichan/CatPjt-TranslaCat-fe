import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const repo=path.resolve(process.argv[2] ?? '.');
const require=createRequire(path.join(repo,'package.json'));
const load=async n=>import(pathToFileURL(require.resolve(n)).href);
const {compile}=await load('@mdx-js/mdx');
const {default:remarkGfm}=await load('remark-gfm');
const docs=path.join(repo,'content/docs');
const read=rel=>fs.readFile(path.join(docs,rel),'utf8');
const walk=async dir=>(await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]))).flat();
const files=(await walk(docs)).map(f=>path.relative(docs,f).replaceAll('\\','/'));
const locales=['ko','ja','en'];
const pages=new Map();
const errors=[];
for(const file of files){
  const m=file.match(/^(.*?)\.(ko|ja|en)\.mdx$/);
  if(!m)continue;
  const slug=m[1].replace(/(?:^|\/)index$/,'').replace(/\/$/,'');
  pages.set('/'+m[2]+'/docs'+(slug?'/'+slug:''),file);
}
const images=new Set();
let linkCount=0;
let compiled=0;
for(const file of pages.values()){
  const source=await read(file);
  const frontmatter=source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if(!frontmatter||!/^title:\s+\S/m.test(frontmatter[1]))errors.push([file,'Missing frontmatter title']);
  try{await compile(frontmatter?source.slice(frontmatter[0].length):source,{remarkPlugins:[remarkGfm],development:false});compiled++;}
  catch(e){errors.push([file,'MDX '+String(e)]);}
  for(const match of source.matchAll(/\/(ko|ja|en)\/docs(?:\/[a-z0-9-]+)*/g)){
    linkCount++;
    if(!pages.has(match[0]))errors.push([file,'Unknown guide link '+match[0]]);
  }
  for(const match of source.matchAll(/src="(\/images\/guides\/[^"]+)"/g)){
    images.add(match[1]);
    try{await fs.access(path.join(repo,'public',match[1]));}catch{errors.push([file,'Missing screenshot '+match[1]]);}
  }
}
let menus=0;
for(const file of files.filter(f=>/(?:^|\/)meta\.(ko|ja|en)\.json$/.test(f))){
  const match=file.match(/^(.*?)meta\.(ko|ja|en)\.json$/);
  try{
    const meta=JSON.parse(await read(file));
    for(const name of meta.pages??[]){
      if(name==='...'||name.startsWith('---')||name.startsWith('['))continue;
      const relative=match[1]+(name==='index'?'':name);
      const key='/'+match[2]+'/docs'+(relative?'/'+relative.replace(/\/$/,''):'');
      if(!pages.has(key))errors.push([file,'Menu has no guide '+key]);
    }
    menus++;
  }catch(e){errors.push([file,'Menu JSON '+String(e)]);}
}
for(const file of [...pages.values()].filter(f=>/^(novel\/|account-books\/spending-analysis|chat\/report|settings\/account-deletion)/.test(f))){
  for(const lang of locales){
    const other=file.replace(/\.(ko|ja|en)\.mdx$/,'.'+lang+'.mdx');
    if(!files.includes(other))errors.push([file,'Missing localization '+other]);
  }
}
const report={at:new Date().toISOString(),productionBaseline:'c81396fb2a799eaa1e7bca6b866df9790362ac98',repo,compiled,pages:pages.size,menus,guideLinks:linkCount,uniqueImages:images.size,errors};
console.log(JSON.stringify(report,null,2));
if(errors.length)process.exitCode=1;
