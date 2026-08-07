@echo off
REM push-all.bat - Production push: submodules first, then parent repo.
REM Usage: push-all.bat "commit message"
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
set "MSG=%~1"
if "%MSG%"=="" set "MSG=Production update %date% %time%"

echo ============================================
echo  Push All - Production Mode
echo  Commit message: %MSG%
echo ============================================

REM ---------- Step 1: EducationAI submodule ----------
echo.
echo [1/3] EducationAI
cd /d "%ROOT%EducationAI"
git add -A
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "%MSG%"
    if errorlevel 1 (
        echo ERROR: commit failed in EducationAI
        exit /b 1
    )
) else (
    echo No changes to commit in EducationAI.
)
git push origin main
if errorlevel 1 (
    echo ERROR: push failed in EducationAI
    exit /b 1
)

REM ---------- Step 2: school-management-system submodule ----------
echo.
echo [2/3] school-management-system
cd /d "%ROOT%school-management-system"
git add -A
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "%MSG%"
    if errorlevel 1 (
        echo ERROR: commit failed in school-management-system
        exit /b 1
    )
) else (
    echo No changes to commit in school-management-system.
)
git push origin main
if errorlevel 1 (
    echo ERROR: push failed in school-management-system
    exit /b 1
)

REM ---------- Step 3: parent repo (personal) ----------
echo.
echo [3/3] personal (parent repo)
cd /d "%ROOT%"
git add EducationAI school-management-system
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "Update submodule pointers: %MSG%"
    if errorlevel 1 (
        echo ERROR: commit failed in personal
        exit /b 1
    )
) else (
    echo No submodule pointer changes to commit in personal.
)
git push origin main
if errorlevel 1 (
    echo ERROR: push failed in personal
    exit /b 1
)

echo.
echo ============================================
echo  All repos pushed successfully.
echo ============================================
endlocal
