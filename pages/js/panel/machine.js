var cpuchart = [0.005,0.001,0.002,0.003,0.004],ramchart = [0.005,0.001,0.002,0.003,0.004]
var systemsinfo = {osname:"Loading...",user:"Loading...",password:"Loading..."}
var timeoutdb,startdb = true,shutdowndb,resetbuttondb,resetdb,rebootdb,passworddb,ngrokurl//Database
shadow = "0px 0px 25px 8px rgb(74, 75, 75)",slimit = 50,sshadow = true, slimitn = 0

var socket = io(("ws://"+ejs.socket).replace("http://","").replace("https://",""),{auth:auth,transports: ['websocket'] });
socket.on("connect_error", (err) => console.log(`Unable to connect to server error code:${err.message}`));
socket.on('panelusers', function(msg){
  if(msg.closegill && ejs.gill === msg.closegill){
    document.querySelector("#systemstatus").style["background-color"] = ""
    document.querySelector("#startbutton").style["background-color"] = "#5ce80c"
    document.querySelector("#shutdownbutton").style["background-color"] = ""
    document.querySelector("#resetbutton").style["background-color"] = ""
    document.querySelector("#shutdownbutton").style.color = "black";
    document.querySelector("#startbutton").style.cursor = "pointer"
    document.querySelector("#shutdownbutton").style.cursor = "not-allowed"
    document.querySelector("#resetbutton").style.cursor = "not-allowed"
    document.querySelector("#systemstatus").innerHTML = "Offline Gill"
    shadow = "0px 0px 25px 8px rgb(74, 75, 75)"
    startdb = true,shutdowndb = false,resetbuttondb = false
  }
  if(msg.kicked) return window.location = '/panel';
  if(!msg.machine || msg.machine != ejs.machineid) return;
  if(msg.install && msg.install.process) {
try{
document.querySelector("#systemstatus").innerHTML = "Installing<br>"+msg.install.process+"% "+moment().add(Number(msg.install.time), 'second').fromNow()
}catch{document.querySelector("#systemstatus").innerHTML = "Installing<br>"+msg.install.process+"%"}
shadow = "0px 0px 25px 8px rgb(222, 211, 0)"
document.querySelector("#systemstatus").style["background-color"] = "#e1e80c"
document.querySelector("#startbutton").style["background-color"] = ""
document.querySelector("#shutdownbutton").style["background-color"] = ""
document.querySelector("#resetbutton").style["background-color"] = ""
document.querySelector("#shutdownbutton").style.color = "black";
document.querySelector("#startbutton").style.cursor = "not-allowed"
document.querySelector("#shutdownbutton").style.cursor = "not-allowed"
document.querySelector("#resetbutton").style.cursor = "not-allowed"
startdb = false,shutdowndb = false,resetbuttondb = false
  }
  if(msg.nowrunning) {
    shadow = "0px 0px 25px 8px rgb(0, 255, 72)"
    document.querySelector("#systemstatus").innerHTML = "Running"
    document.querySelector("#systemstatus").style["background-color"] = "#5ce80c"
    document.querySelector("#startbutton").style["background-color"] = ""
    document.querySelector("#shutdownbutton").style["background-color"] = "#2d302c"
    document.querySelector("#resetbutton").style["background-color"] = "#f0e118"
    document.querySelector("#shutdownbutton").style.color = "#ddd";
    document.querySelector("#startbutton").style.cursor = "not-allowed"
    document.querySelector("#shutdownbutton").style.cursor = "pointer"
    document.querySelector("#resetbutton").style.cursor = "pointer"
    document.querySelector("#shutdownbutton").style.color = "#ddd"   
    startdb = false,shutdowndb = true,resetbuttondb = true 
  }
  if(msg.status && msg.status.memory){
    setchart("cpu",Math.round(msg.status.cpu))
    setchart("ram",Math.round((msg.status.memory/1024)/1024))
    try{document.querySelector("#systemstatus").innerHTML = "Uptime<br>"+moment(Date.now()-msg.status.elapsed).fromNow()}catch{
    document.querySelector("#systemstatus").innerHTML = "Running"}
    shadow = "0px 0px 25px 8px rgb(9, 202, 64)"
    document.querySelector("#systemstatus").style["background-color"] = "#5ce80c"
    document.querySelector("#startbutton").style["background-color"] = ""
    document.querySelector("#shutdownbutton").style["background-color"] = "#2d302c"
    document.querySelector("#resetbutton").style["background-color"] = "#f0e118"
    document.querySelector("#shutdownbutton").style.color = "#ddd";
    document.querySelector("#startbutton").style.cursor = "not-allowed"
    document.querySelector("#shutdownbutton").style.cursor = "pointer"
    document.querySelector("#resetbutton").style.cursor = "pointer"
    document.querySelector("#shutdownbutton").style.color = "#ddd"
    startdb = false,shutdowndb = true,resetbuttondb = true 
    if(cpuchart.length) {
    document.querySelector("#cputext").innerHTML = "Cpu"
      new Chart("cpu-chart", {type: "line",data: {labels: cpuchart,datasets: [
    {backgroundColor: "rgba(0,0,0,1.0)",borderColor: "rgba(0,0,0,0.1)",data: cpuchart}]},options:{legend: {display: false},
    animation: {duration: 0},elements: {point:{radius: 0}}}});}
    if(ramchart.length){
    document.querySelector("#ramtext").innerHTML = "Ram"
      new Chart("ram-chart", {type: "line",data: {labels: ramchart, datasets: [
    { backgroundColor: "rgba(0,0,0,1.0)",borderColor: "rgba(0,0,0,0.1)",data: ramchart }]},options:{legend: {display: false},
    animation: {duration: 0},elements: {point:{radius: 0}}}});}
      msg.info.storage.map((x)=>{//Disks
      if(!document.getElementById(x.name+"-name")) {$("#disks").append(`
       <div id="${x.name}-div" class="disks">
       <a id="${x.name}-name"></a><a id="${x.name}-size" style="float: right"></a><br><br>
       <a id="${x.name}-processbar" class="diskprocessbar"></a>
       </div><br>
      `)
      document.getElementById(x.name+"-name").innerHTML = x.name}
      var extension = "Kb"
      if(ejs.disks.filter(z=>z.name === x.name).length){
       var totalsize = Number(ejs.disks.filter(z=>z.name === x.name)[0].resize) || 
       Number(ejs.disks.filter(z=>z.name === x.name)[0].size)
       if((x.size/1024) >= 1024 || totalsize >= 1024) {
        x.size = ((x.size/1024)/1024).toFixed(1)
        totalsize= (totalsize/1024).toFixed(1)
        extension = "Gb"	 
       }else {
        if(x.size >= 1024 || totalsize >= 1) {
        x.size = (x.size/1024).toFixed(1)
        extension = "Mb"	
        }else {
          x.size = (x.size).toFixed(1)
        }
       }
       if(!isNaN(totalsize)) {
        var yuzde = ((x.size/totalsize)*100).toFixed(0)
        if(yuzde > 100) yuzde = 100;
        document.getElementById(x.name+"-processbar").innerHTML = String(yuzde)+"%"
        document.getElementById(x.name+"-processbar").style.padding = "1% "+String((Number(yuzde)-20)/2)+"%"
        document.getElementById(x.name+"-size").innerHTML = String(x.size)+extension+"/"+String(totalsize)+extension
        if(yuzde >= 90) {
          document.getElementById(x.name+"-processbar").style["background-color"] = "#de0b0b";
          } else if(yuzde >= 70) {
          document.getElementById(x.name+"-processbar").style["background-color"] = "yellow";
          document.getElementById(x.name+"-processbar").style.color = "black";
          } else {
          document.getElementById(x.name+"-processbar").style["background-color"] = "#05ff05";
          document.getElementById(x.name+"-processbar").style.color = "black";
          }
       } else {
         document.getElementById(x.name+"-size").innerHTML = String(x.size)+extension
       }}else {
       if((x.size/1024) >= 1024) {x.size = ((x.size/1024)/1024).toFixed(1);extension = "Gb"}
       else if((x.size) >= 1024) {x.size = (x.size/1024).toFixed(1);extension = "Mb"}
       else {x.size = (x.size).toFixed(1);extension = "Kb"}
       document.getElementById(x.name+"-size").innerHTML = String(x.size)+extension
      }})
  }
  if(msg.auth && msg.auth.info.password) {
  systemsinfo = {
      osname:msg.auth.osname,
      user:msg.auth.info.username,
      password:msg.auth.info.password
    }
document.querySelector("#systemsos").innerHTML = "Os:"+systemsinfo.osname
document.querySelector("#systemsuser").innerHTML = "Username:<br>"+systemsinfo.user
if(passworddb) document.querySelector("#systemspassword").innerHTML = "Password:<br>"+systemsinfo.password
}
if(msg.info && msg.info.ngrok) {
  ngrokurl = msg.info.ngrok
  document.querySelector("a.buttonngrok").innerHTML = "Ngrok: "+msg.info.ngrok
}
if(msg.notrunning) {
  document.querySelector("#systemstatus").style["background-color"] = ""
  document.querySelector("#startbutton").style["background-color"] = "#5ce80c"
  document.querySelector("#shutdownbutton").style["background-color"] = ""
  document.querySelector("#resetbutton").style["background-color"] = ""
  document.querySelector("#shutdownbutton").style.color = "black";
  document.querySelector("#startbutton").style.cursor = "pointer"
  document.querySelector("#shutdownbutton").style.cursor = "not-allowed"
  document.querySelector("#resetbutton").style.cursor = "not-allowed"
  document.querySelector("#systemstatus").innerHTML = "Offline"
  shadow = "0px 0px 25px 8px rgb(74, 75, 75)"
  startdb = true,shutdowndb = false,resetbuttondb = false 
}
if(msg.info && msg.info.running === false) {
  document.querySelector("#systemstatus").style["background-color"] = ""
  document.querySelector("#systemstatus").innerHTML = "Connecting..."
  shadow = "0px 0px 25px 8px rgb(74, 75, 75)"
}
if(msg.erorr){
  shadow = "0px 0px 25px 8px rgb(255, 0, 0)"
  document.querySelector("#systemstatus").style["background-color"] = "red"
  document.querySelector("#startbutton").style["background-color"] = "#5ce80c"
  document.querySelector("#shutdownbutton").style["background-color"] = ""
  document.querySelector("#resetbutton").style["background-color"] = ""
  document.querySelector("#shutdownbutton").style.color = "black";
  document.querySelector("#startbutton").style.cursor = "pointer"
  document.querySelector("#shutdownbutton").style.cursor = "not-allowed"
  document.querySelector("#resetbutton").style.cursor = "not-allowed"
  document.querySelector("#systemstatus").innerHTML = "Erorr"
  startdb = true,shutdowndb = false,resetbuttondb = false 
}
if(msg.newauth){
  systemsinfo.osname = msg.newauth.osname
  systemsinfo.user = msg.newauth.info.username
  systemsinfo.password = msg.newauth.info.password
  document.querySelector("#systemsos").innerHTML = "Os:"+systemsinfo.osname
  document.querySelector("#systemsuser").innerHTML = "Username:<br>"+systemsinfo.user
  if(passworddb) document.querySelector("#systemspassword").innerHTML = "Password:<br>"+systemsinfo.password
}
if(msg.newvnc) {var newvncip = String(5900+Number(msg.newvnc))
if(!document.querySelector("#buttonvncdiv")){$("#connections").append(`<div id="buttonvncdiv">
<a class="buttonvnc" onclick="copy('${ejs.gill}'+':'+'${newvncip}','Vnc')">Erorr</a>
<br><br><br></div>`)}
document.querySelector(".buttonvnc").innerHTML = "Vnc: "+ejs.gill+":"+newvncip}
if(msg.newmainport) {
if(msg.newmainport && msg.newmainport.split(':').length > 1) msg.newmainport = msg.newmainport.split(':')[1]
if(!document.querySelector("#buttonrdpdiv")){$("#connections").append(`<div id="buttonrdpdiv">
<a class="buttonrdp" onclick="copy('${ejs.gill}'+':'+'${msg.newmainport}','Rdp')">Erorr</a><br><br><br></div>
`)}
document.querySelector(".buttonrdp").innerHTML = "Rdp: "+ejs.gill+":"+msg.newmainport}
if(msg.newauth && !msg.newmainport) document.querySelector("#buttonrdpdiv").remove()
if(msg.newauth && !msg.newvnc) document.querySelector("#buttonvncdiv").remove()
if(msg.deletedserver) window.location = '/panel';
})

