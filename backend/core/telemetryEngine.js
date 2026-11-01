const { buildBandwidth } = require('./bandwidthEngine');
function num(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)&&n>=0?n:null;}
function normalizeInterface(r){return{id:r.id||null,name:String(r.name||'unknown'),type:r.type||null,running:Boolean(r.running),disabled:Boolean(r.disabled),rxBytes:num(r.rxBytes),txBytes:num(r.txBytes),rxPackets:num(r.rxPackets),txPackets:num(r.txPackets),rxBitsPerSecond:null,txBitsPerSecond:null};}
function buildTelemetry(devices,measuredAt=new Date().toISOString(),previousDevices=[]){
 if(!Array.isArray(devices))throw new Error('Telemetry devices must be an array');
 if(Number.isNaN(Date.parse(measuredAt)))throw new Error('Telemetry measuredAt must be a valid timestamp');
 const rates=buildBandwidth(devices,previousDevices),byDevice=new Map(rates.map(d=>[d.deviceId,new Map(d.interfaces.map(i=>[i.id?'id:'+i.id:'name:'+i.name,i]))]));
 const list=devices.map(d=>({deviceId:d.deviceId,deviceName:d.deviceName,deviceType:d.type,status:d.status,interfaces:(d.interfaces||[]).map(item=>{const base=normalizeInterface(item),key=item.id?'id:'+item.id:'name:'+item.name,rate=byDevice.get(d.deviceId)?.get(key);return{...base,rxBitsPerSecond:rate?.rxBitsPerSecond??null,txBitsPerSecond:rate?.txBitsPerSecond??null,sampleIntervalMs:rate?.sampleIntervalMs??null,rateStatus:rate?.rateStatus||'baseline'};}),queues:(d.queues||[]).map(q=>({id:q.id||null,name:String(q.name||'unnamed'),target:q.target||null,maxLimit:q.maxLimit||null,rate:q.rate||null,disabled:Boolean(q.disabled)}))}));
 return{schemaVersion:1,measuredAt,totals:{devices:list.length,interfaces:list.reduce((n,d)=>n+d.interfaces.length,0),runningInterfaces:list.reduce((n,d)=>n+d.interfaces.filter(i=>i.running&&!i.disabled).length,0),queues:list.reduce((n,d)=>n+d.queues.length,0)},devices:list};
}
module.exports={buildTelemetry,normalizeInterface};