let worker,nextId=0;const pending=new Map();
function stop(message){if(worker)worker.terminate();worker=null;for(const {reject,timer} of pending.values()){clearTimeout(timer);reject(new Error(message));}pending.clear();}
function getWorker(){
 if(worker)return worker;
 worker=new Worker(new URL('../worker/generate.worker.js',import.meta.url),{type:'module'});
 worker.onmessage=({data})=>{const request=pending.get(data.id);if(!request)return;pending.delete(data.id);clearTimeout(request.timer);data.ok?request.resolve(data.result||{ready:true}):request.reject(new Error(data.error));};
 worker.onerror=()=>stop('분석기를 불러오지 못했습니다. 네트워크 연결을 확인하고 다시 시도해 주세요.');
 return worker;
}
function request(data){return new Promise((resolve,reject)=>{const id=++nextId;const timer=setTimeout(()=>stop('분석 시간이 길어 작업을 중단했습니다. 문장을 짧게 나누어 다시 시도해 주세요.'),30000);pending.set(id,{resolve,reject,timer});try{getWorker().postMessage({...data,id});}catch{stop('이 브라우저에서 분석 작업을 시작하지 못했습니다. 최신 브라우저로 접속해 주세요.');}});}
export const prepareEngine=()=>request({type:'init'});
export const generateInBrowser=options=>request({type:'generate',options});
export const cancelGeneration=()=>stop('작업을 중단했습니다.');
