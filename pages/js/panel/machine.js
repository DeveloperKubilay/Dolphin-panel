var cpuchart = [0.005, 0.001, 0.002, 0.003, 0.004];
var ramchart = [0.005, 0.001, 0.002, 0.003, 0.004];
var systemsinfo = {osname: "Loading...", user: "Loading...", password: "Loading..."};
var timeoutdb, startdb = true, shutdowndb = false, resetbuttondb = false, resetdb, rebootdb, passworddb, ngrokurl;

// Initialize socket connection
var socket = io(("ws://" + ejs.socket).replace("http://", "").replace("https://", ""), {auth: auth, transports: ['websocket']});

socket.on("connect_error", (err) => console.log(`Unable to connect to server error code: ${err.message}`));

socket.on('panelusers', function(msg) {
  // Handle Gill closure
  if (msg.closegill && ejs.gill === msg.closegill) {
    setSystemStatus('offline');
    setButtonStates(true, false, false);
    document.getElementById("systemstatus").innerHTML = `
      <div class="info-label">Status</div>
      <div class="info-value">Offline Gill</div>`;
  }
  
  // Handle user kicked
  if (msg.kicked) return window.location = '/panel';
  
  // Verify machine
  if (!msg.machine || msg.machine != ejs.machineid) return;
  
  // Handle installation process
  if (msg.install && msg.install.process) {
    try {
      const timeRemaining = moment().add(Number(msg.install.time), 'second').fromNow();
      document.getElementById("systemstatus").innerHTML = `
        <div class="info-label">Installing</div>
        <div class="info-value">${msg.install.process}% ${timeRemaining}</div>`;
    } catch {
      document.getElementById("systemstatus").innerHTML = `
        <div class="info-label">Installing</div>
        <div class="info-value">${msg.install.process}%</div>`;
    }
    
    setSystemStatus('installing');
    setButtonStates(false, false, false);
  }
  
  // Handle machine running notification
  if (msg.nowrunning) {
    document.getElementById("systemstatus").innerHTML = `
      <div class="info-label">Status</div>
      <div class="info-value">Running</div>`;
    
    setSystemStatus('online');
    setButtonStates(false, true, true);
  }
  
  // Handle status updates with memory info
  if (msg.status && msg.status.memory) {
    setchart("cpu", Math.round(msg.status.cpu));
    setchart("ram", Math.round((msg.status.memory/1024)/1024));
    
    try {
      const uptime = moment(Date.now() - msg.status.elapsed).fromNow();
      document.getElementById("systemstatus").innerHTML = `
        <div class="info-label">Uptime</div>
        <div class="info-value">${uptime}</div>`;
    } catch {
      document.getElementById("systemstatus").innerHTML = `
        <div class="info-label">Status</div>
        <div class="info-value">Running</div>`;
    }
    
    setSystemStatus('online');
    setButtonStates(false, true, true);
    
    // Update charts
    updateCpuChart();
    updateRamChart();
    
    // Update disk information
    if (msg.info && msg.info.storage) {
      updateDiskInfo(msg.info.storage);
    }
  }
  
  // Handle authentication info updates
  if (msg.auth && msg.auth.info.password) {
    systemsinfo = {
      osname: msg.auth.osname,
      user: msg.auth.info.username,
      password: msg.auth.info.password
    };
    
    document.getElementById("systemsos").textContent = systemsinfo.osname;
    document.getElementById("systemsuser").textContent = systemsinfo.user;
    
    if (passworddb) {
      document.getElementById("systemspassword").textContent = systemsinfo.password;
    }
  }
  
  // Handle Ngrok info
  if (msg.info && msg.info.ngrok) {
    ngrokurl = msg.info.ngrok;
    document.getElementById("btnNgrok").textContent = "Ngrok: " + msg.info.ngrok;
  }
  
  // Handle machine not running
  if (msg.notrunning) {
    document.getElementById("systemstatus").innerHTML = `
      <div class="info-label">Status</div>
      <div class="info-value">Offline</div>`;
      
    setSystemStatus('offline');
    setButtonStates(true, false, false);
  }
  
  // Handle machine status "running=false"
  if (msg.info && msg.info.running === false) {
    document.getElementById("systemstatus").innerHTML = `
      <div class="info-label">Status</div>
      <div class="info-value">Connecting...</div>`;
      
    setSystemStatus('offline');
  }
  
  // Handle errors
  if (msg.erorr) {
    document.getElementById("systemstatus").innerHTML = `
      <div class="info-label">Status</div>
      <div class="info-value">Error</div>`;
      
    setSystemStatus('error');
    setButtonStates(true, false, false);
  }
  
  // Handle auth updates
  if (msg.newauth) {
    systemsinfo.osname = msg.newauth.osname;
    systemsinfo.user = msg.newauth.info.username;
    systemsinfo.password = msg.newauth.info.password;
    
    document.getElementById("systemsos").textContent = systemsinfo.osname;
    document.getElementById("systemsuser").textContent = systemsinfo.user;
    
    if (passworddb) {
      document.getElementById("systemspassword").textContent = systemsinfo.password;
    }
  }
  
  // Handle VNC port updates
  if (msg.newvnc) {
    var newvncip = String(5900 + Number(msg.newvnc));
    
    if (!document.getElementById("btnVnc")) {
      const vncButton = document.createElement('button');
      vncButton.id = "btnVnc";
      vncButton.className = "connection-btn btn-vnc";
      vncButton.onclick = function() { copy(ejs.gill + ':' + newvncip, 'VNC'); };
      vncButton.textContent = "VNC: " + ejs.gill + ":" + newvncip;
      
      document.getElementById("connections").appendChild(vncButton);
    } else {
      document.getElementById("btnVnc").textContent = "VNC: " + ejs.gill + ":" + newvncip;
    }
  }
  
  // Handle main port updates
  if (msg.newmainport) {
    if (msg.newmainport.split(':').length > 1) {
      msg.newmainport = msg.newmainport.split(':')[1];
    }
    
    if (!document.getElementById("btnRdp")) {
      const rdpButton = document.createElement('button');
      rdpButton.id = "btnRdp";
      rdpButton.className = "connection-btn btn-rdp";
      rdpButton.onclick = function() { copy(ejs.gill + ':' + msg.newmainport, 'RDP'); };
      rdpButton.textContent = "RDP: " + ejs.gill + ":" + msg.newmainport;
      
      document.getElementById("connections").appendChild(rdpButton);
    } else {
      document.getElementById("btnRdp").textContent = "RDP: " + ejs.gill + ":" + msg.newmainport;
    }
  }
  
  // Handle removed connections
  if (msg.newauth && !msg.newmainport && document.getElementById("btnRdp")) {
    document.getElementById("btnRdp").remove();
  }
  
  if (msg.newauth && !msg.newvnc && document.getElementById("btnVnc")) {
    document.getElementById("btnVnc").remove();
  }
  
  // Handle server deletion
  if (msg.deletedserver) window.location = '/panel';
});

