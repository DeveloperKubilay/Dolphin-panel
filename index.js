/** Welcome to Dolphin panel
 * Github: https://github.com/DeveloperKubilay/Dolphin-panel
*/

//Database
var settings = require('./settings.json')
const kubitdb = require('kubitdb')
usersdb = new kubitdb("database/users")
osdb = new kubitdb("database/os")
gillsdb = new kubitdb("database/gills")
ddosdb = new kubitdb("database/ddos")
serversdb = new kubitdb("database/servers")
settingsdb = new kubitdb("./settings.json")
if(!usersdb.get("users")) usersdb.set("users",[])
if(!osdb.get("os")) osdb.set("os",[])
if(!gillsdb.get("gills")) gillsdb.set("gills",[])
if(!serversdb.get("servers")) serversdb.set("servers",[])
var limitedlogin = new Map()
var limitedsocket = new Map()
var limitedsendsocket = new Map()

//Express and addons
const express = require('express')
app = express()
bodyParser = require("body-parser")
session = require('express-session')
app.set('view engine', 'ejs');
app.set('views', './pages/ejs')
app.use(express.static("./pages/js"));
app.use(express.static("./pages/css"));
app.use(express.static("./pages/img"));
app.use(bodyParser.json({ limit: settings.posttojson.limit+'3mb' }));
app.use(bodyParser.urlencoded({ limit: settings.posttojson.limit+'mb',
extended: true,
parameterLimit: settings.posttojson.parameter }));
app.use(session({
  secret: settings.sessionsecret,
  resave: true,
  saveUninitialized: false
}))
app.listen(Number(settings.port),()=>{console.log("Panel Runnig")})
process.title = "Dolphin Panel"

