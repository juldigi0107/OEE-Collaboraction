import fs from 'node:fs';
import path from 'node:path';

function skipString(src,i,quote){let dynamic=false;for(i++;i<src.length;i++){const c=src[i];if(c==='\\'){i++;continue;}if(quote==='`'&&c==='$'&&src[i+1]==='{')dynamic=true;if(c===quote)return {end:i+1,dynamic};}return {end:src.length,dynamic:true};}
function bindArgs(src,start){let depth=1,commas=0,has=false,i=start;for(;i<src.length;i++){const c=src[i];if(c==='\''||c==='"'||c==='`'){const s=skipString(src,i,c);i=s.end-1;has=true;continue;}if(c==='('||c==='['||c==='{'){depth++;has=true;continue;}if(c===')'){if(depth===1)return {end:i,count:has?commas+1:0,text:src.slice(start,i)};depth--;continue;}if(c===']'||c==='}'){depth--;continue;}if(c===','&&depth===1){commas++;continue;}if(!/\s/.test(c))has=true;}return null;}
function auditFile(file){const src=fs.readFileSync(file,'utf8'),issues=[];let pos=0;const marker='.prepare(';
 while((pos=src.indexOf(marker,pos))>=0){let i=pos+marker.length;while(/\s/.test(src[i]||''))i++;const quote=src[i];if(!['\'', '"','`'].includes(quote)){pos=i+1;continue;}const start=i,parsed=skipString(src,i,quote),raw=src.slice(start+1,parsed.end-1);i=parsed.end;while(/\s/.test(src[i]||''))i++;if(src[i]!==')'){pos=parsed.end;continue;}i++;while(/\s/.test(src[i]||''))i++;if(src.slice(i,i+6)!=='.bind('){pos=i;continue;}const args=bindArgs(src,i+6);if(!args){issues.push('bind() tidak dapat diparse');pos=i+6;continue;}if(parsed.dynamic||args.text.includes('...')){pos=args.end+1;continue;}const placeholders=(raw.match(/\?/g)||[]).length;if(placeholders!==args.count)issues.push(`placeholder ${placeholders} != bind arg ${args.count} di offset ${pos}`);pos=args.end+1;
 }
 return issues;
}
const files=fs.readdirSync('backend').filter(x=>x.endsWith('.mjs')).map(x=>path.join('backend',x)),errors=[];for(const file of files)for(const issue of auditFile(file))errors.push(`${file}: ${issue}`);
if(errors.length){console.error('D1 SQL binding audit FAILED');errors.forEach(x=>console.error('- '+x));process.exit(1);}console.log(`D1 SQL binding audit OK — ${files.length} backend modules scanned for static prepare().bind() placeholder mismatches.`);