// Initialize system status
document.getElementById("systemsos").textContent = systemsinfo.osname;
document.getElementById("systemsuser").textContent = systemsinfo.user;
setButtonStates(true, false, false);

// Helper functions
function setSystemStatus(status) {
  const statusElement = document.getElementById("systemstatus");
  
  // Remove all status classes
  statusElement.classList.remove('status-offline', 'status-online', 'status-error', 'status-installing');
  
  // Add appropriate class
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
}

function setButtonStates(startEnabled, shutdownEnabled, resetEnabled) {
  const startButton = document.getElementById("startButton");
  const shutdownButton = document.getElementById("shutdownButton");
  const resetButton = document.getElementById("resetButton");
  
  // Update start button
  startButton.classList.toggle('btn-disabled', !startEnabled);
  startButton.style.cursor = startEnabled ? "pointer" : "not-allowed";
  startdb = startEnabled;
  
  // Update shutdown button
  shutdownButton.classList.toggle('btn-disabled', !shutdownEnabled);
  shutdownButton.style.cursor = shutdownEnabled ? "pointer" : "not-allowed";
  shutdowndb = shutdownEnabled;
  
  // Update reset button
  resetButton.classList.toggle('btn-disabled', !resetEnabled);
  resetButton.style.cursor = resetEnabled ? "pointer" : "not-allowed";
  resetbuttondb = resetEnabled;
}

