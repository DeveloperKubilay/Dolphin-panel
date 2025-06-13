var cpuchart = [0.005, 0.001, 0.002, 0.003, 0.004];
var ramchart = [0.005, 0.001, 0.002, 0.003, 0.004];
var systemsinfo = {osname: "Loading...", user: "Loading...", password: "Loading..."};
var timeoutdb, startdb = true, shutdowndb = false, resetbuttondb = false, resetdb, rebootdb, passworddb, ngrokurl;
var machineStatus = 'offline';
var chartUpdateTimer = null;

function isLinuxOS(osName) {
  if (!osName) return false;
  const lowerOsName = osName.toLowerCase();
  return lowerOsName.includes('linux') || 
         lowerOsName.includes('ubuntu') || 
         lowerOsName.includes('debian') || 
         lowerOsName.includes('centos') || 
         lowerOsName.includes('fedora') ||
         lowerOsName.includes('unix');
}

function getConnectionType() {
  return isLinuxOS(systemsinfo.osname) ? "SSH" : "RDP";
}

var socket = io(("ws://" + ejs.socket).replace("http://", "").replace("https://", ""), {auth: auth, transports: ['websocket']});

socket.on("connect", function() {
  console.log("Socket bağlantısı başarılı");
});

socket.on("disconnect", function() {
  console.log("Socket bağlantısı kesildi");
  setSystemStatus('offline');
  setButtonStates(true, false, false);
  if (chartUpdateTimer) {
    clearInterval(chartUpdateTimer);
    chartUpdateTimer = null;
  }
});

socket.on("connect_error", (err) => {
  console.log(`Unable to connect to server error code: ${err.message}`);
  setSystemStatus('offline');
  setButtonStates(true, false, false);
});