//System Status
document.querySelector("#startbutton").style["background-color"] = "#5ce80c"
document.querySelector("#shutdownbutton").style["background-color"] = ""
document.querySelector("#resetbutton").style["background-color"] = ""
document.querySelector("#shutdownbutton").style.color = "black";
document.querySelector("#startbutton").style.cursor = "pointer"
document.querySelector("#shutdownbutton").style.cursor = "not-allowed"
document.querySelector("#resetbutton").style.cursor = "not-allowed"
document.querySelector("#systemstatus").innerHTML = "Status:<br>Offline"
//System Info
document.querySelector("#systemsos").innerHTML = "Os:"+systemsinfo.osname
document.querySelector("#systemsuser").innerHTML = "Username:<br>"+systemsinfo.user
//Copy,Alert and Functions
function copyusername(){copy(systemsinfo.user,"Username")}
function copyngrok(){if(ngrokurl){copy(ngrokurl,"Ngrok")}}
function openpassword(){
if(!passworddb){
document.querySelector("#systemspassword").innerHTML = "Password:<br>"+systemsinfo.password
document.querySelector("#systemspassword").style.color = "#C9C9C9"
}
passworddb = true;
navigator.clipboard.writeText(systemsinfo.password)
alert("Password copied",5000)
copy(systemsinfo.password,"Password")
}
function copy(x,c){
navigator.clipboard.writeText(x);
alert(c+" copied",5000)
}
function alert(x,c,y){
if(y) { document.querySelector("#alertbox").style.color = "red"
x = "Erorr:"+x 
}
document.querySelector("#alertbox").innerHTML = x
document.querySelector("#alertbox").style.visibility = "visible"
document.querySelector("#alertbox").style["margin-top"] = "2%"
document.querySelector("#alertbox").style.padding = "2% 0%"
document.body.scrollTop = 0;
document.documentElement.scrollTop = 0;
setTimeout(()=>{document.querySelector("#alertbox").style.visibility = "hidden";
document.querySelector("#alertbox").innerHTML = ""
document.querySelector("#alertbox").style["margin-top"] = "0%"
document.querySelector("#alertbox").style.padding = "0% 0%"
},c)
}
//Control panel
function reboot(){
if(timeoutdb) return;
if(!resetdb) {alert("Are you sure you want to reinstall the system? Click again if you are sure.",10000)
resetdb = true;} else {
 resetdb = false,timeoutdb = true;
 socket.emit("panelservers",{action:"installos"})
 alert("Please wait reinstalling",10000)
 setTimeout(()=>timeoutdb = false,10000)
}}
function setup(){
if(timeoutdb) return;
var tempos = document.querySelector("#selectmenu").value
if(rebootdb != tempos) {alert("Are you sure you want to "+tempos+" install the system? Click again if you are sure.",10000)
rebootdb = tempos} else {
 rebootdb = "",timeoutdb = true;
 socket.emit("panelservers",{action:"installos",changeos:tempos})
 alert("Please wait installing "+tempos,10000)
 setTimeout(()=>timeoutdb = false,10000)
}}

