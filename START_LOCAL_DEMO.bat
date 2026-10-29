@echo off
setlocal
cd /d "%~dp0"
echo Starting LogiRoute static demo on http://localhost:8000
echo Keep this window open. Press Ctrl+C to stop.
where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server 8000 --directory frontend
  goto :eof
)
where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server 8000 --directory frontend
  goto :eof
)
echo Python was not found. Install Python 3, then run this file again.
pause
