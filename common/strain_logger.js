export function SLogger(name) {  
  this.name=name;
}

SLogger.prototype.info = function(msg){
  console.log(this.name + ": " + msg);
}
