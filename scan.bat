@echo off
title Private Docs - Quet va Cap Nhat Danh Sach File
echo Dang quet thu muc files/...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\scan.ps1"
echo.
echo Hoan tat cap nhat!
pause