socket.on('panelusers', function(msg) {
  console.log("Sunucudan gelen veri:", msg);
  
  if (msg.closegill && ejs.gill === msg.closegill) {
    console.log("Gill kapatıldı:", msg.closegill);
    setSystemStatus('offline');
    setButtonStates(true, false, false);
    document.getElementById("systemstatus").innerHTML = `
      <div class="info-label">Status</div>
      <div class="info-value">Offline Gill</div>`;
    return;
  }
  
  if (msg.kicked) {
    console.log("Kullanıcı atıldı");
    return window.location = '/panel';
  }
  
  if (!msg.machine || msg.machine != ejs.machineid) {
    console.log("Eşleşmeyen makine ID'si", msg.machine, ejs.machineid);
    return;
  }
  
  if (msg.install && msg.install.process) {
    document.getElementById("systemstatus").innerHTML = `
      <div class="info-label">Installing</div>
      <div class="info-value">${msg.install.process}%</div>`;
    
    setSystemStatus('installing');
    setButtonStates(false, false, false);
    return;
  }
  
  if (msg.nowrunning === true || (msg.info && msg.info.running === true)) {
    console.log("Makine çalışıyor sinyali alındı");
    document.getElementById("systemstatus").innerHTML = `
      <div class="info-label">Status</div>
      <div class="info-value">Running</div>`;
    
    setSystemStatus('online');
    setButtonStates(false, true, true);
    
    if (!chartUpdateTimer) {
      chartUpdateTimer = setInterval(function() {
        updateCpuChart();
        updateRamChart();
      }, 5000);
    }
  } 
  
  else if (msg.notrunning === true || (msg.info && msg.info.running === false)) {
    console.log("Makine durdu sinyali alındı");
    document.getElementById("systemstatus").innerHTML = `
      <div class="info-label">Status</div>
      <div class="info-value">Offline</div>`;
      
    setSystemStatus('offline');
    setButtonStates(true, false, false);
    
    if (chartUpdateTimer) {
      clearInterval(chartUpdateTimer);
      chartUpdateTimer = null;
    }
  }
  
  if (msg.status && msg.status.memory !== undefined) {
    console.log("Makine detaylı durum bilgisi alındı:", msg.status);
    
    const cpuValue = Math.max(0, Math.round(msg.status.cpu || 0));
    const ramValue = Math.max(0, Math.round(((msg.status.memory || 0) / 1024) / 1024));
    
    setchart("cpu", cpuValue);
    setchart("ram", ramValue);
    
    updateCpuChart();
    updateRamChart();
    
    try {
      const uptime = moment(Date.now() - msg.status.elapsed).fromNow();
      document.getElementById("systemstatus").innerHTML = `
        <div class="info-label">Uptime</div>
        <div class="info-value">${uptime}</div>`;
    } catch (e) {
      console.error("Uptime calculation error:", e);
      document.getElementById("systemstatus").innerHTML = `
        <div class="info-label">Status</div>
        <div class="info-value">Running</div>`;
    }
    
    setSystemStatus('online');
    setButtonStates(false, true, true);
  }
  
  if (msg.info && Array.isArray(msg.info.storage)) {
    console.log("Disk bilgileri güncelleniyor:", msg.info.storage);
    updateDiskInfo(msg.info.storage);
  }
  
  if (msg.auth && msg.auth.info && msg.auth.info.password) {
    console.log("Kimlik bilgileri güncellendi");
    systemsinfo = {
      osname: msg.auth.osname || systemsinfo.osname,
      user: msg.auth.info.username || systemsinfo.user,
      password: msg.auth.info.password || systemsinfo.password
    };
    
    document.getElementById("systemsos").textContent = systemsinfo.osname;
    document.getElementById("systemsuser").textContent = systemsinfo.user;
    
    if (passworddb) {
      document.getElementById("systemspassword").textContent = systemsinfo.password;
    }
  }
  
  if (msg.info && msg.info.ngrok) {
    console.log("Ngrok bilgisi güncellendi:", msg.info.ngrok);
    ngrokurl = msg.info.ngrok;
    document.getElementById("btnNgrok").textContent = "Ngrok: " + msg.info.ngrok;
  }
  
  if (msg.erorr) {
    console.error("Makine hatası alındı");
    document.getElementById("systemstatus").innerHTML = `
      <div class="info-label">Status</div>
      <div class="info-value">Error</div>`;
      
    setSystemStatus('error');
    setButtonStates(true, false, false);
  }
  
  if (msg.newauth) {
    console.log("Yeni kimlik bilgileri alındı");
    systemsinfo.osname = msg.newauth.osname || systemsinfo.osname;
    systemsinfo.user = msg.newauth.info.username || systemsinfo.user;
    systemsinfo.password = msg.newauth.info.password || systemsinfo.password;
    
    document.getElementById("systemsos").textContent = systemsinfo.osname;
    document.getElementById("systemsuser").textContent = systemsinfo.user;
    
    if (passworddb) {
      document.getElementById("systemspassword").textContent = systemsinfo.password;
    }
    
    const rdpButton = document.getElementById("btnRdp");
    if (rdpButton) {
      const connectionType = getConnectionType();
      const port = rdpButton.textContent.split(":")[1].trim() + ":" + rdpButton.textContent.split(":")[2].trim();
      rdpButton.textContent = `${connectionType}: ${port}`;
    }
  }
  
  if (msg.newvnc) {
    console.log("VNC portu güncellendi:", msg.newvnc);
    var newvncip = String(5900 + Number(msg.newvnc));
    
    if (!document.getElementById("btnVnc")) {
      const vncButton = document.createElement('button');
      vncButton.id = "btnVnc";
      vncButton.className = "connection-btn btn-vnc";
      vncButton.onclick = function() { copy(ejs.gill + ':' + newvncip, 'VNC'); };
      vncButton.textContent = "VNC: " + ejs.gill + ":" + newvncip;
      
      document.getElementById("connections").insertBefore(vncButton, document.getElementById("connections").firstChild);
    } else {
      document.getElementById("btnVnc").textContent = "VNC: " + ejs.gill + ":" + newvncip;
    }
  }
  
  if (msg.newmainport) {
    console.log("Ana port güncellendi:", msg.newmainport);
    if (msg.newmainport.split(':').length > 1) {
      msg.newmainport = msg.newmainport.split(':')[1];
    }
    
    const connectionType = getConnectionType();
    
    if (!document.getElementById("btnRdp")) {
      const rdpButton = document.createElement('button');
      rdpButton.id = "btnRdp";
      rdpButton.className = "connection-btn btn-rdp";
      rdpButton.onclick = function() { copy(ejs.gill + ':' + msg.newmainport, connectionType); };
      rdpButton.textContent = `${connectionType}: ${ejs.gill}:${msg.newmainport}`;
      
      document.getElementById("connections").insertBefore(rdpButton, document.getElementById("connections").firstChild);
    } else {
      document.getElementById("btnRdp").textContent = `${connectionType}: ${ejs.gill}:${msg.newmainport}`;
    }
  }
  
  if (msg.newauth && msg.newmainport === "" && document.getElementById("btnRdp")) {
    document.getElementById("btnRdp").remove();
  }
  
  if (msg.newauth && msg.newvnc === "" && document.getElementById("btnVnc")) {
    document.getElementById("btnVnc").remove();
  }
  
  if (msg.deletedserver) {
    console.log("Sunucu silindi, ana panele yönlendiriliyor");
    window.location = '/panel';
  }
});

