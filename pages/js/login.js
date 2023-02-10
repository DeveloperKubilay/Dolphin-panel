if(type === "register") document.querySelector("body > div").style.height = "420px"
$( "#loginform" ).submit(function( event ) {
  event.preventDefault();
  $form = $( this ),url = $form.attr( "action" )
  var data = { 
    password:password = $form.find( "input[name='password']" ).val(),
    mail:$form.find( "input[name='mail']" ).val() 
   }
   if(type === "register") { 
    data.username = $form.find( "input[name='username']" ).val()
    url = "/api/register/"
   }
   var posting = $.ajax({url:url,type:"POST",data:data,dataType:"json",
   success: function( data ) {   
    if(data.url) {
      if(type === "register") {setTimeout(()=>location.href=data.url,2000) } 
      else {location.href=data.url}
    }
    if(data.color){document.getElementById("status").style.color = data.color}
    if(data.message){document.getElementById("status").innerHTML = data.message}
  }});
  });