$( "#addserversform" ).submit(function( event ) {
    event.preventDefault();
    var errs = 0,$diskform = $( "#disks" ),mainport,
	$form = $( this ),url = $form.attr( "action" ),ports = [],disks = [],vnc
     id = $form.find( "input[name='name']" ).val(),
     owner = $form.find( "input[name='owner']" ).val(),
     os = $form.find( "input[name='os']" ).val(),
	 gill = $form.find( "input[name='gill']" ).val(),
   ngrok = $form.find( "input[name='ngrok']" ).val(),
	 cpu = $form.find( "input[name='cpu']" ).val().toLowerCase().split("mb").join(""),
	 ram = $form.find( "input[name='ram']" ).val().toLowerCase().split("mb").join("")

   function err(err){
    document.getElementById("status").innerHTML = err
    document.getElementById("status").style.color = "red"
    errs += 1;
  }
try{var edit = document.querySelector("#editservername").innerHTML} catch{ var edit = ""}
if(!id || !edit && ejs.server[id+"-server"]) return err("Please enter server name or add a non-existent server name")
if(!ram || isNaN(Number(ram))) return err("Please enter number in ram in mb")
if(!cpu || isNaN(Number(cpu))) return err("Please enter number in cpu in mb")
if(ngrok && ngrok.length <= 45) return err("Your Ngrok token is incorrect")
if(!edit && !gill || !edit && !ejs.gills.gills.filter((z)=>z.ip === gill).length) return err("Please add an existing gill");
if(!edit && !os || !edit && !ejs.os.filter((z)=>z.name === os).length) return err("Please add an existing os");
if(!owner || !ejs.users.users.filter((z)=>z.mail === owner).length) return err("Please add an existing owner");
if(ejs.server.id === id) id = ""
if(ejs.server.owner === owner) owner = ""
if(ejs.server.ram === ram) ram = ""
if(ejs.server.cpu === cpu) cpu = ""
if(edit && !ngrok) ngrok = "deleted"
if(ejs.server.ngrok === ngrok) ngrok = ""

	 $("#allports").find("a").map((c,x)=>{ 
    var input = x.innerHTML
 if(input === document.querySelector("#allports > a:nth-child(1)").innerHTML){
  if(!edit && !ejs.os.filter((z)=>z.name === os)[0].type){ 
    if(input.split(":").length > 1) {//type= : 
      ports.push({port:input.split(":")[0],panelport:input.split(":")[1],changeport:true})
    } else {
      ports.push({port:input,panelport:input}) 
    }
  }else {mainport = input;}
 }else {
 if(input.split(":").length > 1) {//type= : 
    ports.push({port:input.split(":")[0],panelport:input.split(":")[1],changeport:true})
  } else {
      ports.push({port:x.innerHTML,panelport:x.innerHTML})
  }
}
})

if(document.querySelector("#ports").value.split("-").length > 1) {//type= -
for (var i = Number(document.querySelector("#ports").value.split("-")[0]); i < 
Number(document.querySelector("#ports").value.split("-")[1])+1; i++) {ports.push({port:String(i),panelport:String(i)})}
}
if(!edit && ejs.os.filter((z)=>z.name === os)[0].type && !mainport || edit && ejs.server.os && !mainport)
 return err("You must enter the main port")
try{ejs.os.filter((z)=>z.name === os)[0].disks.map((x)=>disks.push(x))}catch{}
     $diskform.find("div").map((c,x)=>{
      var url,type,size;
var disk = {
name:$("#"+x.id).find( "input[name='name']" ).val(),
resize:$("#"+x.id).find( "input[name='resize']" ).val(),
forcetype:$("#"+x.id).find( "input[name='forcetype']" ).val(),
url:url
}
if(Number(disk.forcetype)) return err("Force type cannot be a number, for example: write in the style (raw,qcow2)")
resizet = disk.resize
if(disk.resize.slice(0,1) != "+" || disk.resize.slice(0,1) != "-") resizet = disk.resize.slice(1)
if(isNaN(Number(resizet))) return err("Please enter a number eg (+100,-100,100)")
if(isNaN(Number($("#"+x.id).find( "input[name='source']" ).val().toLowerCase().split("mb").join("")))){
url = $("#"+x.id).find( "input[name='source']" ).val()
type = "download"
if(!url.startsWith("http")) url = "http://"+$("#"+x.id).find( "input[name='source']" ).val()
}else {
size = $("#"+x.id).find( "input[name='source']" ).val().toLowerCase().split("mb").join("")
type = "create"
}
if(disk.name.split(".").length < 2 || disk.name.length && disk.name.split(".").join("").split(" ").join("").length < 1
) return err("Enter extension eg (.img,.qcow2)")
disks.push({
  name:($("#"+x.id).find( "input[name='name']" ).val()).split(" ").join(""),
  resize:$("#"+x.id).find( "input[name='resize']" ).val(),
  forcetype:$("#"+x.id).find( "input[name='forcetype']" ).val(),
  url:url,
  size:size,
  type:type
})
 })
 try{
 if(ejs.os.filter((z)=>z.name === os)[0].vnc){
  vnc = ejs.gills[ejs.gills.gills.filter((z)=>z.ip === gill)[0].name+"-database"].vnc+1
 }}catch{}
 if(!edit && ejs.gills[ejs.gills.gills.filter((z)=>z.ip === gill)[0].name+"-database"].cpu < Number(cpu)){
   return err("The gill server you have chosen does not have that many cpu")
 }
 if(!edit && ejs.gills[ejs.gills.gills.filter((z)=>z.ip === gill)[0].name+"-database"].ram < Number(ram)){
  return err("The gill server you have chosen does not have that many ram")
 }
 var disktotalsize = 0;
disks.map((x)=>{
 if(x.resize) disktotalsize += Number(x.resize)
 else if(x.size) disktotalsize += Number(x.size)
})

if(ejs.disks) {//Disks
ejs.disks.map((x)=>{
  if(!disks.filter((z)=>z.name === x.name).length){//Delete disk
if(document.querySelector("#diskname-"+x.name.split(".").join("\\.")) && 
document.querySelector("#diskname-"+x.name.split(".").join("\\.")).value){
x.oldname = x.name;x.name = document.querySelector("#diskname-"+x.name.split(".").join("\\.")).value
if(disks.filter((z)=> z.name === x.name).length){
disks.filter((z)=> z.name === x.name)[0].oldname = x.oldname
}}else {disks.push({deletedisk:x.name})}
}})
disks.map((x)=>{if(ejs.disks.filter((z)=>z.name === x.name).length){//Edit disk
var data = ejs.disks.filter((z)=>z.name === x.name)[0],edits = {}
disks = disks.filter((z)=>z.name != x.name)
if(x.oldname) edits.name = x.name,edits.oldname = x.oldname
if(!x.forcetype){edits.name = x.name,edits.forcetype = "deleted"}
else if(data.forcetype != x.forcetype) edits.name = x.name,edits.forcetype = x.forcetype
if(data.size != x.size && !x.url)  edits.name = x.name,edits.size = x.size,edits.url = "deleted",edits.type = "create"
else if(data.url != x.url && !x.size)  edits.name = x.name,edits.url = x.url,edits.size = "deleted",edits.type = "download"
if(!x.resize){edits.name = x.name,edits.resize = "deleted"}
else if(data.resize != x.resize || edits.type) edits.name = x.name,edits.resize = x.resize
if(edits.name) {disks.push({editdisk:x.name,code:edits})}
}else {//New disk
  if(!x.deletedisk && !x.editdisk){
  disks = disks.filter((z)=>z.name != x.name)
  disks.push({newdisk: true,code:x});
}}})
}
if(edit){//Ports
if(ejs.server.ports.mainport == mainport) {mainport = ""}
if(!ejs.server.os && mainport) {
  if(mainport.split(":").length > 1){
   ports.push({port:mainport.split(":")[0],panelport:mainport.split(":")[1],changeport:"true"})
  }else {
    ports.push({port:mainport,panelport:mainport})
  }
  mainport = "deleted"
}
if(ejs.server.ports.mainport && mainport == undefined) {mainport = "deleted"}
if(ejs.ports){
ejs.ports.map((x)=>{
if(ports.filter((z)=>z.panelport === x.panelport && z.port === x.port).length){
ports = ports.filter((z)=>z.panelport != x.panelport && z.port != x.port)}
else {ports.push({deletedport:true,code:x})}})//Delete Port
};var tmpport = ports;ports = [];
tmpport.map((x)=>{//New Port
 if(x.deletedport === true) {ports.push(x)
 }else {ports.push({newport:true,code:x})}
})
}

if(!edit && ejs.gills[ejs.gills.gills.filter((z)=>z.ip === gill)[0].name+"-database"].disk < Number(disktotalsize)){
  return err("The gill server you have chosen does not have that many disk")
}
	 if(!errs && !isNaN(errs)) {	 
     var posting = $.ajax({url:url,type:"POST",data:{
  edit:edit,
  auth:{
    osname:os,
    info:ejs.os.filter((z)=>z.name === os).length && ejs.os.filter((z)=>z.name === os)[0].info,
  },
  code:{
	 owner:owner,
	 id:id,
	 os:ejs.os.filter((z)=>z.name === os).length && ejs.os.filter((z)=>z.name === os)[0].type,
	 ports:{mainport:mainport,vnc:vnc,port:ports},
	 disks:disks,
   ip:gill,
	 cpu:cpu,
	 ram:ram,
   ngrok:ngrok,
   createdtime:Date.now()
  }
	 },dataType:"json",
     success: function( data ) { 
      if(data.url) {setTimeout(()=>location.href=data.url,2000)}
      if(data.color){document.getElementById("status").style.color = data.color}
      if(data.message){document.getElementById("status").innerHTML = data.message}
    }});
	 }
    });
    
