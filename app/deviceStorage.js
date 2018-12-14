import * as fs from "fs";
import * as util from "../common/utils";

const MAX_BATCHTOTAL = 50;

export function DeviceStorage() {

  this.batchListFilename = "batch.stats.cbor";
  this.batchList = {
                      batchFilenames: {},
                      batchTotal: 0
                   };
  this.readBatchListCBORFile();
  if (util.DEBUG()) console.log("Read BatchList-file. Total batches waiting: " + this.getBatchTotal());
};

DeviceStorage.prototype.readBatchListCBORFile = function(){
  try {
    let json_object  = fs.readFileSync(this.batchListFilename, "cbor");
    this.batchList = json_object;
    if (util.DEBUG()) console.log("Filesystem BatchList loaded. " + this.getBatchTotal() + " batches in queue.");
  }
  catch(err) {
    if (util.DEBUG()) console.log("No BatchList-file found. Creating and retrying..");
    this.updateFSBatchList();     // Initiate empty file 
    this.readBatchListCBORFile(); // and retry
    if (util.DEBUG()) console.log("Error: " + err);
  }
};

/* Stores the in-memory BatchList to a persistant file */
DeviceStorage.prototype.updateFSBatchList = function() {
  fs.writeFileSync(this.batchListFilename, this.batchList, "cbor");
  
  if (util.DEBUG()) console.log("Updated List of FS Batches. Total batches: " + this.batchList.batchTotal);
  // this.getFileStats(this.batchListFilename);
  this.readBatchListCBORFile();
  // this.getFileStats(this.batchListFilename);
};

DeviceStorage.prototype.getBatchTotal = function() {
  let self = this;
  return self.batchList.batchTotal;
};

DeviceStorage.prototype.saveBatch = function(id, batch) {


  let self = this;
  if (util.DEBUG()) console.log("Saving batch..");
  if(Object.keys(batch.sensor_data.heart_rate).length > 0 || Object.keys(batch.sensor_data.barometer).length > 0 || Object.keys(batch.sensor_data.ema).length > 0) {
    // if (util.DEBUG()) console.log(JSON.stringify(batch));
    const filename = this.getBatchFilenameFromId(batch.id);
    // if (util.DEBUG()) { 
    //   console.log("Saving batch of size= " + JSON.stringify(batch).length)
    //   console.log(JSON.stringify(batch.sensor_data.ema))
    // }
    self.batchList.batchFilenames[batch.id] = filename;
    self.batchList.batchTotal += 1;
  
    fs.writeFileSync(filename, batch, "cbor");
    self.updateFSBatchList();
    if (util.DEBUG()) console.log("Batch saved (" + filename + ")! Batch amount: " + self.getBatchTotal());
    // if (util.DEBUG()) self.getFileStats(filename);
  }else{
    console.log("Object empty, not saving to fs.");
    return -1;
  }
};

DeviceStorage.prototype.getBatchFromFile = function(filename) {
  // if (util.DEBUG()) console.log("Reading file:" + filename);
  // this.getFileStats(filename);
  try {
    let json_object = fs.readFileSync(filename, "cbor");
    return json_object;
  }
  catch(err) {
    console.log("Error: " + err);
    return null;
  }
};

DeviceStorage.prototype.getFileStats = function(filename) {
  if (util.DEBUG()){
    let stats = fs.statSync(filename);
    if (stats) {
      console.log("Filename: " + filename);
      console.log("File size: " + stats.size + " bytes");
      console.log("Last modified: " + stats.mtime);
    }
  }
};

DeviceStorage.prototype.getBatchFilenameFromId = function(id) {
  return "batch." + id + ".cbor";
};

DeviceStorage.prototype.deleteBatchFile = function(id) {
  
  if (util.DEBUG()) console.log(this.getBatchFilenameFromId(id) + " deleted.");
  fs.unlinkSync(this.getBatchFilenameFromId(id));
  
  delete this.batchList.batchFilenames[id];
  this.batchList.batchTotal = this.batchList.batchTotal - 1;
  this.updateFSBatchList();
};

DeviceStorage.prototype.getBatchFileForDelivery = function() {
  if (Object.keys(this.batchList.batchFilenames).length > 0){
    let key = Object.keys(this.batchList.batchFilenames)[0]; 
  }
  if (key){
    let batchFileObj = this.getBatchFromFile(this.batchList.batchFilenames[key]);
    return [key, batchFileObj]; 
  }else{
    if (util.DEBUG()) console.log("No files left to transfer");
    return null;
  }
};

DeviceStorage.prototype.deleteTopKOldestFiles = function() {
  this.readBatchListCBORFile();
  // {"1544221927628":"batch.1544221927628.cbor","1544221943020":"batch.1544221943020.cbor","1544221958508":"batch.1544221958508.cbor"}
  const deleteN = MAX_BATCHTOTAL*0.5;;
  var i = 0;
  console.log("[DELETE-TOP-K] cur= " +this.batchList.batchTotal);
  if (this.batchList.batchTotal > MAX_BATCHTOTAL){
    console.log("[DELETE-TOP-K] deleting")
    Object.keys(this.batchList.batchFilenames).sort().forEach(id => {
      if (i < deleteN){
        // console.log("[DELETE-TOP-K] deleting " + id);
        this.deleteBatchFile(id);
        i+=1;
      }
    })
    console.log("[DELETE-TOP-K] deleting, remaining batchTotal " + this.batchList.batchTotal)
  }
  
}

/* TIME CHECK */
DeviceStorage.prototype.saveTime = () => {
  const _date = new Date();
  fs.writeFileSync("ema_time", _date.getTime(), "json");
  return _date
}

DeviceStorage.prototype.readTime = () => {
  try {
    const _epoch = fs.readFileSync("ema_time", "json")
    const _date = new Date(parseInt(_epoch)) 
    return _date
  } catch(err){
    return null;
  }

}
