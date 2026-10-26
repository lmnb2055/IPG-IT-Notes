@echo off
REM ============================================================
REM  Set-MGSE-Tag.bat   (v3)
REM  Inteplast IT - CrowdStrike Falcon sensor grouping tag (Windows)
REM
REM  Usage:  right-click  >  Run as administrator
REM          scripted:     Set-MGSE-Tag.bat /nopause
REM
REM  EDIT TAG BELOW FOR EACH PLANT. Do not ship MGSE to another site.
REM  Exit codes: 0 = verified OK, 1 = failed (do NOT mark host done)
REM ============================================================
setlocal

REM ---- EDIT THESE ---------------------------------------------
set "TAG=MGSE"
set "MAINT_TOKEN="
REM   ^ Leave empty unless the sensor refuses with a maintenance-
REM     protection error. Get it from the Falcon console:
REM     Host management > select host > Actions > Reveal maintenance token
REM
REM     SECURITY: the token is a credential. Fill it in for the run,
REM     then blank it again. Do NOT distribute this file with a token
REM     in it - that defeats the point of maintenance protection.

set "LOGFILE="
REM   ^ Optional. Empty = log next to this .bat file.
REM     For ONE CENTRAL RECORD across every machine, point it at a
REM     writable share, e.g.:
REM     set "LOGFILE=\\fileserver\IT$\CrowdStrike\Set-Tag-Log.txt"
REM     Unreachable or read-only paths fall back to %TEMP% automatically.
REM -------------------------------------------------------------

set "CSS=%ProgramFiles%\CrowdStrike\CsSensorSettings.exe"
set "TAGOUT=%TEMP%\cs-tag-check.txt"

REM --- pick a writable log location -----------------------------
if not defined LOGFILE set "LOGFILE=%~dp0Set-Tag-Log.txt"
type nul >>"%LOGFILE%" 2>nul
if errorlevel 1 set "LOGFILE=%TEMP%\Set-Tag-Log.txt"

REM --- must run elevated ----------------------------------------
REM  fltmc is the primary check. "net session" is the fallback,
REM  because fltmc is absent from 32-bit (SysWOW64) command hosts
REM  and net session false-fails when LanmanServer is disabled.
REM  Either one passing is good enough.
set "ELEV="
fltmc >nul 2>&1
if not errorlevel 1 set "ELEV=1"
if not defined ELEV (
    net session >nul 2>&1
    if not errorlevel 1 set "ELEV=1"
)
if not defined ELEV (
    echo ERROR: not running as administrator.
    echo        Close this, right-click the file, choose "Run as administrator".
    echo.
    if /i not "%~1"=="/nopause" pause
    exit /b 1
)

REM --- sensor installed? ----------------------------------------
if not exist "%CSS%" (
    echo ERROR: "%CSS%" not found.
    echo        The Falcon sensor does not appear to be installed.
    >>"%LOGFILE%" echo %DATE% %TIME%  %COMPUTERNAME%  tag=%TAG%  result=NO_SENSOR
    echo.
    if /i not "%~1"=="/nopause" pause
    exit /b 1
)

REM --- show what is there now -----------------------------------
REM  On an UNTAGGED host this prints nothing or an error.
REM  That is the expected state. Keep going.
echo Previous tag:
"%CSS%" show --grouping-tags
echo.

REM --- set the tag ----------------------------------------------
REM  NOTE: "set" OVERWRITES all existing tags. To keep existing
REM        ones, list them all:  set "TAG=MGSE,Workstation"
REM  NOTE: on Windows the maintenance token is piped via STDIN,
REM        not passed as a flag (Linux uses --maintenance-token).
echo Setting tag to: %TAG%

if defined MAINT_TOKEN (
    echo %MAINT_TOKEN%| "%CSS%" set --grouping-tags "%TAG%"
) else (
    "%CSS%" set --grouping-tags "%TAG%"
)

if errorlevel 1 (
    echo.
    echo ERROR: failed to set the tag.
    echo        If the error mentions maintenance protection, fill in
    echo        MAINT_TOKEN at the top of this file and run it again.
    >>"%LOGFILE%" echo %DATE% %TIME%  %COMPUTERNAME%  tag=%TAG%  result=SET_FAILED
    echo.
    if /i not "%~1"=="/nopause" pause
    exit /b 1
)

REM --- verify the tag actually took ------------------------------
REM  Do not trust exit code alone - read the value back.
"%CSS%" show --grouping-tags >"%TAGOUT%" 2>&1
echo.
echo Current Tag:
type "%TAGOUT%"

find /i "%TAG%" "%TAGOUT%" >nul
if errorlevel 1 (
    echo.
    echo ERROR: tag was set without error but does NOT read back as "%TAG%".
    echo        Do not mark this host as done.
    >>"%LOGFILE%" echo %DATE% %TIME%  %COMPUTERNAME%  tag=%TAG%  result=VERIFY_FAILED
    del "%TAGOUT%" 2>nul
    echo.
    if /i not "%~1"=="/nopause" pause
    exit /b 1
)
del "%TAGOUT%" 2>nul

>>"%LOGFILE%" echo %DATE% %TIME%  %COMPUTERNAME%  tag=%TAG%  result=OK

echo.
echo OK - tag verified on this host.
echo It appears in the Falcon console at the next check-in
echo (usually a few minutes). Verify under Host management.
echo.
echo Logged to: %LOGFILE%
echo.
if /i not "%~1"=="/nopause" pause
endlocal
exit /b 0
