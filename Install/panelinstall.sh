echo "------------------------------------"
echo "   WELCOME TO DOLPHIN PANEL SETUP   "
echo "------------------------------------"
echo "Installing nodejs@16"
sudo apt update -y
curl -s https://deb.nodesource.com/setup_16.x | sudo bash
sudo apt install nodejs -y
clear
node panelinstaller.js
cd ..
npm install
clear
echo ------------------------------------
echo The installation is complete, you can go to the main directory and run npm start
echo ------------------------------------
npm start
