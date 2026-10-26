import {Garu} from 'garu-ko/browser';
import {generateLocal} from '../engine/generate.js';
let analyzer;
const load=()=>analyzer||(analyzer=Garu.load().catch(error=>{analyzer=null;throw error;}));
self.onmessage=async({data})=>{
 try{
  const garu=await load();
  if(data.type==='init'){self.postMessage({id:data.id,ok:true,ready:true});return;}
  const result=generateLocal(data.options,text=>garu.analyze(text));
  self.postMessage({id:data.id,ok:true,result});
 }catch(error){self.postMessage({id:data.id,ok:false,error:error instanceof Error?error.message:'문장 분석을 완료하지 못했습니다.'});}
};
