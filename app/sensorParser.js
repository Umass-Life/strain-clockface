import { HeartRateSensor } from "heart-rate";
import { Accelerometer } from "accelerometer";
import { Barometer } from "barometer";
import { Gyroscope } from "gyroscope";
import { OrientationSensor } from "orientation";

import { user } from "user-profile";

import * as util from "../common/utils";


export function SensorParser(batchPointer, ui) {
  this.hrm = null;
  this.accel = null;
  
  this.batchPointer = batchPointer;
  this.ui = ui;
};

SensorParser.prototype.startCollecting = function() {
  let self = this;
  // Create a new instance of the HeartRateSensor object

  self.hrm = new HeartRateSensor({ frequency: 1 });
  self.accel = new Accelerometer({ frequency: 1 });
  // var lastValueTimestamp = null;
  
  // Declare a even handler that will be called every time a new HR value is received.
  self.hrm.onreading = function() {
    // Peek the current sensor values
    // console.log((self.hrm.heartRate || "Unknown") + " BPM");
    // console.log((user.restingHeartRate || "Unknown") + " BPM");
    // console.log(user.heartRateZone(self.hrm.heartRate));
    self.batchPointer.heart_rate.push({
      timestamp: util.timestamp(),
      rate: self.hrm.heartRate,
      zone: user.heartRateZone(self.hrm.heartRate)
    });
    
    self.ui.updateHR(self.hrm.heartRate);
  
    // console.log("pushing:" + self.hrm.heartRate + " " + Math.round((new Date).getTime()/1000));
    // lastValueTimestamp = Date.now();
  };

  /* No readings for some reason */
  self.accel.onreading = function() {
//     console.log("ts:", self.accel.timestamp,
//               "x:", self.accel.x,
//               "y:", self.accel.y,
//               "z:", self.accel.z);
    
    self.batchPointer.accelerometer.push({
      timestamp: util.timestamp(),
      x: self.accel.x, 
      y: self.accel.y, 
      z: self.accel.z,
    });
    // self.accel.stop();
  };
    
  // Begin monitoring the sensor
  self.hrm.start(); 
  self.accel.start(); 
  
  let bar = new Barometer({ frequency: 1 });
  bar.onreading = function() {
    // console.log("Bar ts:" + bar.timestamp + "pressure:" + parseInt(bar.pressure) + " Pa");
    // bar.stop();
   self.batchPointer.barometer.push({
      timestamp: util.timestamp(),
      barstamp: bar.timestamp,
      pressure: parseInt(bar.pressure)
    });
  }
  bar.start();
    
  /* Not working either, for some reason */
  let gyro = new Gyroscope({ frequency: 1 });
  
  gyro.onreading = function() {
    // console.log("Gyro TS:", gyro.timestamp,
    //             "x:", gyro.x,
    //             "y:", gyro.y,
    //             "z:", gyro.z);
    gyro.stop();
  }
  gyro.start();
  
  
  let orientation = new OrientationSensor({ frequency: 60 });

  orientation.onreading = function() {
    // console.log("Orientation Sensor Reading: " +
    //             "timestamp: " + orientation.timestamp,
    //             "quaternion[0]: " + orientation.quaternion[0],
    //             "quaternion[1]: " + orientation.quaternion[1],
    //             "quaternion[2]: " + orientation.quaternion[2],
    //             "quaternion[3]: " + orientation.quaternion[3]);
  }

  orientation.start();
  
};

SensorParser.prototype.stopCollecting = function() {
  let self = this;
  self.hrm.stop();
  self.accel.stop();
};