@echo off
setlocal EnableDelayedExpansion
title EatOuts Launcher
cd /d "%~dp0"

rem ============================================================
rem  EatOuts launcher
rem
rem  Serves this folder over http://127.0.0.1 so that all eight
rem  pages share ONE localStorage origin for the key
rem  "eatouts_db_v2" (see js\eatouts-db.js). Opening the files
rem  straight off disk (file://) lets browsers isolate or block
rem  that per file, which silently stops the operator dashboards
rem  from feeding the customer app.
rem
rem  Usage:   run-eatouts.bat            auto-pick a free port
rem           run-eatouts.bat 7788       pin a specific port
rem ============================================================

rem ---- candidate ports, preferred first -------------------------
set "PORTS=5173 8123 7788 4321 8081 9001 8090"
if not "%~1"=="" set "PORTS=%~1"

echo.
echo   EatOuts Launcher
echo   ==========================
echo   Folder: %CD%
echo.

rem ---- pick the first free port ---------------------------------
rem  Loopback probe, not IPAddress.Any: Windows allows binding
rem  0.0.0.0:P while another process already holds 127.0.0.1:P,
rem  which would report a false "free".
set "PORT="
for %%P in (%PORTS%) do (
    if not defined PORT (
        powershell -NoProfile -Command "$l=$null; try { $l=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,%%P); $l.Start(); $l.Stop(); exit 0 } catch { exit 1 } finally { if($l){ $l.Stop() } }"
        if errorlevel 1 (
            echo   [busy] %%P - in use, trying next
        ) else (
            set "PORT=%%P"
        )
    )
)

if not defined PORT (
    echo.
    echo   ERROR: every candidate port is in use.
    echo   Ports tried:%PORTS%
    echo   Free one manually and re-run, or pass your own:
    echo     run-eatouts.bat 5173
    echo.
    pause
    exit /b 1
)

echo   [free] %PORT% - using it
echo.

rem ---- start the static server ----------------------------------
rem  python first (already installed), node as a fallback.
set "SERVER="
where python >nul 2>&1 && set "SERVER=python"

if not defined SERVER (
    where node >nul 2>&1 && set "SERVER=node"
)

if not defined SERVER (
    echo   ERROR: neither python nor node is on PATH.
    echo   Install Python 3 or Node.js, then re-run this file.
    echo.
    pause
    exit /b 1
)

rem  Bind the chosen port explicitly rather than letting the server
rem  choose one, so the URL we print is the URL that answers.
if "%SERVER%"=="python" (
    start "EatOuts server" /min python -m http.server %PORT% --bind 127.0.0.1
    echo   Serving with: python -m http.server %PORT%
) else (
    echo   Serving with: node (inline static server)
    start "EatOuts server" /min node "%~dp0serve.js" %PORT%
)

set "URL=http://127.0.0.1:%PORT%/index.html"

rem ---- wait for it to actually answer ---------------------------
rem  index.html, not a wrapper page: the app is a portrait phone UI.
rem  Serving it over 127.0.0.1 is also what makes crypto.subtle
rem  available, which the Operator sign-in needs to hash passwords.
echo   Waiting for the app to come up...
set "READY="
for /l %%I in (1,1,40) do (
    if not defined READY (
        powershell -NoProfile -Command "try { $r=Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){ exit 0 } else { exit 1 } } catch { exit 1 }"
        if not errorlevel 1 set "READY=1"
        if not defined READY ping -n 2 127.0.0.1 >nul
    )
)

if not defined READY (
    echo.
    echo   ERROR: the server never answered on port %PORT%.
    echo   Close the "EatOuts server" window to see why, then re-run.
    echo.
    pause
    exit /b 1
)

rem ---- open it --------------------------------------------------
echo.
echo   Ready:  %URL%
echo.
echo   Opens on Promos with the 5 bottom tabs.
echo   Operator sign-in:  About Us tab  ->  Operator  ->  0 / 0  or  Demo
echo.
echo   Leave this window open while you work.
echo   Close it (or press Ctrl+C) to stop the server.
echo.
start "" "%URL%"

echo   Tip: bookmark the URL above. To pin a fixed port instead of
echo   auto-picking, run:  run-eatouts.bat 5173
echo.
pause