//Dolphin gills
const io = require("socket.io")(settings.gillsocket);
var onlineallgills = [],panelusersdb = []
io.use((socket,next) =>{ 
let url = "localhost";
if(socket.handshake.headers["x-forwarded-for"]) url = socket.handshake.headers["x-forwarded-for"]
if(limitedsocket.get("limited-"+url) > settings.socketprotect.limit) return next(new Error("You send too many requests"))
limitedsocket.set("limited-"+url,limitedsocket.get("limited-"+url)+1 || 1)
setTimeout(()=>limitedsocket.set("limited-"+url,limitedsocket.get("limited-"+url)-1 || 0),settings.socketprotect.time)//Protection
if(socket.handshake.auth.type === "admin" && socket.handshake.auth.admin &&
socket.handshake.auth.admin.mail === settings.owner.mail &&
socket.handshake.auth.admin.password === settings.owner.password
){panelusersdb.push({url:url,socket:socket.id,mail: socket.handshake.auth.admin.mail});return next();}//Admin
if(socket.handshake.auth.type === "panelusers" && 
usersdb.get("users").filter(z=>z.password === socket.handshake.auth.password).length &&
usersdb.get("users").filter(z=>z.mail === socket.handshake.auth.mail).length &&
serversdb.get(socket.handshake.auth.name+"-server") &&
serversdb.get(socket.handshake.auth.name+"-server").owner === socket.handshake.auth.mail &&
serversdb.get(socket.handshake.auth.name+"-server").createdtime === socket.handshake.auth.createdtime
){if(panelusersdb.filter(z=> z.url === url).length >= 5 ) {
io.to(panelusersdb.filter(z=> z.url === url)[0].socket).emit("panelusers",{kicked:true})}
if(panelusersdb.filter(z=> z.url === url).length > 7 ) {return next(new Error("You're logging in from so many places"))}
panelusersdb.push({url:url,socket:socket.id,mail:socket.handshake.auth.mail });return next();}//Users
if(socket.handshake.auth.type === "gills" && gillsdb.get("gills").filter(z=>z.token === socket.handshake.auth.token).length) {//Gills
if(settings.socketipchange && socket.handshake.auth.ip){url = socket.handshake.auth.ip}else {
if(gillsdb.get("gills").filter(z=>z.token === socket.handshake.auth.token)[0].ip != url) return next(new Error("Token invalid"))
};onlineallgills = onlineallgills.filter(z=> z.url != url);onlineallgills.push({url:url,socket:socket.id,date:Date.now()})
next()} else {next(new Error("Token invalid"))}})
io.on('connection', function(socket){
 socket.on("disconnect", (x) => {
  if(onlineallgills.filter(z=> z.socket === socket.id).length) {
  io.emit("panelusers",{closegill:onlineallgills.filter(z=> z.socket === socket.id)[0].url})
  onlineallgills = onlineallgills.filter(z=> z.socket != socket.id)
 } else { 
  panelusersdb = panelusersdb.filter(z=> z.socket != socket.id)
 }
  socket.disconnect();
 })
 socket.on('panelservers', function(msg){
if(limitedsendsocket.get(socket.handshake.auth.name)) return;
setTimeout(()=>limitedsendsocket.set(socket.handshake.auth.name,false),8000)
limitedsendsocket.set(socket.handshake.auth.name,true)
if(!socket.handshake.auth.name || !serversdb.get(socket.handshake.auth.name+"-server")) return;
if(onlineallgills.filter(z=> z.url === serversdb.get(socket.handshake.auth.name+"-server").ip).length) {
function sendsocket(owner,json,log){
 if(log) logupdate(msg.machine,log)
 if(owner === "admin" || owner === "all") {
   if(panelusersdb.filter(z=>z.mail === settings.owner.mail).length){
   panelusersdb.filter(z=> z.mail === settings.owner.mail).map((x)=>{io.to(x.socket).emit("panelusers",json)})}
 }
 if(owner === "user" || owner === "all") {
   if(serversdb.get(msg.machine+"-server") && panelusersdb.filter(z=> z.mail === serversdb.get(msg.machine+"-server").owner).length) {
   panelusersdb.filter(z=> z.mail === serversdb.get(msg.machine+"-server").owner).map((x)=>{io.to(x.socket).emit("panelusers",json)})}
 }}

  if(msg.action && msg.action === "reset" || msg.action === "start" || msg.action === "shutdown") {
  io.to(onlineallgills.filter(z=> z.url === serversdb.get(socket.handshake.auth.name+"-server").ip)[0].socket).emit("client",{
  type:"set-server",
  code:{id:socket.handshake.auth.name,type:msg.action}
 })
}
if(msg.action === "installos") {
  if( msg.changeos && osdb.get("os").filter(z=>z.name === msg.changeos)[0].type &&
  !serversdb.get(socket.handshake.auth.name+"-server").ports.mainport) return sendsocket("all",{
    machine:socket.handshake.auth.name,
    erorr:true
  })
  if(msg.changeos && osdb.get("os").filter(z=>z.name === msg.changeos).length) {
    var tmpdb = serversdb.get(socket.handshake.auth.name+"-server")
    changeos = osdb.get("os").filter(z=>z.name === msg.changeos)[0]
    os = osdb.get("os").filter(z=>z.name === serversdb.get(socket.handshake.auth.name+"-auth").osname)
    addeddisks = [],disks=[]
    tmpdb.disks.map((x)=>addeddisks.push(x))
    serversdb.get(socket.handshake.auth.name+"-auth").osname
if(os.length) {
  os[0].disks.map((x)=>addeddisks = addeddisks.filter(z=>z.name != x.name))} 
  else {addeddisks = addeddisks.filter(z=>!z.main)}
   changeos.disks.map((x)=>{disks.push(x)})
   addeddisks.map((x)=>disks.push(x))
   if(gillsdb.get("gills").filter((x)=>x.ip === tmpdb.ip).length){
    var gillname = gillsdb.get("gills").filter((x)=>x.ip === tmpdb.ip)[0].name
    var tempgill = gillsdb.get(gillname+"-database")
   };try{
   if(changeos.vnc != "true") {tmpdb.ports.vnc = "";tempgill.vnc += -1;} 
   else if(gillsdb.get("gills").filter((x)=>x.ip === tmpdb.ip).length){
   tempgill.vnc++;
   tmpdb.ports.vnc = String(tempgill.vnc)
   }
   gillsdb.set(gillname+"-database",tempgill)}catch{}
   if(!changeos.type) {tmpdb.os = ""} 
   else {tmpdb.os = changeos.type}
   tmpdb.disks = disks
    serversdb.set(socket.handshake.auth.name+"-auth",{
     osname:msg.changeos,
     info:changeos.info
    })
    if(os.length) osdb.delete(os[0].name+"-servers",1)
    osdb.add(msg.changeos+"-servers",1)
    serversdb.set(socket.handshake.auth.name+"-server",tmpdb)
    var server = serversdb.get(socket.handshake.auth.name+"-server")
    sendsocket("all",{
      machine:socket.handshake.auth.name,
      newauth:serversdb.get(socket.handshake.auth.name+"-auth"),
      newvnc:server.ports.vnc,
      newmainport:server.ports.mainport
    })
  }
  if(onlineallgills.filter(z=> z.url === 
  serversdb.get(socket.handshake.auth.name+"-server").ip).length) {
  io.to(onlineallgills.filter(z=> z.url === 
serversdb.get(socket.handshake.auth.name+"-server").ip)[0].socket).emit("client",{
    type:"create-server",
    code:serversdb.get(socket.handshake.auth.name+"-server")
  })
}}
}})
 socket.on("servers", function(msg){
if(onlineallgills.filter(z=> z.socket === socket.id).length === 0) return; 
function sendsocket(owner,json,log){
if(log) logupdate(msg.machine,log)
if(owner === "admin" || owner === "all") {
  if(panelusersdb.filter(z=>z.mail === settings.owner.mail).length){
  panelusersdb.filter(z=> z.mail === settings.owner.mail).map((x)=>{io.to(x.socket).emit("panelusers",json)})}
}
if(owner === "user" || owner === "all") {
  if(serversdb.get(msg.machine+"-server") && panelusersdb.filter(z=> z.mail === serversdb.get(msg.machine+"-server").owner).length) {
  panelusersdb.filter(z=> z.mail === serversdb.get(msg.machine+"-server").owner).map((x)=>{io.to(x.socket).emit("panelusers",json)})}
}}

 if(msg.installing && msg.code.process) { 
  sendsocket("all",{
    machine:msg.machine,
    install:{process:msg.code.process,time:msg.code.time}
  },"Installing "+msg.code.text+" "+msg.code.process+"%")
 }
 if(msg.running || msg.info && msg.info.running) { let running;
  if(msg.running === true)  running = "Running "+Date.now()
  sendsocket("all",{
    machine:msg.machine,
    auth:serversdb.get(msg.machine+"-auth"),
    nowrunning: msg.running,
    running: msg.info && msg.info.running,
    status:msg.status,
    info:msg.info
  },running)
 }
 if(msg.notrunning === true) {
  sendsocket("all",{
    machine:msg.machine,
    notrunning: true
  },"Stoped "+Date.now())
 }
 if(msg.err === true) {
  sendsocket("all",{
    machine:msg.machine,
    erorr:true
  },"Erorr") 
 }
 if(msg.deletedserver === true) {
  sendsocket("all",{
    machine:msg.machine,
    deletedserver:true
  })
 }
 if(msg.totaldisksize && onlineallgills.filter(z=> z.socket === socket.id).length){
 if(gillsdb.get("gills").filter(z=>onlineallgills.filter(z=> z.socket === socket.id).length.url === z.ip)){
 var data =gillsdb.get(gillsdb.get("gills").filter(z=>onlineallgills.filter(z=> z.socket === socket.id)[0].url === z.ip)[0].name+"-database")
 if(typeof msg.totaldisksize === "number") {
 data.disk = Number(gillsdb.get("gills").filter(z=>onlineallgills.filter(z=> z.socket === socket.id)[0].url === z.ip)[0].disk)-msg.totaldisksize
 if(data.disk < 0) data.disk = 0
 }else data.disk = Number(gillsdb.get("gills").filter(z=>onlineallgills.filter(z=> z.socket === socket.id)[0].url === z.ip)[0].disk)
 gillsdb.set(gillsdb.get("gills").filter(z=>onlineallgills.filter(z=> z.socket === socket.id)[0].url === z.ip)[0].name+"-database",data)
 }}
 
})
})

