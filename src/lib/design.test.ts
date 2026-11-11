import {describe,it,expect} from 'vitest';
import {decode,demo,extent,fits,persist,place} from './design';

describe('booth design',()=>{
  it('restores the demo on missing or corrupted data',()=>{
    expect(decode(null).design).toEqual(demo);
    expect(decode('{').notice).toMatch(/could not be restored/);
  });
  it('rejects invalid sizes and overlapping elements',()=>{
    const encode=(design:unknown)=>JSON.stringify({version:1,design});
    expect(decode(encode({...demo,size:3})).notice).toBeTruthy();
    expect(decode(encode({...demo,items:[...demo.items,{...demo.items[0],id:'overlap'}]})).notice).toBeTruthy();
  });
  it('uses rotated boundaries and relocates an element where room exists',()=>{
    const item={...demo.items[0],x:4,angle:90};
    expect(extent(item)[0]).toBeCloseTo(.25);
    expect(fits(0,item,demo.items)).toBe(false);
    const moved=place(0,{...item,id:'new'},demo.items);
    expect(moved).toBeDefined();
    expect(fits(0,moved!,demo.items)).toBe(true);
  });
  it('round-trips a design and falls back when a logo exceeds storage capacity',()=>{
    let raw='';
    const storage={setItem(_key:string,value:string){
      if(value.includes('base64'))throw Error();
      raw=value;
    }};
    expect(persist(storage,demo)).toBe('');
    expect(decode(raw).design).toEqual(demo);
    expect(persist(storage,{...demo,logo:'data:image/png;base64,AAAA'})).toMatch(/uploaded again/);
    expect(decode(raw).design.logo).toBe('');
  });
});
