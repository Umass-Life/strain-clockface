import * as messaging from "messaging";

import { StrainUI } from "./ui.js";
import { PeriodicParser } from "./periodicParser.js";
import { SensorParser } from "./sensorParser.js";
import { DeviceStorage } from "./deviceStorage.js";
import { SLogger } from "../common/strain_logger.js"
import * as util from "../common/utils";

var log = new SLogger("[APP]");

log.info("LAUNCHED");

const batch_template = {
  id: undefined,
  sensor_data: {
    heart_rate: [],
    // accelerometer: [],
    barometer: [],
    // coordinates: [],
    // gyroscope: [],
    // orientation: [],
    stress_level: [],
    ema: []
    
  }
};

let batch = batch_template;
let batch_queue = {};

const resetBatch = () => {
  if (batch!=null){
    batch.id = undefined
    batch.sensor_data = {
      heart_rate: [],
      barometer: [],
      ema: [],
    }
  } else {
    console.log("[ERR] reseting null batch")
  }
}

var storage = new DeviceStorage();
// var periodicParser = new PeriodicParser();
var ui = new StrainUI(batch, storage);
var sensorParser = new SensorParser(batch.sensor_data, ui);

ui.startUI();
// sensorParser.startCollecting();

// Listen for the onopen event
messaging.peerSocket.onopen = function() {
  console.log("[app] Socket open");
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    console.log("[app] Socket ready");
    // offLoadBatchFromQueue();
  }
}

// Listen for the onmessage event
messaging.peerSocket.onmessage = function(evt) {
  // console.log("[app] Received message: " + evt.data);
  if (evt.data.type == "batchslice_received") {
    console.log("[app] batchslice_received");
    // console.log(JSON.stringify(evt.data));
    console.log("[app] Batch #" + evt.data.data.id + "(" + evt.data.data.type + " slice " + evt.data.data.slice + ") successfully delivered to companion");
    // console.log(JSON.stringify(evt.data.data));
    
    // Delete slice
    delete batch_queue[evt.data.data.id][evt.data.data.type][evt.data.data.slice];
    console.log("BatchQueue for " + evt.data.data.id + " " + evt.data.data.type);
    console.log(JSON.stringify(batch_queue[evt.data.data.id][evt.data.data.type]));
    // Delete type if no slices left
    if (Object.keys(batch_queue[evt.data.data.id][evt.data.data.type]).length == 0) {
      delete batch_queue[evt.data.data.id][evt.data.data.type];
      console.log("removing type..");
      console.log(JSON.stringify(batch_queue[evt.data.data.id]));
    }
    
    // Delete ID if no types left and remove file
    if (Object.keys(batch_queue[evt.data.data.id]).length == 0) {
      console.log("[app] all slices and types delivered. Deleting local batchfile.");
      delete batch_queue[evt.data.data.id];
      storage.deleteBatchFile(evt.data.data.id);  
      offLoadBatchFromQueue();
    }
  }else if (evt.data.type == "intervene") {
    console.log("[app] Intervention received at: " + evt.data.data.created);
    ui.Intervene(evt.data.data.created);
  }else{
    console.log("[app] Unknown message type received..!?");
  }
}

// Listen for the onerror event
messaging.peerSocket.onerror = function(err) {
  // Handle any errors
  console.log("[app] Messaging error: " + err);
}

function offLoadBatchFromQueue() {
  if (util.DEBUG()) console.log("[app] offLoadBatchFromQueue()");
  // Send the data to peer as a message
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    console.log("[app] peerSocket is ready");
    let batchfiledata = storage.getBatchFileForDelivery();
    if (batchfiledata != null){
      if (batchfiledata[1] != null){
        console.log("Preparing batch #" + batchfiledata[0] + " for slicing and transport"); 

        /* MQ only supports very limited data per message, why it must be split up */
        let slices = {};
        const dim = 2;
        let _keys = Object.keys(batchfiledata[1]['sensor_data']); 
        
        // Iterate over the different sensors (HR, Accl etc..)
        for (let k = 0; k < _keys.length; k++) {
          // let _slicesneeded =  Math.ceil(_keys[k].length/dim);
          let _slicesneeded =  Math.ceil(batchfiledata[1]['sensor_data'][_keys[k]].length/dim);
          console.log("Type: " + _keys[k] + ". Items: " + batchfiledata[1]['sensor_data'][_keys[k]].length + " (slices: " + _slicesneeded + ")"); 
          if(batchfiledata[1]['sensor_data'][_keys[k]].length > 0) {
            let transfer_obj = {
              msgtype: "batchslice", id: batchfiledata[0], type: _keys[k], data: null, slice: null, 
              slices: _slicesneeded, type_count: [k, _keys.length]
            };
            
            // Retry missing queue parts if not empty
            // else get a new batchfile
            let missing = [];
            for (let x = 0; x < _slicesneeded; x++) {
              missing.push(x);
            };
            console.log(JSON.stringify(missing));
            // if (Object.keys(batch_queue).length > 0){
            //   if (Object.keys(batch_queue[batchfiledata[0]]).length > 0){
            //     // console.log("Batch Queue exists for id: " + batchfiledata[0]);
            //     // console.log(JSON.stringify(batch_queue[batchfiledata[0]]));
            //     if (Object.keys(batch_queue[batchfiledata[0]]).indexOf(_keys[k]) >= 0) {
            //       // console.log(_keys[k] + " in " + Object.keys(batch_queue[batchfiledata[0]]));
            //       console.log(Object.keys(batch_queue[batchfiledata[0]][_keys[k]]));
            //       if (Object.keys(batch_queue[batchfiledata[0]][_keys[k]]).length > 0){
            //         // console.log("batchqueue:", JSON.stringify(Object.keys(batch_queue[batchfiledata[0]][_keys[k]])));   
            //       }
            //     }
            //   }
            // }
            console.log("[APP-TRANSFER] " + _slicesneeded)
            for (let s = 0; s < _slicesneeded;  s++) {
	            let _lower = dim*s;
              let _upper = (dim*s)+dim;
              transfer_obj.data = batchfiledata[1]['sensor_data'][_keys[k]].slice(_lower, _upper);
              console.log("ORIGINAL LENGTH ====> " + batchfiledata[1]['sensor_data'][_keys[k]].length)
              console.log("DEBUG LENGTH TRANSFER ===> " + transfer_obj.data.length);
              transfer_obj.slice = s;
              
              if(!batch_queue[batchfiledata[0]]) batch_queue[batchfiledata[0]] = {};
              if(!batch_queue[batchfiledata[0]][_keys[k]]) batch_queue[batchfiledata[0]][_keys[k]] = {};
            
              // msg queue easily fills up: https://dev.fitbit.com/kb/message-queue-full
              
              if(transmitTransferObjectToCompanion(transfer_obj)){
                batch_queue[batchfiledata[0]][_keys[k]][transfer_obj.slice] = true;
              } else {
                console.log('[app-offload] failed')
              }    
            
              // console.log(util.batchStats(batch_queue[Object.keys(batch_queue)[0]]));
              if (util.DEBUG()) console.log("[app] Batchfile #" + batchfiledata[0] + "(" + _keys[k] + " slice: " + transfer_obj.slice + ") sent to companion");
            
            }
          }
        }
      }else{
        console.log("[app] batchfile #" + batchfiledata[0] + " null..");
      }      
    }else{
      if (util.DEBUG()) console.log("[app] queue empty..");
    }
  }
}