//Delete server
$( "#deleteserver" ).click(function() {
  var posting = $.ajax({url:"/api/servers/remove/",type:"POST",data:{
    machine:document.getElementById("editservername").innerHTML
  },dataType:"json",
  success: function( data ) { 
    if(data.url) {setTimeout(()=>location.href=data.url,2000)}
    if(data.color){document.getElementById("status").style.color = data.color}
    if(data.message){document.getElementById("status").innerHTML = data.message}
  }});
})

$( "#diskadd" ).click(function() {
    if(!db.get("disksize")) db.set("disksize",0)
    db.set("disksize",Number(db.get("disksize"))+1)
    $( "#disks" ).append(`
    <div id="disk-${db.get("disksize")}" class="disk">
    <button class='create-send-button' onclick="deletedisk('${db.get("disksize")}')" >❌</button>
    <a>Disk name:</a>
    <input class="input" style="width: 15%;" name="name" type="name" placeholder="Write disk name" required>
    <br><br>
    <a>Source:</a>
    <input class="input" style="width: 25%;" name="source" type="name" placeholder="Link(download) or create Disk(Mb)" required>
    <br><br>
    <a>Resize:</a>
    <input class="input" style="width: 15%;" name="resize" type="name" placeholder="Just enter mb (optional)">
    <br><br>
    <a>Force type:</a>
    <input class="input" style="width: 15%;" name="forcetype" type="name" placeholder="qcow2 (optional)">
    </div><a style="background-color:transparent;" id="disk-br-${db.get("disksize")}"><br><br></a>
    `);
  });