document.getElementById("systemsos").textContent = systemsinfo.osname;
document.getElementById("systemsuser").textContent = systemsinfo.user;
setButtonStates(true, false, false);

setTimeout(function() {
  console.log("İlk durum sorgusu gönderiliyor");
  socket.emit("panelservers", { action: "status" });
}, 1000);

setInterval(function() {
  if (machineStatus === 'online') {
    console.log("Otomatik durum sorgusu gönderiliyor");
    socket.emit("panelservers", { action: "status" });
  }
}, 15000);

function setSystemStatus(status) {
  const statusElement = document.getElementById("systemstatus");
  
  machineStatus = status;
  
  statusElement.classList.remove('status-offline', 'status-online', 'status-error', 'status-installing');
  
  switch (status) {
    case 'online':
      statusElement.classList.add('status-online');
      break;
    case 'error':
      statusElement.classList.add('status-error');
      break;
    case 'installing':
      statusElement.classList.add('status-installing');
      break;
    case 'offline':
    default:
      statusElement.classList.add('status-offline');
      break;
  }
  console.log("Sistem durumu güncellendi:", status);
}

function setButtonStates(startEnabled, shutdownEnabled, resetEnabled) {
  const startButton = document.getElementById("startButton");
  const shutdownButton = document.getElementById("shutdownButton");
  const resetButton = document.getElementById("resetButton");
  
  startButton.classList.toggle('btn-disabled', !startEnabled);
  startButton.style.cursor = startEnabled ? "pointer" : "not-allowed";
  startdb = startEnabled;
  
  shutdownButton.classList.toggle('btn-disabled', !shutdownEnabled);
  shutdownButton.style.cursor = shutdownEnabled ? "pointer" : "not-allowed";
  shutdowndb = shutdownEnabled;
  
  resetButton.classList.toggle('btn-disabled', !resetEnabled);
  resetButton.style.cursor = resetEnabled ? "pointer" : "not-allowed";
  resetbuttondb = resetEnabled;
  
  console.log("Buton durumları güncellendi:", {start: startEnabled, shutdown: shutdownEnabled, reset: resetEnabled});
}

