const DEFAULTS = Object.freeze({ opticalCriticalDbm: -27, opticalWarningDbm: -25 });
function buildAlerts(snapshot, previous = null, options = {}) {
 if (!snapshot || !Array.isArray(snapshot.devices)) throw new Error('A valid snapshot is required for alerts');
 const thresholds={...DEFAULTS,...options}, old=new Map((previous?.devices||[]).map(d=>[d.deviceId,d])), items=[];
 const add=a=>items.push({...a,detectedAt:snapshot.lastUpdated||new Date().toISOString()});
 for(const d of snapshot.devices){
  const before=old.get(d.deviceId);
  if(d.status==='offline') add({id:'device-offline:'+d.deviceId,severity:'critical',category:'device',code:before?.status==='offline'?'DEVICE_STILL_OFFLINE':'DEVICE_OFFLINE',deviceId:d.deviceId,deviceName:d.deviceName,message:d.deviceName+' is offline.'});
  else if(before?.status==='offline'&&d.status==='online') add({id:'device-recovered:'+d.deviceId,severity:'info',category:'device',code:'DEVICE_RECOVERED',deviceId:d.deviceId,deviceName:d.deviceName,message:d.deviceName+' recovered and is online.'});
  for(const onu of d.onus||[]){const rx=Number(onu.rxPowerDbm);if(!Number.isFinite(rx))continue;
   if(rx<=thresholds.opticalCriticalDbm)add({id:'optical-critical:'+d.deviceId+':'+onu.onuIndex,severity:'critical',category:'optical',code:'OPTICAL_RX_CRITICAL',deviceId:d.deviceId,deviceName:d.deviceName,onuIndex:onu.onuIndex,rxPowerDbm:rx,message:d.deviceName+' ONU '+onu.onuIndex+' RX power is '+rx+' dBm.'});
   else if(rx<=thresholds.opticalWarningDbm)add({id:'optical-warning:'+d.deviceId+':'+onu.onuIndex,severity:'warning',category:'optical',code:'OPTICAL_RX_WARNING',deviceId:d.deviceId,deviceName:d.deviceName,onuIndex:onu.onuIndex,rxPowerDbm:rx,message:d.deviceName+' ONU '+onu.onuIndex+' RX power is '+rx+' dBm.'});
  }
 }
 return {schemaVersion:1,generatedAt:snapshot.lastUpdated||new Date().toISOString(),thresholds,summary:{total:items.length,critical:items.filter(a=>a.severity==='critical').length,warning:items.filter(a=>a.severity==='warning').length,info:items.filter(a=>a.severity==='info').length},items};
}
module.exports={buildAlerts,DEFAULTS};