function deletedisk(x){try{
  document.querySelector(`#disk-${x}`).remove()
  document.querySelector(`#disk-br-${x}`).remove()
  db.set("disksize",Number(db.get("disksize"))-1)}catch{}
 }
  
  
function search(x,y,c) {
if(c && ejs.gills[$("#gill").val()+"-database"] && ejs.gills[$("#gill").val()+"-database"].ports){
var name = $("#gill").val()
$("#gill-search").remove()
$("#h3gill").append(`<br><br>
<input class="input" style="width: 50%;border-radius:25px;" name="gill" 
value="${ejs.gills.gills.filter((z)=> z.name === name)[0].ip}" required>
`)
portsupdate(name)
}
  var input, filter, ul, li, a, i;
  input = document.getElementById(x);
  filter = input.value.toUpperCase();
  div = document.getElementById(y);
  a = div.getElementsByTagName("a");
  for (i = 0; i < a.length; i++) {
    txtValue = a[i].textContent || a[i].innerText;
    if (txtValue.toUpperCase().indexOf(filter) > -1) {
      a[i].style.display = "";
    } else {
      a[i].style.display = "none";
    }
  }}

function selectsearch(x,y,c,a,b){
document.getElementById(y).remove()
if(b){
if(ejs.gills[x.innerHTML+"-database"] && ejs.gills[x.innerHTML+"-database"].ports) {
portsupdate(x.innerHTML)
}
$("#"+c).append(`<br><br>
<input class="input" style="width: 30%;border-radius:10px;" name="${a}" value="${b}" required>
`)
}else{	
$("#"+c).append(`<br><br>
<input class="input" style="width: 30%;border-radius:10px;" name="${a}" value="${x.innerHTML}" required>
`)
}
}

function portsupdate(x){
$("#porttext").innerHTML = ""
document.getElementById("ports").style.display = "block"
ejs.gills[x+"-database"].ports.map((x,c)=>{
if(c==0) {
$("#allports").innerHTML = "";
document.querySelector("#portalert").innerText = "The first port you choose is the main port and looks red for your selection\n"+
"If you do x-y it adds ports between and If you do x-y wrong, you may have problems with the ports.";
}
if(x.changeport) {
$("#ports-search").append(`<a onclick="selectport(this)">${x.port}:${x.panelport}</a>`)
} else {
$("#ports-search").append(`<a onclick="selectport(this)">${x.port}</a>`)	
}
})
}

function selectport(x) {
if(!$("#allports").find("a").filter((c,z)=> z.innerHTML === x.innerHTML ).length) {
$("#allports").append(`	
<a class="button-grey" style="float: left;cursor:pointer;" onclick="deleteport(this);">${x.innerHTML}</a>
`)
try{document.querySelector("#allports > a:nth-child(1)").style["background-color"] = "red";}catch{}
}}
function deleteport(x){
x.remove();
try{document.querySelector("#allports > a:nth-child(1)").style["background-color"] = "red";}catch{}
}
