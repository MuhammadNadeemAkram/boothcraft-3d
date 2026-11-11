import {catalog,sizes} from './design';
import type {Design} from './design';
export function downloadPng(image:string,name:string){
  const link=document.createElement('a');link.href=image;link.download=name+'.png';link.click();
}
export async function downloadPdf(image:string,design:Design,name:string){
  const {jsPDF}=await import('jspdf');
  const pdf=new jsPDF();
  const [w,d]=sizes[design.size];
  pdf.setTextColor('#233029');
  pdf.setFontSize(28);pdf.text('BoothCraft 3D',16,24);
  pdf.setFontSize(12);pdf.text((design.brand||'Exhibition booth')+' / '+(design.project||'Untitled'),16,36,{maxWidth:178});
  pdf.setFontSize(10);pdf.text(w+' m x '+d+' m  |  '+(design.sides?'Rear and side walls':'Rear wall')+'  |  '+new Date().toLocaleDateString(),16,51);
  const {width,height}=pdf.getImageProperties(image);
  const scale=Math.min(178/width,128/height);
  pdf.addImage(image,'PNG',16,57,width*scale,height*scale);
  let y=57+height*scale+12;
  pdf.setFontSize(14);pdf.text('Booth elements',16,y);y+=8;
  pdf.setFontSize(10);
  const entries=Object.entries(catalog).flatMap(([kind,{name}])=>{
    const count=design.items.filter(item=>item.kind===kind).length;
    return count?[name+' x '+count]:[];
  });
  for(const entry of entries.length?entries:['No elements placed']){pdf.text(entry,16,y);y+=6;}
  pdf.text('Primary '+design.primary+'   Secondary '+design.secondary,16,y+5);
  pdf.text('Wall '+design.wall+'   Floor '+design.floor,16,y+11);
  pdf.text('Conceptual design for review. Dimensions and materials require verification before construction.',16,y+23,{maxWidth:178});
  pdf.save(name+'.pdf');
}