function start(){
  if(!startdb || timeoutdb) return;
  timeoutdb = true
  setTimeout(()=>timeoutdb = false,10000)
  socket.emit("panelservers",{action:"start"})
  alert("Starting, You must wait 10 seconds to process again",10000)
}
function shutdown(){
  if(!shutdowndb || timeoutdb) return;
  timeoutdb = true
  setTimeout(()=>timeoutdb = false,10000)
  socket.emit("panelservers",{action:"shutdown"})
  alert("Shutdowning, You must wait 10 seconds to process again",10000)
}
function reset(){
  if(!resetbuttondb || timeoutdb) return;
  timeoutdb = true
  setTimeout(()=>timeoutdb = false,10000)
  socket.emit("panelservers",{action:"reset"})
  alert("Resetting, You must wait 10 seconds to process again",10000)
}

function setchart(type,value){
	if(isNaN(Number(value))) return;
	if(type === "cpu"){
	 cpuchart = [cpuchart[1],cpuchart[2],cpuchart[3],cpuchart[4],value]
	}if(type === "ram"){
	 ramchart = [ramchart[1],ramchart[2],ramchart[3],ramchart[4],value]	
	}
}

setInterval(()=>{
  document.querySelector("#systemstatus").style["box-shadow"] = shadow;
  if(shadow === "0px 0px 25px 8px rgb(74, 75, 75)" || shadow === "0px 0px 25px 8px rgb(255, 0, 0)") return;
  shadow = shadow.split(" ").map(function(val, index) {
    if(slimitn === slimit) sshadow = false
    if(slimitn === 0) sshadow = true
    if(sshadow) {
      slimitn++;if (index === 3) {return parseInt(val) + 1 + "px";} else {return val;}
    }else {
     slimitn--;if (index === 3) {return parseInt(val) - 1 + "px";} else {return val;}
  }}).join(" ");
},250)
