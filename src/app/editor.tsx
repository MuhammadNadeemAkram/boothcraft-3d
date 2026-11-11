'use client';
import dynamic from 'next/dynamic';
import {useEffect,useRef,useState} from 'react';
import {Box,Download,Expand,RotateCcw} from 'lucide-react';
import {catalog,decode,demo,fits,key,persist,place,sizes} from '../lib/design';
import type {Design,Item,Kind} from '../lib/design';
import {downloadPdf,downloadPng} from '../lib/export';

const Scene=dynamic(()=>import('./scene'),{ssr:false,loading:()=> <p className="fallback">Loading 3D preview…</p>});
const sections=['Booth','Branding','Elements'] as const;

export default function Editor(){
  const [design,setDesign]=useState<Design>(demo);
  const [selected,select]=useState('');
  const [section,setSection]=useState<(typeof sections)[number]>('Booth');
  const [view,setView]=useState<'3d'|'top'>('3d');
  const [frame,setFrame]=useState(0);
  const [ready,setReady]=useState(false);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [saveNotice,setSaveNotice]=useState('');
  const capture=useRef<(()=>string)|null>(null);
  const current=useRef(design);
  const logoRequest=useRef(0);
  useEffect(()=>{
    try{const saved=decode(localStorage.getItem(key));current.current=saved.design;setDesign(saved.design);setNotice(saved.notice);}
    catch{setNotice('Browser storage is unavailable.');}
    setReady(true);
  },[]);
  useEffect(()=>{
    if(!ready)return;
    try{setSaveNotice(persist(localStorage,design));}catch{setSaveNotice('Browser storage is unavailable.');}
  },[ready,design]);
  function update(patch:Partial<Design>){
    current.current={...current.current,...patch};
    setDesign(current.current);
  }
  function resize(size:number){
    const items:Item[]=[];
    let moved=0;
    for(const item of current.current.items){
      const next=place(size,item,items);
      if(!next){setNotice('Some elements cannot fit in this size. Remove an element and try again.');return;}
      if(next!==item)moved++;
      items.push(next);
    }
    update({size,items});
    setNotice(moved?moved+' element(s) moved to fit the booth.':'');
  }
  function changeItem(id:string,patch:Partial<Pick<Item,'x'|'z'|'angle'>>){
    const {size,items}=current.current;
    const original=items.find(item=>item.id===id);
    if(!original||!Object.values(patch).every(Number.isFinite))return;
    const next={...original,...patch};
    next.angle=((next.angle%360)+360)%360;
    if(!fits(size,next,items)){setNotice('Keep elements inside the booth and clear of other objects.');return;}
    update({items:items.map(item=>item.id===id?next:item)});setNotice('');
  }
  function add(kind:Kind,source?:Item){
    const {size,items}=current.current;
    if(items.length>=40){setNotice('This design supports up to 40 elements.');return;}
    const next=place(size,{x:0,z:0,angle:0,...source,kind,id:crypto.randomUUID()},items);
    if(!next){setNotice('There is no space for this element.');return;}
    update({items:[...items,next]});select(next.id);setNotice('');
  }
  async function upload(file?:File){
    const request=++logoRequest.current;
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024){setNotice('Choose a PNG, JPEG, or WebP logo up to 2 MB.');return;}
    try{
      const data=await new Promise<string>((resolve,reject)=>{
        const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(file);
      });
      const image=new Image();image.src=data;await image.decode();
      if(request===logoRequest.current){update({logo:data});setNotice('');}
    }catch{if(request===logoRequest.current)setNotice('This image could not be opened.');}
  }
  async function exportDesign(format:'png'|'pdf'){
    if(!capture.current){setNotice('The 3D preview must be available before exporting.');return;}
    setBusy(true);
    try{
      const image=capture.current();
      if(!image.startsWith('data:image/png'))throw Error();
      const name=(design.project||design.brand).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'boothcraft-design';
      if(format==='png')downloadPng(image,name);else await downloadPdf(image,design,name);
      setNotice('');
    }catch{setNotice('The export could not be created. Try again.');}
    finally{setBusy(false);}
  }
  const item=design.items.find(value=>value.id===selected);
  const [w,d]=sizes[design.size];
  return <main>
    <header><div className="brand"><Box size={21}/> BoothCraft <span>3D</span></div>
      <input className="project" aria-label="Project name" value={design.project} maxLength={80} onChange={e=>update({project:e.target.value})}/>
      <div className="actions">
        <button onClick={()=>{if(window.confirm('Reset this design to the original demo?')){logoRequest.current++;update(demo);select('');setView('3d');setFrame(n=>n+1);setNotice('');}}}><RotateCcw size={15}/> Reset</button>
        <button disabled={busy} onClick={()=>void exportDesign('png')}><Download size={15}/> PNG</button>
        <button disabled={busy} className="primary" onClick={()=>void exportDesign('pdf')}><Download size={15}/> {busy?'Exporting…':'Export PDF'}</button>
      </div>
    </header>
    <div className="workspace">
      <section className="viewport" aria-label="3D booth preview">
        <div className="canvas"><Scene design={design} selected={selected} view={view} frame={frame} capture={capture} onSelect={id=>{select(id);setSection('Elements');}} onMove={(id,x,z)=>changeItem(id,{x,z})}/></div>
        <div className="camera">
          <button aria-pressed={view==='3d'} onClick={()=>setView('3d')}>Perspective</button>
          <button aria-pressed={view==='top'} onClick={()=>setView('top')}>Top</button>
          <button onClick={()=>setFrame(n=>n+1)} title="Fit booth"><Expand size={16}/> Fit</button>
          <button onClick={()=>{setView('3d');setFrame(n=>n+1);}} title="Reset camera"><RotateCcw size={15}/><span className="sr-only">Reset camera</span></button>
        </div>
        <footer><strong>{w} × {d} m · {design.items.length} elements</strong><span>Drag to orbit · Scroll to zoom · Right-drag to pan</span></footer>
      </section>
      <details className="panel" open>
        <summary>Design settings</summary>
        <div className="tabs">{sections.map(label=><button key={label} aria-pressed={section===label} onClick={()=>setSection(label)}>{label}</button>)}</div>
        <div className="editor">
          {section==='Booth'&&<>
            <h1>Booth layout</h1>
            <label>Footprint<select value={design.size} onChange={e=>resize(Number(e.target.value))}>{sizes.map(([x,z],i)=><option key={i} value={i}>{x} × {z} m</option>)}</select></label>
            <label className="check"><input type="checkbox" checked={design.sides} onChange={e=>update({sides:e.target.checked})}/> Side walls</label>
          </>}
          {section==='Branding'&&<>
            <h1>Branding</h1>
            <label>Company name<input value={design.brand} maxLength={80} onChange={e=>update({brand:e.target.value})}/></label>
            <label>Signage text<input value={design.sign} maxLength={80} onChange={e=>update({sign:e.target.value})}/></label>
            <div className="colors">{(['primary','secondary','wall','floor'] as const).map(color=><label key={color}>{color}<input type="color" value={design[color]} onChange={e=>update({[color]:e.target.value})}/></label>)}</div>
            <label>Logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/></label>
            {design.logo&&<button onClick={()=>{logoRequest.current++;update({logo:''});}}>Remove logo</button>}
          </>}
          {section==='Elements'&&<>
            <h1>Booth elements</h1>
            <div className="catalog">{Object.entries(catalog).map(([kind,{name}])=><button key={kind} onClick={()=>add(kind as Kind)}>+ {name}</button>)}</div>
            <h2>Placed elements</h2>
            {design.items.length?<ul>{design.items.map((value,i)=><li key={value.id}><button aria-pressed={value.id===selected} onClick={()=>select(value.id)}>{i+1}. {catalog[value.kind].name}</button></li>)}</ul>:<p>Add an element to start arranging the booth.</p>}
            {item&&<div className="inspector" key={item.id}>
              <div className="coordinates">{(['x','z','angle'] as const).map(axis=><label key={axis}>{axis==='angle'?'Rotation (°)':axis.toUpperCase()+' (m)'}<input type="number" step={axis==='angle'?15:.1} defaultValue={item[axis]} key={item[axis]} onBlur={e=>{
                if(e.target.value.trim())changeItem(item.id,{[axis]:e.target.valueAsNumber});
                e.target.value=String(current.current.items.find(value=>value.id===item.id)?.[axis]??item[axis]);
              }} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/></label>)}</div>
              <div className="actions"><button onClick={()=>add(item.kind,item)}>Duplicate</button><button onClick={()=>{update({items:design.items.filter(value=>value.id!==item.id)});select('');setNotice('');}}>Delete</button></div>
            </div>}
          </>}
          <div role="status" className="notice">{notice||saveNotice}</div>
        </div>
      </details>
    </div>
  </main>;
}
