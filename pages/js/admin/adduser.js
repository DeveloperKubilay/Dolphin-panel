
$( "#adduserform" ).submit(function( event ) {
    event.preventDefault();
    var $form = $( this ),url = $form.attr( "action" ),
     mail = $form.find( "input[name='mail']" ).val(),
     password = $form.find( "input[name='password']" ).val(),
     username = $form.find( "input[name='username']" ).val()
     var posting = $.ajax({url:url,type:"POST",data:{ password:password,mail:mail,username:username },dataType:"json",
     success: function( data ) { 
      if(data.url) {setTimeout(()=>location.href=data.url,2000)}
      if(data.color){document.getElementById("status").style.color = data.color}
      if(data.message){document.getElementById("status").innerHTML = data.message}
    }});
    });

    $( "#deleteuser" ).click(function() {
      var posting = $.ajax({url:"/api/users/remove/",type:"POST",data:{
        mail:mail
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
  