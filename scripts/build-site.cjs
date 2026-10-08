/* Publish only the playable runtime. Source scans and QA files stay in Git. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
assert(path.dirname(out)===root&&path.basename(out)==='dist','Unsafe output path');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const copied=[];
function copy(relative,target=relative){const source=path.join(root,relative),destination=path.join(out,target);assert(fs.statSync(source).isFile(),relative+' is missing');fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(source,destination);copied.push(target);}
const html=fs.readFileSync(path.join(root,'india.html'),'utf8');
copy('india.html');copy('india.html','index.html');
for(const match of html.matchAll(/<script\s+src="([^"]+)"/g)){assert(!match[1].includes('..')&&!match[1].includes(':'),'Nonlocal runtime script');copy(match[1]);}
for(const match of html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)){assert(!match[1].includes('..')&&!match[1].includes(':'),'Nonlocal stylesheet');copy(match[1]);}
copy('assets/presentation/old-quarter-keyart.webp');
for(const dir of ['assets','assets/animations','vendor'])for(const entry of fs.readdirSync(path.join(root,dir),{withFileTypes:true}))if(entry.isFile()&&(entry.name.endsWith('.js')||(dir==='vendor'&&entry.name.endsWith('-LICENSE.md')))&&entry.name!=='faquir-data.js'){const file=dir+'/'+entry.name;if(!copied.includes(file))copy(file);}
const bytes=copied.reduce((n,file)=>n+fs.statSync(path.join(out,file)).size,0);
console.log(`Built ${copied.length} runtime files (${(bytes/1024/1024).toFixed(1)} MiB). Source models, credentials and review artifacts are excluded.`);