function logupdate(machine,text){
if(!serversdb.get(machine+"-server")) return;
if(serversdb.get(machine+"-logs") &&serversdb.get(machine+"-logs").length > 100) {
serversdb.set(machine+"-logs",serversdb.get(machine+"-logs").filter((z)=> z != serversdb.get(machine+"-logs")[0]))
};serversdb.push(machine+"-logs",text)
}

//Ddos protect
if(settings.ddosprotect.status){
app.all("*",function (req,res,next){try{
if(!req.headers["x-forwarded-for"]) req.headers["x-forwarded-for"] = "localhost";
if(ddosdb.get("blacklist-"+req.headers["x-forwarded-for"])) {return res.end();}
if(ddosdb.get("user-"+req.headers["x-forwarded-for"]) > settings.ddosprotect.limit) {
ddosdb.set("blacklist-"+req.headers["x-forwarded-for"],true)
ddosdb.del("user-"+req.headers["x-forwarded-for"])
if(settings.ddosprotect.removeban){
setTimeout(()=>{ddosdb.del("blacklist-"+req.headers["x-forwarded-for"])
},settings.ddosprotect.removeban)}
}else {ddosdb.add("user-"+req.headers["x-forwarded-for"],1)
if(!ddosdb.get("timeout-"+req.headers["x-forwarded-for"])) {
ddosdb.set("timeout-"+req.headers["x-forwarded-for"],true)
setTimeout(()=>{ddosdb.del("user-"+req.headers["x-forwarded-for"])
ddosdb.del("timeout-"+req.headers["x-forwarded-for"])},settings.ddosprotect.time)}}
return next();}catch {return next();}})}

//Pages
app.get('/', function (req, res) {
  if(req.session.usertype === 'admin') return res.redirect('/admin/panel')
  if(req.session.usertype === 'user') return res.redirect('/panel')
  return res.render('login.ejs',{type:"login",register:settings.register.status});
})

app.get('/admin/panel', function (req, res) {
  if(req.session.usertype != 'admin') return res.redirect('/')
  res.render('admin/panel',{
    settings: req.session.settings,
    page:"panel"
  });
})

app.get('/admin/users', function (req, res) {
  if(req.session.usertype != 'admin') return res.redirect('/')
  res.render('admin/users',{
    settings: req.session.settings,
    page:"users",
    search:false,
	usersdb:usersdb,
    users:usersdb.get("users")
  });
})

app.get('/admin/adduser', function (req, res) {
  if(req.session.usertype != 'admin') return res.redirect('/')
  res.render('admin/adduser',{
    settings: req.session.settings,
    page:"users",
    user:false
  });
})
app.get('/admin/edituser/:mail', function (req, res) {
  if(req.session.usertype != 'admin') return res.redirect('/')
  if(!usersdb.get("users").filter(z=> z.mail === req.params.mail).length) return res.redirect('/admin/users')
  res.render('admin/adduser',{
    settings: req.session.settings,
    user:usersdb.get("users").filter(z=> z.mail === req.params.mail)[0],
    page:"users"
  });
})
app.post('/api/users/remove/', function (req, res) {
  if(req.session.usertype != 'admin') return res.redirect('/')
  if(usersdb.get("servers-"+req.body.mail).length){
    return res.send({message:"In order to delete User, you need to delete the servers here",
    color:"red",servers:usersdb.get("servers-"+req.body.mail)})
  }
  usersdb.del("servers-"+req.body.mail)
  usersdb.set("users",usersdb.get("users").filter(z=> z.mail != req.body.mail))
  return res.send({message:"User deleted",color:"green",url:'/admin/users'})
})

