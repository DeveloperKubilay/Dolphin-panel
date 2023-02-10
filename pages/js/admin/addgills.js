var token = Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)

$( "#addgillform" ).submit(function( event ) {
    event.preventDefault();
    document.getElementById("status").innerHTML = ""
    var errs = 0,edit,ports = [];
try{document.querySelector("#deletegill").innerHTML
edit = document.getElementById("editgillsname").innerHTML
}catch{edit = ""}
    function err(err){
      document.getElementById("status").innerHTML = err
      document.getElementById("status").style.color = "red"
      errs += 1;
    }
    var $form = $( this ),url = $form.attr( "action" ),
     name = $form.find( "input[name='name']" ).val(),
     ip = $form.find( "input[name='ip']" ).val(),
     cpu = $form.find( "input[name='cpu']").val(),
     disk = $form.find( "input[name='disk']" ).val(),
     ram = $form.find( "input[name='ram']").val()

if(!name || Number(name)) return err("Please write to name of server or it should not be just numbers")
if(!ip) return err("Please write to ip of the server")
if(!cpu || isNaN(Number(cpu))) return err("Please write to cpu")
if(!disk || isNaN(Number(disk))) return err("Please write to disk")
if(!ram || isNaN(Number(ram))) return err("Please write to ram")

$("#ports").find("a").map((c,x)=>{ 
 var input = x.innerHTML
  if(input.split("-").length > 1) {//type= -
    for (var i = Number(input.split("-")[0]); i < Number(input.split("-")[1])+1; i++) {
      ports.push({port:i,panelport:i})
     }
  }if(input.split(":").length > 1) {//type= : 
    ports.push({port:input.split(":")[0],panelport:input.split(":")[1],changeport:true})
  } else {//else: x
    if(input.split("-").length > 1) { } else {
      ports.push({port:x.innerHTML,panelport:x.innerHTML})
    } 
  }
})
if(!ports.length) return err("Please write the ports")

     if(!errs && !isNaN(errs)) {
     var posting = $.ajax({url:url,type:"POST",data:{
      edit:edit,  
      gill:{
        "name": name,
        "disk": disk,
        "cpu": cpu,
        "ram": ram,
        "ports": ports,
        "ip": ip,
        "token": token
      }
    },dataType:"json",
     success: function( data ) { 
      if(data.url) {setTimeout(()=>location.href=data.url,2000)}
      if(data.color){document.getElementById("status").style.color = data.color}
      if(data.message){document.getElementById("status").innerHTML = data.message}
    }});
  }
    });


$("#portbutton").click(function(){
  var input = $("#portinput").val()
  if(!input) return;
  $("#ports").append(`
  <a class="button-blue" onclick="this.remove()" style="float: left;">${input}</a>
  `)
  document.querySelector("#portinput").value = ""
})

var showdb,wait;
    document.querySelector("#tokentext").innerHTML = token
function tokenclick(){
	if(showdb && !wait) {
	 document.querySelector("#tokentext").innerHTML = "Copied Your token: "+token
    document.querySelector("#tokentext").style.cursor = "text"	 
     setTimeout(()=>{
	 document.querySelector("#tokentext").innerHTML = "If you click again you will copy<br>Your token: "+token
	 document.querySelector("#tokentext").style.cursor = "pointer"
	 wait = false;
	 },10000)
	 wait = true;
	 return navigator.clipboard.writeText(token);
	} else {
	if(showdb) return;
	showdb = true;
    document.querySelector("#tokentext").innerHTML = "If you click again you will copy<br>Your token: "+token
    document.querySelector("#tokentext").style.cursor = "pointer"
	document.querySelector("#tokentext").style.color = "#ddd"
	}	
}

$( "#deletegill" ).click(function() {
  var posting = $.ajax({url:"/api/gills/remove/",type:"POST",data:{
    name:document.getElementById("editgillsname").innerHTML
  },dataType:"json",
  success: function( data ) { 
    if(data.url) {setTimeout(()=>location.href=data.url,2000)}
    if(data.color){document.getElementById("status").style.color = data.color}
    if(data.message){document.getElementById("status").innerHTML = data.message}
    if(data.servers){
      $("#deleteservers").empty()
      $("#deleteservers").append(`<h3>Servers</h3>`)
      data.servers.map((x)=>{
      $("#deleteservers").append(`
      <a href="/admin/editservers/${x}" class="transparent" style="color:lightblue">${x}</a><br>
      `)
    })
    window.scrollTo(0,document.body.scrollHeight);
    }
  }});
})