function transmitTransferObjectToCompanion(obj) {
  try {
    console.log("[APP-TRANSFER-] transfer size " + JSON.stringify(obj).length);

    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
       console.log("[APP-TRANSFER-] open")
      messaging.peerSocket.send(JSON.stringify(obj));
      ui.updatePeerSocketDebug("OPEN " + new Date())
    } else if (messaging.peerSocket.readyState === messaging.peerSocket.CLOSED) {
      ui.updatePeerSocketDebug("CLOSE " + new Date())
      console.log("[APP-TRANSFER-] closed")
      return false
    }
    console.log("[APP-TRANSFER-] buffer amount " + messaging.peerSocket.bufferedAmount)
    return true;
  }catch(err) {
    ui.updatePeerSocketDebug(err.message + " " + new Date())
    if (util.DEBUG()) console.log("[app-transmit]ERR " + JSON.stringify(err));
    console.log(err)
    return false;
  }
}

function prepareCurrentBatch() {
  // sensorParser.stopCollecting();
  batch.id = util.timestampFull();
  console.log("[app-prepareCur] Saving new batch locally, size=" + JSON.stringify(batch).length);
  console.log("[app-prepareCur] storage.total" + storage.getBatchTotal());
  
  // batch_queue[batch.id] = batch;
  // console.log("[app] Batch queue increased (" + Object.keys(batch_queue).length + ")");
  
  if(storage.saveBatch(batch.id, batch) == -1){
    console.log("Not saved, because empty");
  }
  
  // resetBatch(); // reset batch data
}
                              

// prepareCurrentBatch(); // c Not necessary in prod
// offLoadBatchFromQueue();
// Save/create batches to local filesystem every 15 seconod to avoid running out of memory.
setInterval(prepareCurrentBatch, 1*1000*15); // c
// setTimeout(prepareCurrentBatch, 1*1000*10); // run only once for testingt
setInterval(offLoadBatchFromQueue, 1*1000*60);

setInterval(() => {
  storage.deleteTopKOldestFiles()
}, 1*1000*15)
/*setTimeout(function(){
  sendBatch();
  console.log("In the batch:");
  console.log(batch.sensor_data.test);
}, 1000);*/



const batch_template_tmp = {
  app: {
    applicationId:undefined,
    buildId:undefined,
  },
  device_info: {
    type:undefined,
    modelName:undefined,
    modelId:undefined,
    firmwareVersion:undefined,
    lastSyncTime:undefined,
  },
  user: {
    user_gender:undefined,
    user_restingHeartRate:undefined,
    user_age:undefined,
    user_bmr:undefined,
    user_stride:undefined,
    user_weight:undefined,
    locale_language:undefined,
    units_distance:undefined,
    units_bodyWeight:undefined,
    units_height:undefined,
    units_weight:undefined,
    units_speed:undefined,
    units_temperature:undefined,
    units_volume:undefined,
    goals_steps:undefined,
  },
  sensor_data: {
    accelerometer: [/*{
      timestamp:undefined,
      x:undefined,
      y:undefined,
      z:undefined,
    }*/],
    barometer: [/*{
      timestamp:undefined,
      pressure:undefined,
    }*/],
    coordinates: [/*{
      timestamp:undefined,
      accuracy:undefined,
      altitude:undefined,
      altitudeAccuracy:undefined,
      heading:undefined,
      latitude:undefined,
      longitude:undefined,
      speed:undefined,
    }*/],
    gyroscope: [ /*{
      timestamp:undefined,
      x:undefined,
      y:undefined,
      z:undefined,
    }*/],
    heart_rate: [/*{
      timestamp:undefined,
      rate:undefined,
      zone:undefined,
    }*/],
    orientation: [/*{
      timestamp:undefined,
      quaternion:undefined,
    }*/]
  },
  periodicData: [{
    timestamp:undefined,
    battery_chargeLevel:undefined,
    activeMinutes:undefined,
    calories:undefined,
    distance:undefined,
    elevationGain:undefined,
    today_local_steps:undefined,
  }]
};