app.post("/api/users/add", function (req, res) {
  if(req.session.usertype != 'admin') return res.redirect('/')
  if(!req.body.password || !req.body.mail || !req.body.username) return res.send({message:"Please fill all",color:"red"})
  if(usersdb.get("users").filter(z=> z.mail === req.body.mail).length) {
    usersdb.set("users",usersdb.get("users").filter(z=> z.mail != req.body.mail))
    usersdb.push("users",req.body)
    return res.send({message:"User edited",url:"/admin/users",color:"green"})
  } else {
	if(req.body.mail === settings.owner.mail) return res.send({
    message:"Cannot be same mail as owner of user",color:"red"})
    usersdb.push("users",req.body)
	usersdb.set("servers-"+req.body.mail,[])
    return res.send({message:"Created user",url:"/admin/users",color:"green"})
  }
})

app.post("/admin/users/search", function (req, res) {
if(req.session.usertype != 'admin') return res.redirect('/')
var results = [];
usersdb.get("users").map((x)=>{
if(x.username.split(req.body.search).length > 1 || x.mail.split(req.body.search).length > 1) {
results.push(x)
}})
res.render('admin/users',{
  settings: req.session.settings,
  page:"users",
  search:req.body.search,
  users:results
});
})
app.post("/api/login/", function (req, res) {
if(!req.headers["x-forwarded-for"]) req.headers["x-forwarded-for"] = "localhost"
if(limitedlogin.get(req.headers["x-forwarded-for"]+"out")) 
  return res.send({message:"Please try again later you tried too many",color:"red"})
if(!req.body || !req.body.mail || !req.body.password) return res.end();
if(!limitedlogin.get(req.headers["x-forwarded-for"]+"try")) limitedlogin.set(req.headers["x-forwarded-for"]+"try",0)
if(limitedlogin.get(req.headers["x-forwarded-for"]+"try") > 10) {
limitedlogin.set(req.headers["x-forwarded-for"]+"out",true)
setTimeout(()=>limitedlogin.set(req.headers["x-forwarded-for"]+"out",false),120000)
limitedlogin.set(req.headers["x-forwarded-for"]+"try",0)}
limitedlogin.set(req.headers["x-forwarded-for"]+"try",limitedlogin.get(req.headers["x-forwarded-for"]+"try")+1)
if(req.body.mail === settings.owner.mail && req.body.password === settings.owner.password) {
  req.session.usertype = "admin"
  req.session.settings = settings
  return res.send({message:"Hello Admin",url:"/admin/panel",color:"green"})
}else {
if(usersdb.get("users").filter((x)=> x.mail === req.body.mail).length) {
  if(usersdb.get("users").filter((x)=> x.mail === req.body.mail)[0].password === req.body.password){
    req.session.usertype = "user"
    req.session.settings = usersdb.get("users").filter((x)=> x.mail === req.body.mail)[0]
    return res.send({message:"Hello User",url:"/panel",color:"green"})
  }
  } else {
    return res.send({message: 'Incorrect password or email',color:"red"})
}}})

if(settings.register.status){
var nowtime = Date.now()
setInterval(()=>nowtime = Date.now(),60000)
app.get('/register',function(req,res){
  if(req.session.usertype === 'admin') return res.redirect('/admin/panel')
  if(req.session.usertype === 'user') return res.redirect('/panel')
  return res.render('login.ejs',{type:"register",register:settings.register.status});
})
app.post("/api/register/", function (req, res) {
if(!req.headers["x-forwarded-for"]) req.headers["x-forwarded-for"] = "localhost"
if(limitedlogin.get(req.headers["x-forwarded-for"]+"register")>nowtime) 
  return res.send({message:"You have already created an account, try again later",color:"red"})
if(!req.body || !req.body.mail || !req.body.password || !req.body.username) return res.end();
if(req.body.mail === settings.owner.mail || 
  usersdb.get("users").filter((x)=> x.mail === req.body.mail).length) {
  return res.send({message:"Such a user already exists",color:"red"})
}
limitedlogin.set(req.headers["x-forwarded-for"]+"register",Date.now()+settings.register.time)
usersdb.push("users",{
  "password": req.body.password,
  "mail": req.body.mail,
  "username": req.body.username
})
usersdb.set("servers-"+req.body.mail,[])
    return res.send({message: 'Hello '+req.body.username,url:"/",color:"green"})
})
}

