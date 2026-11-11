export const sizes = [[3,3],[3,6],[6,6]] as const;
export const catalog = {
  counter: { name:'Reception counter', width:1.1, depth:.5 },
  display: { name:'Display screen', width:1, depth:.45 },
  pedestal: { name:'Product pedestal', width:.46, depth:.46 },
  brochure: { name:'Brochure stand', width:.38, depth:.4 },
  table: { name:'Meeting table', width:.9, depth:.9 }
};
export type Kind = keyof typeof catalog;
export type Item = {id:string; kind:Kind; x:number; z:number; angle:number};
export type Design = {size:number; sides:boolean; project:string; brand:string; sign:string; primary:string; secondary:string; wall:string; floor:string; logo:string; items:Item[]};
export const demo:Design = {
  size:0,sides:true,project:'Launch exhibit',brand:'FORMA',sign:'Design for better spaces',
  primary:'#202e29',secondary:'#b8ca94',wall:'#f3f2e9',floor:'#bfae95',logo:'',
  items:[
    {id:'demo-counter',kind:'counter',x:-.6,z:.7,angle:0},
    {id:'demo-display',kind:'display',x:-.65,z:-.8,angle:0},
    {id:'demo-pedestal',kind:'pedestal',x:.78,z:-.25,angle:0}
  ]
};
export const key = 'boothcraft-design-v1';
export function extent(item:Item) {
  const {width,depth}=catalog[item.kind];
  const r=item.angle*Math.PI/180;
  return [(Math.abs(Math.cos(r))*width+Math.abs(Math.sin(r))*depth)/2,(Math.abs(Math.sin(r))*width+Math.abs(Math.cos(r))*depth)/2];
}
export function fits(size:number,item:Item,others:Item[]) {
  const [w,d]=sizes[size];
  const [x,z]=extent(item);
  if(Math.abs(item.x)+x>w/2-.08 || Math.abs(item.z)+z>d/2-.08) return false;
  return !others.some(other=>{
    if(other.id===item.id) return false;
    const [ox,oz]=extent(other);
    return Math.abs(other.x-item.x)<x+ox+.02 && Math.abs(other.z-item.z)<z+oz+.02;
  });
}
export function place(size:number,item:Item,others:Item[]) {
  if(fits(size,item,others)) return item;
  const [w,d]=sizes[size];
  const choices:Item[]=[];
  for(let x=-w/2+.1;x<w/2;x+=.1) for(let z=-d/2+.1;z<d/2;z+=.1){
    const candidate={...item,x:+x.toFixed(2),z:+z.toFixed(2)};
    if(fits(size,candidate,others)) choices.push(candidate);
  }
  return choices.sort((a,b)=>Math.hypot(a.x-item.x,a.z-item.z)-Math.hypot(b.x-item.x,b.z-item.z))[0];
}
export function decode(raw:string|null):{design:Design;notice:string} {
  try {
    if(!raw) return {design:demo,notice:''};
    const {version,design:d}=JSON.parse(raw);
    if(version!==1 || !d || !Number.isInteger(d.size) || !sizes[d.size] || typeof d.sides!=='boolean') throw Error();
    if(!['project','brand','sign'].every(k=>typeof d[k]==='string' && d[k].length<=80)) throw Error();
    if(!['primary','secondary','wall','floor'].every(k=>/^#[\da-f]{6}$/i.test(d[k]))) throw Error();
    if(!Array.isArray(d.items)||d.items.length>40) throw Error();
    const ids=new Set<string>();
    for(const item of d.items){
      if(!item || typeof item.id!=='string' || ids.has(item.id) || !Object.hasOwn(catalog,item.kind)
        || ![item.x,item.z,item.angle].every(Number.isFinite) || item.angle<0 || item.angle>=360
        || !fits(d.size,item,d.items)) throw Error();
      ids.add(item.id);
    }
    const validLogo=typeof d.logo==='string' && (!d.logo || (d.logo.length<2_800_000 && /^data:image\/(png|jpeg|webp);base64,[\w+/=]+$/.test(d.logo)));
    return {design:{...d,logo:validLogo?d.logo:''},notice:validLogo?'':'The saved logo could not be restored.'};
  }catch{return {design:demo,notice:'The saved design could not be restored. The demo is open.'};}
}
export function persist(storage:Pick<Storage,'setItem'>, design:Design){
  const save=(value:Design)=>storage.setItem(key,JSON.stringify({version:1,design:value}));
  try{save(design);return '';}catch{
    if(design.logo) try{save({...design,logo:''});return 'The design is saved. The logo needs to be uploaded again after reload.';}catch{}
    return 'This browser could not save the design.';
  }
}
