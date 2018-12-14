export function DEBUG() {
  return true;
}

// Add zero in front of numbers < 10
export function zeroPad(i) {
  if (i < 10) {
    i = "0" + i;
  }
  return i;
}


export function toggle(ele) {
  ele.style.display = (ele.style.display === "inline") ? "none" : "inline";
}

export function timestamp() {
  return Math.round((new Date).getTime()/1000);
}

export function timestampFull() {
  return (new Date).getTime();
}

export function isDatePastDuration(t1, duration){
  const x2 = new Date().getTime()
  const x1 = t1.getTime()
  const diff = Math.abs(x2-x1)
  // console.log(new Date(x2) + " | " + t1)
  // console.log("DIFF: " + new String(diff) + " " + new String(duration))
  return diff > duration
}

export function batchStats(batch) {
  var stats = "";
  if (batch.sensor_data != undefined || batch.sensor_data != null){
    if (batch.sensor_data.heart_rate != undefined || batch.sensor_data.heart_rate != null){
      stats += "batch.sensor_data.heart_rate=" + batch.sensor_data.heart_rate.length + ".";    
    }
  }
  return stats;
}