app.get("/logout", function (req, res) {
  req.session.usertype = false;
  req.session.settings = false;
  return res.redirect("/")
})
app.post("/api/settings", function (req, res) {
  if(req.session.usertype != 'admin') return res.redirect('/')
  var tmpdb = settings
  if(req.body.ddosstatus === "true") {tmpdb.ddosprotect.status = true } else {
  tmpdb.ddosprotect.status = false}
  if(req.body.registerstatus === "true") {tmpdb.register.status = true } else {
  tmpdb.register.status = false} 
  if(req.body.panelname) tmpdb.panelinfo.name = String(req.body.panelname)
  if(req.body.port) tmpdb.port = Number(req.body.port) || 80
  if(req.body.socketport) tmpdb.gillsocket = Number(req.body.socketport) || 8080
  if(req.body.registertime) tmpdb.register.time = Number(req.body.registertime) || 86400000
  if(req.body.ddoslimit) tmpdb.ddosprotect.limit = Number(req.body.ddoslimit) || 30
  if(req.body.ddostime) tmpdb.ddosprotect.time = Number(req.body.ddostime) || 10000
  if(req.body.ddosremoveban) tmpdb.ddosprotect.removeban = Number(req.body.ddosremoveban) ||600000
 require("fs").writeFileSync("settings.json",JSON.stringify(tmpdb))
  return res.redirect("/admin/panel")
})

app.get('/admin/os', function (req, res) {
  if(req.session.usertype != 'admin') return res.redirect('/')
  res.render('admin/os',{
    settings: req.session.settings,
    os:osdb,
    page:"os"
  });
})
app.get('/admin/addos', function (req, res) {
  if(req.session.usertype != 'admin') return res.redirect('/')
  res.render('admin/addos',{
    page:"os",
    settings: req.session.settings,
    os:false
  });
})
app.get('/admin/editos/:name', function (req, res) {
  if(req.session.usertype != 'admin') return res.redirect('/')
  if(!osdb.get("os").filter(z=> z.name === req.params.name).length) return res.redirect('/admin/os')
  res.render('admin/addos',{
    page:"os",
    settings: req.session.settings,
    os:osdb.get("os").filter(z=> z.name === req.params.name)[0]
  });
})
app.post("/api/os/add", function (req, res) {
  if(req.session.usertype != 'admin') return res.redirect('/')
if(req.body.edit){osdb.set("os",osdb.get("os").filter(z=> z.name != req.body.edit))}
osdb.set("os",osdb.get("os").filter(z=> z.name != req.body.os.name))
osdb.push("os",req.body.os)
if(req.body.edit){return res.send({message:"Os edited",color:"green",url:"/admin/os"}) } else {
  return res.send({message:"Os added",color:"green",url:"/admin/os"})
}
})
app.get("/api/os/remove/:name", function (req, res) {
  if(req.session.usertype != 'admin') return res.redirect('/')
  osdb.set("os",osdb.get("os").filter(z=> z.name != req.params.name))
  osdb.delete(req.params.name+"-servers")
  return res.redirect("/admin/os")
})
app.get('/admin/gills', function (req, res) {
  if(req.session.usertype != 'admin') return res.redirect('/')
  res.render('admin/gills',{
    page:"gills",
    gills: gillsdb.get("gills"),
    gill:gillsdb,
    onlineallgills:onlineallgills,
    settings: req.session.settings,
  });
})
app.get('/admin/addgills', function (req, res) {
  if(req.session.usertype != 'admin') return res.redirect('/')
  res.render('admin/addgills',{
    settings: req.session.settings,
    page:"gills",
    gills:false
  });
})
app.get('/admin/editgill/:name', function (req, res) {
  if(req.session.usertype != 'admin') return res.redirect('/')
  if(!gillsdb.get("gills").filter(z=> z.name === req.params.name).length) return res.redirect('/admin/gills')
  res.render('admin/addgills',{
    settings: req.session.settings,
    page:"gills",
    gills:gillsdb.get("gills").filter(z=> z.name === req.params.name)[0]
  });
})
app.post("/api/gills/add", function (req, res) {
if(req.session.usertype != 'admin') return res.redirect('/')
if(req.body.edit){//Edit
  var oldmap = gillsdb.get("gills").filter(z=> z.name === req.body.edit)[0]
  olddb = gillsdb.get(req.body.edit+"-database"),usingcpu=0,usingram=0,usingdisk=0,usingports=[],ports=[]
  gillsdb.set("gills",gillsdb.get("gills").filter(z=> z.name != req.body.edit))
  usingdisk = oldmap.disk-olddb.disk,usingcpu = oldmap.cpu-olddb.cpu,usingram = oldmap.ram-olddb.ram
  oldmap.ports.map((x)=>{if(!olddb.ports.filter(z=>z.port === x.port).length) usingports.push(x)})
  req.body.gill.ports.map((x)=>{if(!usingports.filter(z=>z.port === x.port).length) ports.push(x)})
  gillsdb.set(req.body.edit+"-database",
  {
    "disk": Number(req.body.gill.disk - usingdisk),
    "cpu": Number(req.body.gill.cpu - usingcpu),
    "ram": Number(req.body.gill.ram - usingram),
    "vnc":olddb.vnc,
    "ports": ports
  }
 )
}//Create
if(!gillsdb.get(req.body.gill.name+"-database")){
  gillsdb.set(req.body.gill.name+"-database",{
    "disk": Number(req.body.gill.disk),
    "cpu": Number(req.body.gill.cpu),
    "ram": Number(req.body.gill.ram),
    "vnc":0,
    "ports": req.body.gill.ports
  }) 
}
gillsdb.push("gills",req.body.gill)
if(req.body.edit){return res.send({message:"Edited gill",color:"green",url:"/admin/gills"}) } else {
  return res.send({message:"Connected to gill",color:"green",url:"/admin/gills"})
}
})
app.post("/api/gills/remove/", function (req, res) {
  if(req.session.usertype != 'admin') return res.redirect('/')
  if(!req.body || !req.body.name) return res.redirect('/')
  var servers = []
  if(gillsdb.get("gills").filter(z=> z.name === req.body.name).length) {
  var tmpdb = gillsdb.get("gills").filter(z=> z.name === req.body.name)[0]
  serversdb.get("servers").map((x)=> {if(serversdb.get(x+"-server").ip === tmpdb.ip) {
  servers.push(x)}})}
  if(servers.length) {
    return res.send({message:"In order to delete Gill, you need to delete the servers here",
    color:"red",servers:servers})
  }
  gillsdb.set("gills",gillsdb.get("gills").filter(z=> z.name != req.body.name))
  gillsdb.delete(req.body.name+"-database")
  return res.send({message:"Gill deleted",color:"green",url:"/admin/gills"})
})
app.get('/panel/machine/:id/logs', function (req, res) {
if(req.session.usertype != 'admin' && req.session.usertype != 'user' ) return res.redirect('/')
if(req.session.usertype === 'admin' && !serversdb.get(req.params.id+"-logs"))return res.redirect('/panel/machine/'+req.params.id)
if(req.session.usertype === 'user' && !serversdb.get(req.params.id+"-logs"))return res.redirect('/panel/machine/'+req.params.id)
if(req.session.usertype === 'user' && 
serversdb.get(req.params.id+"-server").owner != req.session.settings.mail) return res.redirect('/panel')
var text = "";serversdb.get(req.params.id+"-logs").map((x)=>text += "\n"+x)
res.send(`<h2>Dolphin panel v${settings.panelinfo.version} - ${req.params.id} Server logs</h2>
<h2 onclick="clickcopy()" id="clickcopy">Click to copy</h2>
<a id="text"></a>
<style>*{font-family: sans-serif;background-color: #262626;color:#ddd}
#clickcopy:hover {cursor:pointer;}</style>
<script>
var text = \`${text}\`
document.querySelector("#text").innerHTML = text.split("\\n").join("<br>")
function clickcopy(){
navigator.clipboard.writeText(text);
document.querySelector("#clickcopy").innerHTML = "Copied"
setTimeout(()=>document.querySelector("#clickcopy").innerHTML = "Click to copy",5000)
}</script>
`)})
app.get('/panel/machine/:id', function (req, res) {
if(req.session.usertype != 'admin' && req.session.usertype != 'user' ) return res.redirect('/')
if(req.session.usertype === 'admin' && !serversdb.get(req.params.id+"-server"))return res.redirect('/admin/servers')
if(req.session.usertype === 'user' && !serversdb.get(req.params.id+"-server"))return res.redirect('/panel')
if(req.session.usertype === 'user' && 
serversdb.get(req.params.id+"-server").owner != req.session.settings.mail) return res.redirect('/panel')
  res.render('panel/machine',{
   settings: settings,
   os:osdb.get("os"),
   machine:serversdb.get(req.params.id+"-server"),
   socketio:settings.socketip,
   userinfo:req.session.settings.owner || req.session.settings,
   admin:req.session.usertype === 'admin'
  })
})

