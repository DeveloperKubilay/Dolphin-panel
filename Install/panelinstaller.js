const version = require("../package.json").version
const fs = require('fs');
var Readline = require('readline')
var json = {
"register":{"status": false,"time":86400000},
"owner":{},
"panelinfo":{"version":version,"apikey":(Math.random() + 1).toString(36).substring(2)},
"posttojson":{"limit": "3","parameter": 20000},
"ddosprotect":{"status": false,"limit":30,"time":10000,"removeban":600000},
"socketprotect":{"limit": 9,"time": 10000}
}
process.title = "Dolphin Panel Installer"

async function question(q,s){var temp = "",qn = false;
readline = Readline.createInterface({input: process.stdin,output: process.stdout});
await new Promise((r)=>{ readline.question(q, async c => {
        if(s === true && !c) qn = true
        else if(typeof s === "number" && isNaN(c)) temp = s
        else if(!c) {temp = s}
        else {temp = c}
        readline.close();
        r()
    });})
if(qn) return install()
return temp
}
function ify(s){
if(s == "Y" || s == "y" || s == "yes" || s == "Yes") {return true;}else {return false;}
}

install();async function install(){
json.port = Number(await question("Which port would you like to use recommended(80):",80))
json.gillsocket = Number(await question("Which gillsocket would you like to use recommended(8080):",8080))
json.ip = await question("What is the ip address for example (http://localhost):","http://localhost")
json.sessionsecret = await question("What is your session secret:",(Math.random() + 1).toString(36).substring(2))
json.owner.mail = await question("Email of the owner of the server:",true)
json.owner.password = await question("Password of the owner of the server:",true)
if(ify(await question("Do you want the registration system Y/N recommended(Y):"))){
json.register.status = true;
json.register.time = await question("How long does the limit:",86400000)
}
if(ify(await question("Do you want the Dolphin panel to have its own Ddos protection Y/N recommended(Y):"))){
json.ddosprotect.status = true;
json.ddosprotect.limit = await question("What is the number of limit:",30)
json.ddosprotect.time = await question("How long does the limit:",1000)
json.ddosprotect.removeban = await question("How long does it take to unban:",600000)
}
json.panelinfo.name = await question("Do you want to set panel name:","Dolphin Panel")
fs.writeFileSync("../settings.json",JSON.stringify(json, undefined, 2))
}