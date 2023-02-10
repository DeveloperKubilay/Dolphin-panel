
$( "#diskadd" ).click(function() {
    if(!addosdb.get("disksize")) addosdb.set("disksize",0)
    addosdb.set("disksize",Number(addosdb.get("disksize"))+1)
    var maindisk = "";
    if(addosdb.get("disksize") === 1) maindisk = "This is the main disk<br><br>"
    $( "#disks" ).append(`
    <div id="disk-${addosdb.get("disksize")}" class="disk">
    <button class='create-send-button' onclick="deletedisk('${addosdb.get("disksize")}')" >❌</button>
    ${maindisk}
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
    </div><a style="background-color:transparent;" id="disk-br-${addosdb.get("disksize")}"><br><br></a>
    `);
  });

function deletedisk(x){try{
  document.querySelector(`#disk-${x}`).remove()
  document.querySelector(`#disk-br-${x}`).remove()
  addosdb.set("disksize",Number(addosdb.get("disksize"))-1)}catch{}
  if("disk-"+x === "disk-1") {
    var divs = "";
    $( "#disks" ).find("div")[0].querySelector("button").remove()
    var text = `<button class='create-send-button' onclick="deletedisk('1')" >❌</button>This is the main disk<br><br>`
    document.querySelector(`#disk-br-${$( "#disks" ).find("div")[0].id.slice($( "#disks" ).find("div")[0].id.length-1)}`).remove()
    $( "#disks" ).find("div")[0].innerHTML = text+$( "#disks" ).find("div")[0].innerHTML
    }
    $( "#disks" ).find("div")[0].id = "disk-1"
  }

$( "#addosform" ).submit(function( event ) {
    event.preventDefault();
    document.getElementById("status").innerHTML = ""
    var disks = [],maindisk = true,resizet,errs = 0,edit;
    try{edit = document.querySelector("#deleteos").innerHTML}catch{edit = ""}
    function err(err){
      document.getElementById("status").innerHTML = err
      document.getElementById("status").style.color = "red"
      errs += 1;
    }
    var $form = $( this )
    var $diskform = $( "#disks" ),url = $form.attr( "action" ),
     osname = $form.find( "input[name='osname']" ).val(),
     description = $form.find( "input[name='description']" ).val(),
	 username = $form.find( "input[name='info-username']" ).val(),
	 password = $form.find( "input[name='info-password']" ).val(),
	 vnc = document.querySelector("input.checkbox").checked,
     ostype = $form.find( "select[name='ostype']" ).val()
	 if(!vnc || vnc === "false") vnc = "";
	 if(!vnc && !ostype) return err("Choose Os or use Vnc")
     if($diskform.find("div").length < 1) return err("You must add disk")
     $diskform.find("div").map((c,x)=>{
      if(c > 0) maindisk = "";
      var url,type,size;
var disk = {
main:maindisk,
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
  main:maindisk,
  name:($("#"+x.id).find( "input[name='name']" ).val()).split(" ").join(""),
  resize:$("#"+x.id).find( "input[name='resize']" ).val(),
  forcetype:$("#"+x.id).find( "input[name='forcetype']" ).val(),
  url:url,
  size:size,
  type:type
})
     })
     if(!errs && !isNaN(errs)) {
     var posting = $.ajax({url:url,type:"POST",data:{
      edit:edit,  
      os:{
        name:osname,
        description:description,
		    vnc:vnc,
        type:ostype,
		    info:{
		     username:username,
		     password:password
		    },
        disks:disks
      }
    },dataType:"json",
     success: function( data ) { 
      if(data.url) {setTimeout(()=>location.href=data.url,2000)}
      if(data.color){document.getElementById("status").style.color = data.color}
      if(data.message){document.getElementById("status").innerHTML = data.message}
    }});
  }
    });