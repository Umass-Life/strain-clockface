// import { me } from "companion";
// import * as messaging from "messaging";

// console.log("WTFFFF");

// messaging.peerSocket.onopen = () => {
//   console.info("[companion] Socket Open");
// };

// messaging.peerSocket.onerror = (err) => {
//   console.log(`[companion]Connection error: ${err.code} - ${err.message}`);
// };

// messaging.peerSocket.onmessage = (evt) => {
//   console.info("[companion] Socket OnMsg:");
// };

// // Helper
// const MILLISECONDS_PER_MINUTE = 1000 * 60

// // Wake the Companion after 30 minutes
// me.wakeInterval = 5 * MILLISECONDS_PER_MINUTE

// if (me.launchReasons.wokenUp) {
//   // The companion started due to a periodic timer
//   geoLoc();
//   console.log("Started due to wake interval!")
// } else {
//   // Close the companion and wait to be awoken
//   me.yield()
// }