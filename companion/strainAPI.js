import { settingsStorage } from "settings";
export function StrainAPI(apiKey, url) {
  if (apiKey !== undefined) {
    this.apiKey = apiKey;
  }
  else {
    // Default key for open public access
    this.apiKey = "698d51a19d8a121ce581499d7b701668";
  }
  
  if (url !== undefined) {
    this.url = url;
  }
  else {
    // Default url for localhost development
    // this.url = "http://192.168.86.24:8773";
    // this.url = "http://10.0.0.183:8773" // 3 - ema-service //http://46.183.139.179:5000";
    this.url = "https://api.umasslife.net/ema"
  }
}


StrainAPI.prototype.sendBatch = function(batch, onSuccess, onFailure) {
  let self = this;
  console.log("[companion-sendBatch] POST " + self.url);
  const fitbitId = settingsStorage.getItem("fitbitId");
  const strainId = settingsStorage.getItem("strainId");
  batch['fitbitId'] = fitbitId;
  batch['strainId'] = strainId;
  console.log(JSON.stringify(batch))
  settingsStorage.setItem("POST_EMA", JSON.stringify({d: new Date()}));
  return new Promise(function(resolve, reject) {
    fetch(self.url + '/ema', {
      method: 'POST',
      headers: new Headers({
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              // 'Authorization': 'Bearer ' + self.apiKey,
      }),
      body: JSON.stringify(batch),
      mode: 'cors',
    }).then(function(response) {
      if (!response.ok) {
        console.log("[FETCH ERR]"+ response.statusText);
      }
      const result = response.json();
      return result;
    })
    .then(function(data){ 
      settingsStorage.setItem("RECV_EMA_OK", JSON.stringify({d: new Date()}));
      onSuccess(data)
      resolve(data);
    })
    .catch(function(error){ 
      settingsStorage.setItem("RECV_EMA_ERR", JSON.stringify({d: new Date(), err: error}));
      console.log("ERROR: " + error);
      onFailure(error)
      reject(error);
    });
  });
};

StrainAPI.prototype.getInterventions = function() {
  let self = this;
  return new Promise(function(resolve, reject) {
    fetch(self.url + '/ema', {
      method: 'POST',
      headers: new Headers({
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              // 'Authorization': 'Bearer ' + self.apiKey,
      }),
      body: JSON.stringify({}),
      mode: 'cors',
    }).then(function(response) {
      return response.json();
    })
    .then(function(data){ 
      // console.log('Request succeeded with response', data.status);
      resolve(data);
    })
    .catch(function(error){ 
      console.log(error);
      console.log(error.message);
      reject(error);
    });
  });
};