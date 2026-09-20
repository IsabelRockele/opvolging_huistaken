@echo off
cd /d "%~dp0.."
python maker\generate-dena.py
echo.
pause
