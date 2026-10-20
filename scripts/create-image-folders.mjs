import fs from 'node:fs/promises';
import path from 'node:path';

const root = new URL('../',import.meta.url);
const destination = path.resolve('D:\\3000 reference images');
if (destination !== 'D:\\3000 reference images') throw new Error('Unexpected image intake path.');
const catalog = JSON.parse(await fs.readFile(new URL('data/catalog.json',root),'utf8'));
const styles = [...catalog.styles].sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base',numeric:true}));
const folders = styles.map(style=>({
  id:style.id, name:style.name,
  folder:style.name.replace(/[<>:"/\\|?*\x00-\x1f]/g,' - ').replace(/\s+/g,' ').replace(/[. ]+$/g,'').trim(),
}));
if (folders.length!==300 || new Set(folders.map(f=>f.folder.toLowerCase())).size!==300) throw new Error('Folder names must be unique.');
await fs.mkdir(destination,{recursive:true});
for (const entry of folders) {
  const folderPath = path.resolve(destination,entry.folder);
  if (path.dirname(folderPath)!==destination) throw new Error('Folder escaped the intake directory.');
  await fs.mkdir(folderPath,{recursive:true});
}
const manifest = {directory:destination,createdAt:new Date().toISOString(),status:'awaiting-user-done',folders};
await fs.writeFile(new URL('data/manual-intake.json',root),JSON.stringify(manifest,null,2)+'\n');
const instructions = `Save each reference image in its matching style folder.
Use native 1920 x 1080 or 1080 x 1920 pixels or larger. No enlarging small originals.
Avoid casual people photos. Posed models are fine.
JPEG, PNG, WebP, AVIF and TIFF files can be inspected for import.
If you have source links, add a sources.csv file with columns filename,url,title in that style folder.

Tell Codex "done" when you have finished.
The images will be reviewed, uploaded to MongoDB and verified before this folder is deleted.
Any failed or unsuitable files must be resolved before cleanup.
`;
await fs.writeFile(path.join(destination,'READ ME.txt'),instructions,{flag:'wx'}).catch(error=>{if(error.code!=='EEXIST')throw error;});
console.log(`Ready: ${folders.length} style folders in ${destination}`);