app.get('/admin/servers', function (req, res) {
  if(req.session.usertype != 'admin') return res.redirect('/')
  res.render('admin/servers',{
	settings: req.session.settings,
    page:"servers",
    search:false,
	  serversdb:serversdb,
	  gills: gillsdb.get("gills"),
    servers:serversdb.get("servers")
  });
})

app.post("/admin/servers/search", function (req, res) {
if(req.session.usertype != 'admin') return res.redirect('/')
var results = [];
serversdb.get("servers").map((x)=>{
if(x.split(req.body.search).length > 1) {results.push(x)}})
res.render('admin/servers',{
  settings: req.session.settings,
  page:"servers",
  search:req.body.search,
  serversdb:serversdb,
  gills: gillsdb.get("gills"),
  servers:results
});
})

app.get('/admin/addservers', function (req, res) {
  if(req.session.usertype != 'admin') return res.redirect('/')
  res.render('admin/addservers',{
    settings: req.session.settings,
    page:"servers",
	users: usersdb.get("users") || [],
	os:osdb.get("os") || [],
	osdb:osdb,
	usersdb:usersdb,
	gills: gillsdb.get("gills") || [],
	gillsdb: gillsdb,
	serversdb:serversdb,
  server:false
  });
})
app.get('/admin/editservers/:name', function (req, res) {
  if(req.session.usertype != 'admin') return res.redirect('/')
  if(!serversdb.get("servers").filter(z=> z === req.params.name).length) return res.redirect('/admin/servers')
  var disks = []
  serversdb.get(req.params.name+"-server").disks.map((x)=>disks.push(x))
  try{
  osdb.get("os").filter(z=>z.name === serversdb.get(req.params.name+"-auth").osname)[0].disks.map((x)=>{
    disks = disks.filter((z)=>z.name != x.name)
  })
  }catch{}
  res.render('admin/addservers',{
    settings: req.session.settings,
    page:"servers",
	serversdb:serversdb,
	users: usersdb.get("users") || [],
	usersdb:usersdb,
  disks:disks,
  osdb:osdb,
  gillsdb: gillsdb,
  server:serversdb.get(req.params.name+"-server"),
  gillname:gillsdb.get("gills").filter((z)=>serversdb.get(req.params.name+"-server"))
  });
})
app.post("/api/servers/add", function (req, res) {
if(req.session.usertype != 'admin') return res.redirect('/')
if(req.body.edit){//edit
  var name = req.body.code.id || req.body.edit
  var x = serversdb.get(req.body.edit+"-server");if(!x) return res.send({message:"Server not found",color:"red"})
  if(!onlineallgills.filter(z=> z.url === x.ip).length) return res.send({message:"Gill is not active",color:"red"})
  if(!gillsdb.get("gills").filter((z)=>z.ip === serversdb.get(req.body.edit+"-server").ip).length) return res.send({message:"Gill not found",
  color:"red",url:"/admin/servers"})
  if(req.body.code.id){ x.id = req.body.code.id
    usersdb.set("servers-"+serversdb.get(req.body.edit+"-server").owner,
    usersdb.get("servers-"+serversdb.get(req.body.edit+"-server").owner).filter((z)=>z != req.body.edit))
    usersdb.push("servers-"+serversdb.get(req.body.edit+"-server").owner,req.body.code.id)
    serversdb.set("servers",serversdb.get("servers").filter((z)=> z != req.body.edit))
    serversdb.push("servers",req.body.code.id)
    serversdb.set(req.body.code.id+"-auth",serversdb.get(req.body.edit+"-auth"))
    serversdb.set(req.body.code.id+"-logs",serversdb.get(req.body.edit+"-logs"))
    serversdb.set(req.body.code.id+"-server",serversdb.get(req.body.edit+"-server"))
    serversdb.delete(req.body.edit+"-auth")
    serversdb.delete(req.body.edit+"-logs")
    serversdb.delete(req.body.edit+"-server")
  }
  var gillname = gillsdb.get("gills").filter((z)=>z.ip === serversdb.get(name+"-server").ip)[0].name
  var gilltempdb = gillsdb.get(gillname+"-database")
  if(req.body.code.owner){ 
    usersdb.set("servers-"+serversdb.get(name+"-server").owner,
    usersdb.get("servers-"+serversdb.get(name+"-server").owner).filter((z)=> z != name))
    usersdb.push("servers-"+req.body.code.owner,name)
    x.owner = req.body.code.owner}
  if(req.body.code.cpu){ 
    gilltempdb.cpu = (gilltempdb.cpu)+(Number(x.cpu)-Number(req.body.code.cpu))
    x.cpu = req.body.code.cpu}
  if(req.body.code.ram){ 
    gilltempdb.ram = (gilltempdb.ram)+(Number(x.ram)-Number(req.body.code.ram))
    x.ram = req.body.code.ram}
  if(req.body.code.ngrok){if(req.body.code.ngrok === "deleted") {x.ngrok = ""}else{x.ngrok = req.body.code.ngrok}}
  if(req.body.code.ports && req.body.code.ports.mainport){
   if(req.body.code.ports.mainport === "deleted") {x.ports.mainport = ""} else {
   x.ports.mainport = req.body.code.ports.mainport
  }}
  if(req.body.code.disks && req.body.code.disks.length) {
    req.body.code.disks.map((y)=>{
      if(y.deletedisk) x.disks = x.disks.filter(z=> z.name != y.deletedisk)
      if(y.newdisk) x.disks.push(y.code)
      if(y.editdisk) y.tempname = y.code.oldname || y.editdisk
      if(y.editdisk && x.disks.filter(z=> z.name === y.tempname).length) {
        var z = x.disks.filter(z=> z.name === y.tempname)[0]
        if(y.code.resize) {if(y.code.resize === "deleted"){z.resize = ""}else{z.resize = y.code.resize}}
        if(y.code.forcetype) {if(y.code.forcetype === "deleted"){z.forcetype = ""}else{z.forcetype = y.code.forcetype}}
        if(y.code.size) {if(y.code.size === "deleted"){z.size = ""}else{z.size = y.code.size}}
        if(y.code.url){if(y.code.url === "deleted"){z.url = ""}else {z.url = y.code.url}}
        if(y.code.type){z.type = y.code.type}
        x.disks = x.disks.filter(z=> z.name != y.tempname)
        if(y.editdisk && y.code.oldname) z.name = y.code.name 
        x.disks.push(z)
      }
    })
  }
  if(req.body.code.ports && req.body.code.ports.port && req.body.code.ports.port.length) { 
    req.body.code.ports.port.map((y)=>{ 
      if(y.deletedport) {
        x.ports.port = x.ports.port.filter(z=> z.port != y.code.port && z.panelport != y.code.panelport)
        gilltempdb.ports.push(y.code)
      }
      if(y.newport) {if(!x.ports.port) x.ports.port = []
        x.ports.port.push(y.code)
        gilltempdb.ports = gilltempdb.ports.filter(z=> z.port != y.code.port && z.panelport != y.code.panelport)
      }})
  }
  serversdb.set(name+"-server",x)
  gillsdb.set(gillname+"-database",gilltempdb)
  io.to(onlineallgills.filter(z=> z.url === x.ip)[0].socket).emit("client",{
      type:"edit-server",
      id:req.body.edit,
      disks:req.body.code.disks,
      code:x
  })
}else {
if(onlineallgills.filter(z=> z.url === req.body.code.ip).length) {
serversdb.set(req.body.code.id+"-auth",req.body.auth)
var gilldb = gillsdb.get(gillsdb.get("gills").filter((z)=>z.ip === req.body.code.ip)[0].name+"-database"),
ports = []
serversdb.push("servers",req.body.code.id)
serversdb.set(req.body.code.id+"-server",req.body.code)
osdb.add(req.body.auth.osname+"-servers",1)
usersdb.push("servers-"+req.body.code.owner,req.body.code.id)
ports = gilldb.ports || []
if(req.body.code.ports.mainport) {ports = gilldb.ports.filter((z)=> z.port != req.body.code.ports.mainport)}
if(req.body.code.ports.port) { req.body.code.ports.port.map((z)=>{ports = ports.filter((y)=>y.port != z.port)}) }
gilldb.cpu = gilldb.cpu-Number(req.body.code.cpu),
gilldb.ram = gilldb.ram-Number(req.body.code.ram),
gilldb.vnc = Number(req.body.code.ports.vnc) || Number(gilldb.vnc),
gilldb.ports = ports
gillsdb.set(gillsdb.get("gills").filter((z)=>z.ip === req.body.code.ip)[0].name+"-database",gilldb)
io.to(onlineallgills.filter(z=> z.url === req.body.code.ip)[0].socket).emit("client",{
  type:"create-server",
  code:req.body.code
})
} else {return res.send({message:"Gill is not active",color:"red"})}}
if(req.body.edit){return res.send({message:"Edited to server",color:"green",url:"/admin/editservers/"+req.body.edit}) 
} else {return res.send({message:"Added to server",color:"green",url:"/admin/editservers/"+req.body.code.id})}
})
app.post("/api/servers/remove", function (req, res) {
  if(req.session.usertype != 'admin') return res.redirect('/')
  if(serversdb.get(req.body.machine+"-server") &&
  onlineallgills.filter(z=> z.url === serversdb.get(req.body.machine+"-server").ip).length) {
    usersdb.set("servers-"+serversdb.get(req.body.machine+"-server").owner,
    usersdb.get("servers-"+serversdb.get(req.body.machine+"-server").owner).filter(z=> z != req.body.machine))
    if(osdb.delete(serversdb.get(req.body.machine+"-auth").osname+"-servers")){
     osdb.delete(serversdb.get(req.body.machine+"-auth").osname+"-servers",1)
    }
    if(gillsdb.get("gills").filter(z=>serversdb.get(req.body.machine+"-server").ip === z.ip)){
    var serverdata = serversdb.get(req.body.machine+"-server"),
    data =gillsdb.get(gillsdb.get("gills").filter(z=>serversdb.get(req.body.machine+"-server").ip === z.ip)[0].name+"-database")
if(serverdata.ports.mainport) {if(serverdata.ports.mainport.split(":").length  > 1) {
data.ports.push({ port: serverdata.ports.mainport.split(":")[0], panelport: serverdata.ports.mainport.split(":")[1], changeport: 'true' })
}else {data.ports.push({ port: serverdata.ports.mainport, panelport: serverdata.ports.mainport })}}
if(serverdata.ports.port) { serverdata.ports.port.map((x)=>data.ports.push(x))}
    data.cpu = data.cpu+Number(serversdb.get(req.body.machine+"-server").cpu)
    data.ram = data.ram+Number(serversdb.get(req.body.machine+"-server").ram)
    data.disk = data.disk+Number((req.body.disk/1024).toFixed())
    gillsdb.set(gillsdb.get("gills").filter(z=>serversdb.get(req.body.machine+"-server").ip === z.ip)[0].name+"-database",data)
    }
  io.to(onlineallgills.filter(z=> z.url === serversdb.get(req.body.machine+"-server").ip)[0].socket).emit("client",{
  type:"set-server",
  code:{id:req.body.machine,type:"delete"}
})
serversdb.set("servers",serversdb.get("servers").filter(z=> z != req.body.machine))
serversdb.delete(req.body.machine+"-server")
serversdb.delete(req.body.machine+"-auth")
serversdb.delete(req.body.machine+"-logs")
  return res.send({message:"Server deleted",color:"green",url:"/admin/servers"})
} else {
  return res.send({message:"Gill is not active",color:"red"})
}
})

app.get("/panel", function (req, res) {
  if(!req.session.usertype) return res.redirect("/") 
  if(req.session.usertype === 'admin') return res.redirect('/admin/servers')
  var serversinfo = []
  usersdb.get("servers-"+req.session.settings.mail).map((x)=>{
    serversinfo.push(serversdb.get(x+"-server"))
  })
  res.render("panel/panel.ejs",{
    settings: settings,
    usersettings:req.session.settings,
    servers:serversinfo
  })
})

app.use((q,r)=>r.status(404).render("404.ejs"))