function updateCpuChart() {
  if (cpuchart.length) {
    document.getElementById("cputext").textContent = "CPU Usage: " + cpuchart[cpuchart.length-1] + "%";
    
    new Chart("cpu-chart", {
      type: "line",
      data: {
        labels: Array(cpuchart.length).fill(''),
        datasets: [{
          backgroundColor: "rgba(255, 213, 79, 0.2)",
          borderColor: "#ffd54f",
          borderWidth: 2,
          data: cpuchart,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        legend: { display: false },
        animation: { duration: 500 },
        elements: { point: { radius: 0 }},
        scales: {
          yAxes: [{
            ticks: {
              fontColor: "rgba(233, 233, 233, 0.7)",
              beginAtZero: true,
              max: Math.max(100, ...cpuchart)
            },
            gridLines: {
              color: "rgba(233, 233, 233, 0.1)",
              zeroLineColor: "rgba(233, 233, 233, 0.25)"
            }
          }],
          xAxes: [{
            ticks: { display: false },
            gridLines: { display: false }
          }]
        }
      }
    });
  }
}

function updateRamChart() {
  if (ramchart.length) {
    document.getElementById("ramtext").textContent = "Memory Usage: " + ramchart[ramchart.length-1] + " MB";
    
    new Chart("ram-chart", {
      type: "line",
      data: {
        labels: Array(ramchart.length).fill(''),
        datasets: [{
          backgroundColor: "rgba(41, 182, 246, 0.2)",
          borderColor: "#29b6f6",
          borderWidth: 2,
          data: ramchart,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        legend: { display: false },
        animation: { duration: 500 },
        elements: { point: { radius: 0 }},
        scales: {
          yAxes: [{
            ticks: {
              fontColor: "rgba(233, 233, 233, 0.7)",
              beginAtZero: true,
              max: Math.max(Math.max(...ramchart) * 1.2, 1)
            },
            gridLines: {
              color: "rgba(233, 233, 233, 0.1)",
              zeroLineColor: "rgba(233, 233, 233, 0.25)"
            }
          }],
          xAxes: [{
            ticks: { display: false },
            gridLines: { display: false }
          }]
        }
      }
    });
  }
}

function updateDiskInfo(storage) {
  if (!Array.isArray(storage) || storage.length === 0) {
    console.warn("Geçersiz disk bilgisi alındı:", storage);
    return;
  }

  const disksContainer = document.getElementById("disks");
  
  const existingDiskIds = Array.from(disksContainer.children).map(el => el.id);
  const updatedDiskIds = [];
  
  storage.forEach(disk => {
    if (!disk || !disk.name) {
      console.warn("Geçersiz disk verisi:", disk);
      return;
    }
    
    const diskId = `${disk.name}-disk`;
    updatedDiskIds.push(diskId);
    
    if (!document.getElementById(diskId)) {
      createDiskElement(disk);
    }
    
    updateDiskElement(disk);
  });
  
  existingDiskIds.forEach(id => {
    if (!updatedDiskIds.includes(id)) {
      const diskElement = document.getElementById(id);
      if (diskElement) {
        diskElement.remove();
      }
    }
  });
}

function createDiskElement(disk) {
  const disksContainer = document.getElementById("disks");
  const diskElement = document.createElement('div');
  
  diskElement.id = `${disk.name}-disk`;
  diskElement.className = 'disk';
  diskElement.innerHTML = `
    <div class="disk-header">
      <span class="disk-name" id="${disk.name}-name">${disk.name}</span>
      <span class="disk-size" id="${disk.name}-size">Loading...</span>
    </div>
    <div class="progress-bar">
      <div id="${disk.name}-progress" class="progress-fill progress-low" style="width: 0%"></div>
    </div>
    <div id="${disk.name}-progress-text" class="progress-text">0%</div>
  `;
  
  disksContainer.appendChild(diskElement);
}

function updateDiskElement(disk) {
  if (!disk || !disk.name || typeof disk.size === 'undefined') {
    console.warn("Disk güncellenemedi, geçersiz veri:", disk);
    return;
  }

  var extension = "KB";
  var diskSize = parseFloat(disk.size) || 0;
  var totalSize = 0;
  
  const diskFilter = ejs.disks.filter(z => z.name === disk.name);
  
  if (diskFilter.length) {
    totalSize = parseFloat(diskFilter[0].resize) || parseFloat(diskFilter[0].size) || 0;
    
    if ((diskSize / 1024) >= 1024 || totalSize >= 1024) {
      diskSize = ((diskSize / 1024) / 1024).toFixed(1);
      totalSize = (totalSize / 1024).toFixed(1);
      extension = "GB";
    } else if (diskSize >= 1024 || totalSize >= 1) {
      diskSize = (diskSize / 1024).toFixed(1);
      extension = "MB";
    } else {
      diskSize = diskSize.toFixed(1);
    }
    
    try {
      const diskNameElement = document.getElementById(`${disk.name}-name`);
      if (diskNameElement) {
        diskNameElement.textContent = disk.name;
      }
      
      const diskSizeElement = document.getElementById(`${disk.name}-size`);
      if (diskSizeElement) {
        diskSizeElement.textContent = `${diskSize} ${extension} / ${totalSize} ${extension}`;
      }
      
      const percentage = Math.min(Math.max(((diskSize / totalSize) * 100).toFixed(0), 0), 100);
      const progressElement = document.getElementById(`${disk.name}-progress`);
      const progressTextElement = document.getElementById(`${disk.name}-progress-text`);
      
      if (progressElement && progressTextElement) {
        progressElement.style.width = `${percentage}%`;
        progressTextElement.textContent = `${percentage}%`;
        
        progressElement.classList.remove('progress-low', 'progress-medium', 'progress-high');
        
        if (percentage >= 90) {
          progressElement.classList.add('progress-high');
        } else if (percentage >= 70) {
          progressElement.classList.add('progress-medium');
        } else {
          progressElement.classList.add('progress-low');
        }
      }
    } catch (e) {
      console.error("Disk güncelleme hatası:", e);
    }
  } else {
    if ((diskSize / 1024) >= 1024) {
      diskSize = ((diskSize / 1024) / 1024).toFixed(1);
      extension = "GB";
    } else if (diskSize >= 1024) {
      diskSize = (diskSize / 1024).toFixed(1);
      extension = "MB";
    } else {
      diskSize = diskSize.toFixed(1);
    }
    
    const diskSizeElement = document.getElementById(`${disk.name}-size`);
    if (diskSizeElement) {
      diskSizeElement.textContent = `${diskSize} ${extension}`;
    }
  }
}

function copyusername() {
  copy(systemsinfo.user, "Username");
}

function copyngrok() {
  if (ngrokurl) {
    copy(ngrokurl, "Ngrok");
  }
}

function openpassword() {
  if (!passworddb) {
    document.getElementById("systemspassword").textContent = systemsinfo.password;
    document.getElementById("systemspassword").style.color = "#e9e9e9";
    passworddb = true;
  }
  
  navigator.clipboard.writeText(systemsinfo.password);
  showAlert("Password copied");
}

function copy(text, type) {
  navigator.clipboard.writeText(text);
  showAlert(`${type} copied`);
}

function showAlert(message, isError = false) {
  const alertBox = document.getElementById("alertBox");
  alertBox.textContent = message;
  alertBox.classList.toggle("alert-error", isError);
  alertBox.classList.add("show");
  
  setTimeout(() => {
    alertBox.classList.remove("show");
  }, 5000);
}

function reboot() {
  if (timeoutdb) {
    showAlert("İşleminiz hala devam ediyor, lütfen bekleyin");
    return;
  }
  
  if (!resetdb) {
    showAlert("Are you sure you want to reinstall the system? Click again if you are sure.");
    resetdb = true;
    
    setTimeout(() => {
      if (resetdb) {
        resetdb = false;
        console.log("Onay süresi doldu");
      }
    }, 10000);
  } else {
    resetdb = false;
    timeoutdb = true;
    console.log("Sistemi yeniden başlatma isteği gönderiliyor");
    socket.emit("panelservers", { action: "installos" });
    showAlert("Please wait reinstalling");
    setTimeout(() => timeoutdb = false, 10000);
  }
}

function setup() {
  if (timeoutdb) {
    showAlert("İşleminiz hala devam ediyor, lütfen bekleyin");
    return;
  }
  
  const selectedOS = document.getElementById("osSelect").value;
  
  if (rebootdb != selectedOS) {
    showAlert(`Are you sure you want to install ${selectedOS}? Click again if you are sure.`);
    rebootdb = selectedOS;
    
    setTimeout(() => {
      if (rebootdb === selectedOS) {
        rebootdb = "";
        console.log("OS kurulum onay süresi doldu");
      }
    }, 10000);
  } else {
    rebootdb = "";
    timeoutdb = true;
    console.log(`${selectedOS} kurulum isteği gönderiliyor`);
    socket.emit("panelservers", { action: "installos", changeos: selectedOS });
    showAlert(`Please wait installing ${selectedOS}`);
    setTimeout(() => timeoutdb = false, 10000);
  }
}

function start() {
  if (!startdb || timeoutdb) {
    if (!startdb) showAlert("Makine zaten çalışıyor");
    if (timeoutdb) showAlert("İşleminiz hala devam ediyor, lütfen bekleyin");
    return;
  }
  
  timeoutdb = true;
  console.log("Makine başlatma isteği gönderiliyor");
  socket.emit("panelservers", { action: "start" });
  showAlert("Starting, You must wait 10 seconds to process again");
  setTimeout(() => timeoutdb = false, 10000);
}

function shutdown() {
  if (!shutdowndb || timeoutdb) {
    if (!shutdowndb) showAlert("Makine zaten kapalı");
    if (timeoutdb) showAlert("İşleminiz hala devam ediyor, lütfen bekleyin");
    return;
  }
  
  timeoutdb = true;
  console.log("Makine kapatma isteği gönderiliyor");
  socket.emit("panelservers", { action: "shutdown" });
  showAlert("Shutting down, You must wait 10 seconds to process again");
  setTimeout(() => timeoutdb = false, 10000);
}

function reset() {
  if (!resetbuttondb || timeoutdb) {
    if (!resetbuttondb) showAlert("Makine çalışmıyor, önce başlatın");
    if (timeoutdb) showAlert("İşleminiz hala devam ediyor, lütfen bekleyin");
    return;
  }
  
  timeoutdb = true;
  console.log("Makine sıfırlama isteği gönderiliyor");
  socket.emit("panelservers", { action: "reset" });
  showAlert("Resetting, You must wait 10 seconds to process again");
  setTimeout(() => timeoutdb = false, 10000);
}

function setchart(type, value) {
  if (isNaN(Number(value))) return;
  
  value = Math.max(0, Number(value));
  
  if (type === "cpu") {
    cpuchart = [cpuchart[1], cpuchart[2], cpuchart[3], cpuchart[4], value];
  }
  
  if (type === "ram") {
    ramchart = [ramchart[1], ramchart[2], ramchart[3], ramchart[4], value];
  }
}

updateCpuChart();
updateRamChart();

window.addEventListener('load', function() {
  if (ejs.disks && Array.isArray(ejs.disks)) {
    console.log("Başlangıç disk bilgileri yükleniyor", ejs.disks);
    ejs.disks.forEach(disk => {
      if (disk && disk.name) {
        createDiskElement(disk);
      }
    });
  }
});