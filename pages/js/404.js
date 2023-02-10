var zoom = 0,galaxyw = 700,galaxyh = 500,appends=0;w = 10
function random(x,c){return Math.floor(Math.random()*x)+c}
setInterval(()=>{
if(w < 0) return setTimeout(()=>window.location.href = "/",10000);
appends++;
var myappends = appends;
if(zoom < 1.5) {
zoom = zoom+0.01
$("body").css('transform','scale('+ zoom +')');
}
if(galaxyw != 0) {
galaxyw = galaxyw-1
$("#galaxy").css('width',galaxyw+'px');
}
if(galaxyh != 0) {
galaxyh = galaxyh-0.2
$("#galaxy").css('height',galaxyh+'px');
} 
w = w-0.01
$("body").append(`<a id="h${myappends}" style="position: fixed;
    top: ${random(100,0)}%;
    left: ${random(100,0)}%;
    height: ${random(w,5)}px;
    width: ${random(w,5)}px;
    background-color: #ddd;
    border-radius: ${random(w,40)}%;"
></a>`)
setTimeout(()=>$("#h"+myappends).remove(),5000)
},100)