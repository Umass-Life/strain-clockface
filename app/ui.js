  import clock from "clock";
import document from "document";
import { preferences } from "user-settings";
import * as util from "../common/utils";
import { vibration } from "haptics";

const PING_DURATION = 60*60000; // (ms/min) final result in ms, 10000
const STRESS_EMA_TYPE = "StressLevel"
const MOOD_EMA_TYPE = "MoodLevel"
const PAIN_EMA_TYPE = "PainLevel"

const EMAObject = () => {
  return { stress: null, mood: null, pain: null, timestamp: null }
}

export function StrainUI(batchPointerWrapper, storage) {
  if (batchPointerWrapper == null) console.log("[ERR] NULL batch passed to StrainUI")
  if (batchPointerWrapper.sensor_data == null) console.log("[ERR] NULL batch.sensor_data passed to StrainUI")
  if (batchPointerWrapper.sensor_data.ema == null) console.log("[ERR] NULL batch.sensor_data.ema passed to StrainUI")
  this.batchPointer = batchPointerWrapper;
  this.storage = storage
  this.isPerformingEMA = false;
  this.currentEMA = EMAObject();
};

StrainUI.prototype.Intervene = function(evt) {
  let self = this;
  const stressIntervention = document.getElementById("stressIntervention");
  util.toggle(stressIntervention);
  vibration.start("nudge-max");
  stressIntervention.text = "Intervention: " + evt;
};

StrainUI.prototype.updateHR = function(hrValue) {
    const hrLast = document.getElementById("hrLast");
    hrLast.text = hrValue;
};

StrainUI.prototype.updatePeerSocketDebug = function(val){
    const peerSocketDebug = document.getElementById("peerSocket");
    peerSocketDebug.text = val;
}

StrainUI.prototype.startUI = function() {
  let self = this;
  
  clock.granularity = "minutes";
  const clockLabel = document.getElementById("clockLabel");

  const peerSocketDebug = document.getElementById("peerSocket");
  peerSocketDebug.text = "-";
  
  let btns = [];
  // TODO: Dynamically set labels
  btns[0] = document.getElementById("stressBtn1");
  btns[1] = document.getElementById("stressBtn2");
  btns[2] = document.getElementById("stressBtn3");
  btns[3] = document.getElementById("stressBtn4");
  btns[4] = document.getElementById("stressBtn5");
  const stressLabel = document.getElementById("stressLabel");
  const stressLast = document.getElementById("stressLast");
  const stressEMAElements = btns.concat([stressLabel])
  
  let moodBtns = [];
  const mood = document.getElementById("mood");
  moodBtns[0] = document.getElementById("moodGood");
  moodBtns[1] = document.getElementById("moodNeutral");
  moodBtns[2] = document.getElementById("moodBad");
  
  let painBtns = [];
  const pain = document.getElementById("pain");
  painBtns[0] = document.getElementById("noPain")
  painBtns[1] = document.getElementById("mildPain")
  painBtns[2] = document.getElementById("moderatePain")
  painBtns[3] = document.getElementById("severePain")

  // Update the <text> element every tick with the current time
  clock.ontick = (evt) => {

    let today = evt.date;
    let hours = today.getHours();
    stressLast.text = self.storage.getBatchTotal()
    
    if (preferences.clockDisplay === "12h") {
      // 12h format
      hours = hours % 12 || 12;
    } else {
      // 24h format
      hours = util.zeroPad(hours);
    }
    let mins = util.zeroPad(today.getMinutes());

    clockLabel.text = `${hours}:${mins}`;
    
    var _date = this.storage.readTime()
    if (_date == null){
      _date = this.storage.saveTime();
    } 
    const isDatePastDuration = util.isDatePastDuration(_date, PING_DURATION)
    //mins % 3 == 0
    if (isDatePastDuration){
      // console.log("old date -- " + _date)
      // console.log("new date -- " + new Date())
      // console.log("isPerformingEMA " + self.isPerformingEMA)
      this.storage.saveTime()
      // if (btns[0].style.display != "inline") {
      if (!self.isPerformingEMA){
        // Show everything
        // util.toggle(peerSocketDebug)
        self.isPerformingEMA = true;
        self.renderNext(stressEMAElements)
        vibration.start("nudge-max");
      }
    }
  }
  
  //[1]A little stressed, [2]Definitely stressed, [3]Stressed out, [4]Feeling good, [5]Feeling great,
  btns[0].onactivate = function(evt) {
    toggleStress(btns[0], evt);
  };
  btns[1].onactivate = function(evt) {
    toggleStress(btns[1], evt);
  };
  btns[2].onactivate = function(evt) {
    toggleStress(btns[2], evt);
  };
  btns[3].onactivate = function(evt) {
    toggleStress(btns[3], evt);
  };
  btns[4].onactivate = function(evt) {
    toggleStress(btns[4], evt);
  };

  function toggleStress(pressed, evt) {
    const stressElements = btns.concat([stressLabel])
    self.renderNext(stressElements)
    if (btns[0].style.display == "inline") {
      util.toggle(stressLast);
    }else{
      console.log("[app] Stress: " + pressed.text);
      // stressLast.text = "Last Stress Level: " + pressed.text;  
      self.currentEMA.stress = {
        type: STRESS_EMA_TYPE,
        level: pressed.text
      }
    }
    
    self.renderNext([mood]);
  }
  
  moodBtns.forEach(btn => {
    btn.onactivate = (evt) => {
      console.log("[app] Mood: " + btn.text)
      self.isPerformingEMA = false;
      self.currentEMA.mood = {
        type: MOOD_EMA_TYPE,
        level: btn.text
      }
      self.renderNext([mood, pain]);
    }
  })
  
  painBtns.forEach(btn => {
    btn.onactivate = (evt) => {
      console.log("[app] Pain: " + btn.text)
      self.currentEMA.pain = {
        type: PAIN_EMA_TYPE,
        level: btn.text
      }
      self.currentEMA.timestamp = util.timestampFull();
      self.batchPointer.sensor_data.ema.push(self.currentEMA);
      console.log(JSON.stringify(self.batchPointer.sensor_data.ema))
      // console.log(JSON.stringify(self.batchPointer).length)
      self.isPerformingEMA=false;
      // self.currentEMA = EMAObject();
      self.renderNext([pain])
      // self.renderNext([peerSocketDebug])
    }
  })

  // hide all EMA elements on initialize
  btns.forEach(function(e){
    e.style.display = "none";
  });
  stressLabel.style.display = "none";
  // stressLast.style.display=  "none";
  mood.style.display = "none";
  pain.style.display = "none";
  
  // btn1.style.display = "inline";
};

StrainUI.prototype.renderNext = (elements) => {
  elements.forEach(element => {
    util.toggle(element);
  })
}
