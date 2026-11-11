'use client';
import {Component,useEffect,useMemo,useRef,useState} from 'react';
import type {ReactNode,RefObject} from 'react';
import {Canvas,useThree} from '@react-three/fiber';
import type {ThreeEvent} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {CanvasTexture,SRGBColorSpace,Plane,Vector3} from 'three';
import type {OrbitControls as Controls} from 'three-stdlib';
import {catalog,sizes} from '../lib/design';
import type {Design,Item} from '../lib/design';

function Box({size,at,color}:{size:[number,number,number];at:[number,number,number];color:string}){
  return <mesh position={at} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color}/></mesh>;
}
function Cylinder({radius,height,y,color}:{radius:number;height:number;y:number;color:string}){
  return <mesh position-y={y} castShadow receiveShadow><cylinderGeometry args={[radius,radius,height,32]}/><meshStandardMaterial color={color}/></mesh>;
}
function Furniture({item,design}:{item:Item;design:Design}){
  const a=design.primary,b=design.secondary;
  switch(item.kind){
    case 'counter':return <><Box size={[1.04,.94,.44]} at={[0,.47,0]} color={a}/><Box size={[1.1,.06,.5]} at={[0,.97,0]} color={b}/><Box size={[.72,.12,.01]} at={[0,.57,.224]} color={b}/></>;
    case 'display':return <><Box size={[.65,.06,.45]} at={[0,.03,0]} color={a}/><Box size={[.09,1.35,.09]} at={[0,.68,0]} color={a}/><Box size={[1,.58,.08]} at={[0,1.45,0]} color={a}/><Box size={[.92,.5,.012]} at={[0,1.45,.045]} color={b}/></>;
    case 'pedestal':return <><Box size={[.4,.82,.4]} at={[0,.41,0]} color={a}/><Box size={[.46,.06,.46]} at={[0,.85,0]} color={b}/></>;
    case 'brochure':return <><Box size={[.38,.05,.4]} at={[0,.025,0]} color={a}/><Box size={[.08,1.15,.08]} at={[0,.575,0]} color={a}/>{[.64,.86,1.08].map(y=><Box key={y} size={[.32,.15,.1]} at={[0,y,.07]} color={b}/>)}</>;
    case 'table':return <><Cylinder radius={.29} height={.05} y={.025} color={a}/><Cylinder radius={.045} height={.73} y={.39} color={a}/><Cylinder radius={.45} height={.06} y={.77} color={b}/></>;
  }
}
function Sign({design,depth,width}:{design:Design;depth:number;width:number}){
  const [logo,setLogo]=useState<{src:string;image:HTMLImageElement}|null>(null);
  useEffect(()=>{
    if(!design.logo) return;
    const image=new Image();
    image.onload=()=>setLogo({src:design.logo,image});
    image.src=design.logo;
    return ()=>{image.onload=null;};
  },[design.logo]);
  const texture=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=320;
    const ctx=canvas.getContext('2d')!;
    ctx.fillStyle=design.primary;ctx.fillRect(0,0,1024,320);
    ctx.fillStyle=design.secondary;ctx.textAlign='center';ctx.textBaseline='middle';
    if(logo?.src===design.logo && logo){
      const scale=Math.min(780/logo.image.width,170/logo.image.height);
      const w=logo.image.width*scale,h=logo.image.height*scale;
      ctx.drawImage(logo.image,512-w/2,115-h/2,w,h);
    }else{
      ctx.font='bold 100px sans-serif';ctx.fillText(design.brand,512,116,900);
    }
    ctx.font='36px sans-serif';ctx.fillText(design.sign,512,237,900);
    const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;return map;
  },[design.primary,design.secondary,design.brand,design.sign,design.logo,logo]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh position={[0,1.69,-depth/2+.056]}><planeGeometry args={[Math.min(width-.35,3.8),.78]}/><meshBasicMaterial map={texture}/></mesh>;
}
type Props={design:Design;selected:string;view:'3d'|'top';frame:number;capture:RefObject<(()=>string)|null>;onSelect:(id:string)=>void;onMove:(id:string,x:number,z:number)=>void};
function World({design,selected,view,frame,capture,onSelect,onMove}:Props){
  const [w,d]=sizes[design.size];
  const controls=useRef<Controls>(null);
  const {camera,gl,scene,invalidate,size}=useThree();
  const drag=useRef<{id:string;x:number;z:number}|null>(null);
  const outline=useRef<import('three').Group>(null);
  const plane=useMemo(()=>new Plane(new Vector3(0,1,0),0),[]);
  useEffect(()=>{
    const span=Math.max(w,d) * Math.max(1, size.height / Math.max(1, size.width));
    camera.position.set(...(view==='top'?[0,span*1.85,.001]:[span*1.02,span*.81,span*1.27]) as [number,number,number]);
    controls.current?.target.set(0,view==='top'?0:.8,0);
    controls.current?.update();invalidate();
  },[camera,w,d,view,frame,invalidate,size.width,size.height]);
  useEffect(()=>{
    capture.current=()=>{
      const group=outline.current;
      if(group)group.visible=false;
      try{gl.render(scene,camera);return gl.domElement.toDataURL('image/png');}
      finally{if(group)group.visible=true;invalidate();}
    };
    return ()=>{capture.current=null;};
  },[camera,capture,gl,scene,invalidate]);
  const point=(event:ThreeEvent<PointerEvent>)=>event.ray.intersectPlane(plane,new Vector3());
  function release(event:ThreeEvent<PointerEvent>){
    if(!drag.current)return;
    drag.current=null;
    if(controls.current)controls.current.enabled=true;
    (event.target as Element).releasePointerCapture(event.pointerId);
  }
  return <>
    <color attach="background" args={['#e7ebe5']}/>
    <ambientLight intensity={1.6}/>
    <directionalLight castShadow intensity={2.4} position={[3,7,5]} shadow-mapSize={[1024,1024]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-normalBias={.035}/>
    <OrbitControls ref={controls} makeDefault enableRotate={view==='3d'} minDistance={1.4} maxDistance={24} maxPolarAngle={view==='top'?0:Math.PI/2.03}/>
    <mesh rotation-x={-Math.PI/2} position-y={-.14} receiveShadow><planeGeometry args={[200,200]}/><meshStandardMaterial color="#e0e5df"/></mesh>
    <gridHelper args={[24,48,'#bbc4bb','#cbd3cb']} position-y={-.135}/>
    <Box size={[w,.13,d]} at={[0,-.065,0]} color={design.floor}/>
    <Box size={[w,2.4,.1]} at={[0,1.2,-d/2]} color={design.wall}/>
    {design.sides&&[-1,1].map(side=><Box key={side} size={[.1,2.4,d]} at={[side*w/2,1.2,0]} color={design.wall}/>)}
    <Sign design={design} width={w} depth={d}/>
    {design.items.map(item=><group key={item.id} position={[item.x,0,item.z]} rotation-y={-item.angle*Math.PI/180}
      onPointerDown={event=>{
        if(event.button!==0)return;
        const p=point(event);if(!p)return;
        event.stopPropagation();onSelect(item.id);
        drag.current={id:item.id,x:p.x-item.x,z:p.z-item.z};
        if(controls.current)controls.current.enabled=false;
        (event.target as Element).setPointerCapture(event.pointerId);
      }}
      onPointerMove={event=>{
        if(drag.current?.id!==item.id)return;
        event.stopPropagation();
        const p=point(event);if(p)onMove(item.id,Math.round((p.x-drag.current.x)*10)/10,Math.round((p.z-drag.current.z)*10)/10);
      }}
      onPointerUp={release} onPointerCancel={release}>
      <Furniture item={item} design={design}/>
      {selected===item.id&&<group ref={outline}><mesh position-y={.008} rotation-x={-Math.PI/2}><planeGeometry args={[catalog[item.kind].width+.13,catalog[item.kind].depth+.13]}/><meshBasicMaterial color="#719550" transparent opacity={.65}/></mesh></group>}
    </group>)}
  </>;
}
class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<Fallback/>:this.props.children;}
}
function Fallback(){return <p className="fallback">The 3D preview requires WebGL. You can still edit and save your layout using the controls.</p>;}
export default function Scene(props:Props){
  return <SceneBoundary><Canvas shadows frameloop="demand" dpr={[1,2]} camera={{position:[4,3,5],fov:43}} fallback={<Fallback/>}><World {...props}/></Canvas></SceneBoundary>;
}
