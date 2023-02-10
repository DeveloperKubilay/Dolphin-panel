var showdb,wait;
function showapi(x){
	if(showdb && !wait) {
	 document.querySelector("#apikey").innerHTML = "Copied Your token: "+x
    document.querySelector("#apikey").style.cursor = "text"	 
     setTimeout(()=>{
	 document.querySelector("#apikey").innerHTML = "If you click again you will copy<br>Your token: "+x
	 document.querySelector("#apikey").style.cursor = "pointer"
	 wait = false;
	 },10000)
	 wait = true;
	 return navigator.clipboard.writeText(x);
	} else {
	if(showdb) return;
	showdb = true;
    document.querySelector("#apikey").innerHTML = "If you click again you will copy<br>Your token: "+x
    document.querySelector("#apikey").style.cursor = "pointer"
	document.querySelector("#apikey").style.color = "#ddd"
	}	
}