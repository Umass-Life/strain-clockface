import { me } from "companion";
import * as messaging from "messaging";

import { StrainAPI } from "./strainAPI.js";

import * as util from "../common/utils";
import { SLogger } from "../common/strain_logger";
import { settingsStorage } from "settings";
import { geolocation } from "geolocation";


// Wake the Companion after 5 minutes
const MILLISECONDS_PER_MINUTE = 1000 * 60
me.wakeInterval = 5 * MILLISECONDS_PER_MINUTE
me.monitorSignificantLocationChanges = true
geolocation.getCurrentPosition((position)=> {
     var lat = position.coords.latitude;
     var long = position.coords.longitude;
     console.log("[POSITIONS]")
     console.log(lat);
     console.log(long)
   }, (err)=>{
     console.log("[POSITIONS-ERR] ")
     console.log(err)
   });

if (me.launchReasons.wokenUp) { 
   // The companion started due to a periodic timer
   console.log("Started due to wake interval! " + new Date());
  geolocation.getCurrentPosition((position)=> {
     var lat = position.coords.latitude;
     var long = position.coords.longitude;
     console.log("[POSITIONS]")
     console.log(lat);
     console.log(long)
   }, (err)=>{
     console.log("[POSITIONS-ERR] ")
     console.log(err)
   });
}

if (me.launchReasons.locationChanged) {
  // The companion was started due to a significant change in physical location
  console.log("Significant location change!")
  var pos = me.launchReasons.locationChanged.position
  console.log("Latitude: " + pos.coords.latitude,
              "Longitude: " + pos.coords.longitude)
}
// me.wakeInterval = 1 * MILLISECONDS_PER_MINUTE

var log = new SLogger("[COMPANION]");
log.info("LAUNCHED");

let settApikey = settingsStorage.getItem("apikey");
if (settApikey != undefined){
  settApikey = JSON.parse(settApikey);
}
let settApiUrl =  settingsStorage.getItem("url");
if (settApiUrl != undefined){
  settApiUrl = JSON.parse(settApiUrl);
}

if(settApiUrl == null || settApikey == null) {
  let api = new StrainAPI(undefined, undefined);  
}else{
  let api = new StrainAPI(settApikey.name, settApiUrl.name);  
};

let batch_queue = {};

function batchDeliveryScheduledJob() {
  if (Object.keys(batch_queue).length >= 1) {
    console.log("[companion] Processing queue.. Sending batch #" + Object.keys(batch_queue)[0] + " to remote api.."); 
    batchDeliveryJob();
    checkInterventionJob();
  }
}

// batchDeliveryScheduledJob();
// setInterval(batchDeliveryScheduledJob, 1000*60); // Every minute for dev (adjust in prod)


function batchDeliveryJob() {
  // Check for batch completeness
  
  // console.log("[companion] Delivery of : " + Object.keys(batch_queue)[0])
  api.sendBatch(batch_queue[Object.keys(batch_queue)[0]]).then(function(batchStatus) {
    if (batchStatus.status == "success") {
      console.log("[companion] Batch #" + batchStatus.id + " successfully received by remote.");
      delete batch_queue[batchStatus.id];
      if(Object.keys(batch_queue).length > 0){
        console.log("[companion] Queue not empty (" + Object.keys(batch_queue).length + ") - emptying..");
        setTimeout(batchDeliveryJob, 1000); // Recursive until batch storage is empty        
      }
    }else if(batchStatus.status == "unauthorized") {
      console.log("[companion] Unauthorized. Batch #" + Object.keys(batch_queue)[0] + " not delivered."); 
    }
  }).catch(function(batchError) {
    console.log(batchError);
  });

}

function checkInterventionJob() {
  // console.log("[companion] Delivery of : " + Object.keys(batch_queue)[0])
  api.getInterventions().then(function(interventionStatus) {
    if (interventionStatus.status == "intervene") {
      // console.log("[companion] Intervention received for time:" + interventionStatus.created + ".");
      sendMessage({created: interventionStatus.created}, "intervene");
    }else if(interventionStatus.status == "proceed") {
      // console.log("[companion] No intervention needed. Proceed!"); 
    }
  }).catch(function(batchError) {
    console.log(batchError);
  });

}

messaging.peerSocket.onopen = () => {
  console.info("[companion] Socket Open");
  // sendMessage("testettttt");
}

messaging.peerSocket.onerror = (err) => {
  console.log('[companion]Connection error: ' + err.code + " " + err.message);
}

messaging.peerSocket.onmessage = (evt) => {
  settingsStorage.setItem("MSGQ_RECV", JSON.stringify({d: new Date()}));
  console.log("[companion] Socket OnMsg - MSGQ_RECV " + settingsStorage.getItem("MSGQ_RECV"))
  const data = JSON.parse(evt.data);
  if (data.msgtype == "batchslice" && data.type == "ema"){
    console.log("[companion] EMA found")
    api.sendBatch(data, (response_data)=>{
      console.log("[companion] api.sendBatch success")
      sendMessage({id: data.id, type: data.type, slice: data.slice}, "batchslice_received", );      
    }, err => {
      console.log("[companion] api.sendBatch failed")
    })

  } 
//   if (data.msgtype == "batchslice"){
//     // If not exist, it's the first slice / Declare ID
//     if(!batch_queue[data.id]) batch_queue[data.id] = {};
    
//     // Declare sensortype if not exist and fill total slices as missing.
//     if(!batch_queue[data.id][data.type]){
//       batch_queue[data.id][data.type] = {slices: {}};
//       // batch_queue[data.id][data.type] = {missing: [...Array(data.slices).keys()], slices: {}}; // Missing not necessary
//     }
//     batch_queue[data.id][data.type]["slices"][data.slice] = data.data;
//     // delete batch_queue[data.id][data.type]["missing"][data.slice];
    
//     // batch_queue[evt.data.id] = data;
//     sendMessage({id: data.id, type: data.type, slice: data.slice}, "batchslice_received", );
//     console.log("[companion] Batch #" + data.id + " received and queued (" + Object.keys(batch_queue).length + ") for remote transport");
//   }
}

function sendMessage(data, type) {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    type = typeof type !== 'undefined' ? type : "ping";
    // Send the data to peer as a message
    messaging.peerSocket.send({
      type: type,
      data: data
    });
    // console.info("[companion] " + type + " message sent.");
  }
}

// Authentication
// settingStorage.get

