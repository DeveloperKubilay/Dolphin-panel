title Dolphin Panel Installer
echo off
cls
echo ------------------------------------
echo WELCOME TO DOLPHIN PANEL SETUP
echo ------------------------------------
set /p winlater="Do you have node js installed on your computer? Y/N: "

if "%winlater%" == "n" (
echo Node js must be installed on your computer. If not, install it.
start https://nodejs.org/en/download/
pause
) else if "%winlater%" == "N" (
echo Node js must be installed on your computer. If not, install it.
start https://nodejs.org/en/download/
pause
) else if "%winlater%" == "No" (
echo Node js must be installed on your computer. If not, install it.
start https://nodejs.org/en/download/
pause
) else if "%winlater%" == "no" (
echo Node js must be installed on your computer. If not, install it.
start https://nodejs.org/en/download/
pause
)

cls
node panelinstaller.js
cd ..
npm install && cls && npm start