function updateCpuChart() {
  if (cpuchart.length) {
    document.getElementById("cputext").textContent = "CPU Usage";
    
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
              beginAtZero: true
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
    document.getElementById("ramtext").textContent = "Memory Usage";
    
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
              beginAtZero: true
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
  const disksContainer = document.getElementById("disks");
  
  storage.forEach(disk => {
    if (!document.getElementById(`${disk.name}-disk`)) {
      createDiskElement(disk);
    }
    
    updateDiskElement(disk);
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
  var extension = "KB";
  var diskSize = disk.size;
  var totalSize = 0;
  
  const diskFilter = ejs.disks.filter(z => z.name === disk.name);
  
  if (diskFilter.length) {
    totalSize = Number(diskFilter[0].resize) || Number(diskFilter[0].size);
    
    // Convert units
    if ((disk.size / 1024) >= 1024 || totalSize >= 1024) {
      diskSize = ((disk.size / 1024) / 1024).toFixed(1);
      totalSize = (totalSize / 1024).toFixed(1);
      extension = "GB";
    } else if (disk.size >= 1024 || totalSize >= 1) {
      diskSize = (disk.size / 1024).toFixed(1);
      extension = "MB";
    } else {
      diskSize = disk.size.toFixed(1);
    }
    
    // Set size display
    if (!isNaN(totalSize)) {
      document.getElementById(`${disk.name}-size`).textContent = `${diskSize} ${extension} / ${totalSize} ${extension}`;
      
      // Update progress bar
      const percentage = Math.min(((diskSize / totalSize) * 100).toFixed(0), 100);
      const progressElement = document.getElementById(`${disk.name}-progress`);
      const progressTextElement = document.getElementById(`${disk.name}-progress-text`);
      
      progressElement.style.width = `${percentage}%`;
      progressTextElement.textContent = `${percentage}%`;
      
      // Update progress color based on usage
      progressElement.classList.remove('progress-low', 'progress-medium', 'progress-high');
      
      if (percentage >= 90) {
        progressElement.classList.add('progress-high');
      } else if (percentage >= 70) {
        progressElement.classList.add('progress-medium');
      } else {
        progressElement.classList.add('progress-low');
      }
    }
  } else {
    // Handle simple display without total size
    if ((disk.size / 1024) >= 1024) {
      diskSize = ((disk.size / 1024) / 1024).toFixed(1);
      extension = "GB";
    } else if (disk.size >= 1024) {
      diskSize = (disk.size / 1024).toFixed(1);
      extension = "MB";
    } else {
      diskSize = disk.size.toFixed(1);
    }
    
    document.getElementById(`${disk.name}-size`).textContent = `${diskSize} ${extension}`;
  }
}

// User interaction functions
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
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    alertBox.classList.remove("show");
  }, 5000);
}

// Control functions
function reboot() {
  if (timeoutdb) return;
  
  if (!resetdb) {
    showAlert("Are you sure you want to reinstall the system? Click again if you are sure.");
    resetdb = true;
  } else {
    resetdb = false;
    timeoutdb = true;
    socket.emit("panelservers", { action: "installos" });
    showAlert("Please wait reinstalling");
    setTimeout(() => timeoutdb = false, 10000);
  }
}

function setup() {
  if (timeoutdb) return;
  
  const selectedOS = document.getElementById("osSelect").value;
  
  if (rebootdb != selectedOS) {
    showAlert(`Are you sure you want to ${selectedOS} install the system? Click again if you are sure.`);
    rebootdb = selectedOS;
  } else {
    rebootdb = "";
    timeoutdb = true;
    socket.emit("panelservers", { action: "installos", changeos: selectedOS });
    showAlert(`Please wait installing ${selectedOS}`);
    setTimeout(() => timeoutdb = false, 10000);
  }
}

function start() {
  if (!startdb || timeoutdb) return;
  
  timeoutdb = true;
  socket.emit("panelservers", { action: "start" });
  showAlert("Starting, You must wait 10 seconds to process again");
  setTimeout(() => timeoutdb = false, 10000);
}

function shutdown() {
  if (!shutdowndb || timeoutdb) return;
  
  timeoutdb = true;
  socket.emit("panelservers", { action: "shutdown" });
  showAlert("Shutdowning, You must wait 10 seconds to process again");
  setTimeout(() => timeoutdb = false, 10000);
}

function reset() {
  if (!resetbuttondb || timeoutdb) return;
  
  timeoutdb = true;
  socket.emit("panelservers", { action: "reset" });
  showAlert("Resetting, You must wait 10 seconds to process again");
  setTimeout(() => timeoutdb = false, 10000);
}

function setchart(type, value) {
  if (isNaN(Number(value))) return;
  
  if (type === "cpu") {
    cpuchart = [cpuchart[1], cpuchart[2], cpuchart[3], cpuchart[4], value];
  }
  
  if (type === "ram") {
    ramchart = [ramchart[1], ramchart[2], ramchart[3], ramchart[4], value];
  }
}

// Initialize charts on load
updateCpuChart();
updateRamChart();