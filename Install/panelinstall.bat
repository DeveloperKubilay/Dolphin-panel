title Dolphin Panel Installer
echo off
cls
echo ------------------------------------
echo WELCOME TO DOLPHIN PANEL SETUP
echo ------------------------------------
set /p winlater="Are you using Windows 10 or Windows Server 2019 or Later? Y/N: "
set /p nodejsinstall="Do you want to install nodejs? Y/N: "

if /i "%nodejsinstall%" == "yes" goto nodejsinstall
if /i "%nodejsinstall%" == "Y" goto nodejsinstall
if /i "%nodejsinstall%" == "Yes" goto nodejsinstall
if /i "%nodejsinstall%" == "y" goto nodejsinstall

:nodejsinstall
if "%winlater%" == "y" (
winget install --id=OpenJS.NodeJS.LTS  -e
) else if "%winlater%" == "Y" (
winget install --id=OpenJS.NodeJS.LTS  -e
) else if "%winlater%" == "Yes" (
winget install --id=OpenJS.NodeJS.LTS  -e
) else if "%winlater%" == "yes" (
winget install --id=OpenJS.NodeJS.LTS  -e
) else (
start https://nodejs.org/en/download/
echo After installing please press a button
pause
)

cls
node panelinstaller.js
cd ..
npm install
cls
echo ------------------------------------
echo The installation is complete, you can go to the main directory and run npm start
echo ------------------------------------
cd ..
npm start