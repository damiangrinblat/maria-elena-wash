@echo off
title Maria Elena Wash - App
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0app"

if not exist node_modules (
  echo Instalando dependencias por primera vez...
  call npm install
)

echo.
echo Iniciando la app. Se abrira en el navegador.
echo   Clientes:  la pagina principal
echo   Equipo:    agregar  #/admin  a la direccion  (PIN 1234)
echo   Barrios:   agregar  #/barrio a la direccion
echo.
echo Para cerrar la app, cierre esta ventana.
echo.
call npm run dev -- --open
pause
