@echo off
setlocal enabledelayedexpansion

REM Commits (if there is anything to commit) and pushes everything, submodules first,
REM then the main repo so Render never points at a commit GitHub doesn't have.
for /f "delims=" %%t in ('powershell -nop -c "Get-Date -Format yyyy-MM-dd_HH:mm"') do set "stamp=%%t"

call :process EducationAI
if errorlevel 1 goto :failed
call :process school-management-system
if errorlevel 1 goto :failed
call :process .
if errorlevel 1 goto :failed

echo ===============================
echo   Done.
echo ===============================
pause
exit /b 0

:failed
echo.
echo STOPPED: a push failed. Nothing after it was pushed.
pause
exit /b 1

:process
echo ===============================
echo   %1
echo ===============================
pushd %1
for /f "delims=" %%b in ('git branch --show-current') do set "branch=%%b"
echo Current branch: !branch!
git add .
git status --short
set "msg="
git diff --cached --quiet
if errorlevel 1 (
    set /p msg="Commit message for %1 (blank = Update !stamp!): "
    if "!msg!"=="" set "msg=Update !stamp!"
    git commit -m "!msg!"
) else (
    echo Nothing new to commit.
)
REM -u so a new branch gets an upstream; a plain push fails silently on one
git push -u origin HEAD
if errorlevel 1 (
    popd
    exit /b 1
)
if /i not "!branch!"=="main" if /i not "!branch!"=="master" (
    set "merge="
    set /p merge="Merge !branch! into main and delete the branch? (y/N): "
    if /i "!merge!"=="y" (
        git checkout main && git pull --ff-only && git merge --no-ff !branch! && git push origin main
        if errorlevel 1 (
            echo MERGE OR PUSH FAILED - staying as is, branch kept.
        ) else (
            git branch -d !branch!
            git push origin --delete !branch!
        )
    )
)
popd
exit /b 0
