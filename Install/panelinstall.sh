echo "------------------------------------"
echo "   WELCOME TO DOLPHIN PANEL SETUP   "
echo "------------------------------------"
echo "Do you want to install nodejs? Y/N"
read nodejsinstall
if [ "$nodejsinstall" == "yes" ] || [ "$nodejsinstall" == "Y" ] || [ "$nodejsinstall" == "y" ] || [ "$nodejsinstall" == "Yes" ]; then
echo "Installing nodejs@16"
sudo apt update -y
curl -s https://deb.nodesource.com/setup_16.x | sudo bash
sudo apt install nodejs -y
fi
clear
node panelinstaller.js
cd ..
npm install
clear
echo ------------------------------------
echo The installation is complete, you can go to the main directory and run npm start
echo ------------------------------------
cd ..
npm start