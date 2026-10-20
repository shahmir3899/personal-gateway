@echo off
setlocal enabledelayedexpansion

REM Commits (if there is anything to commit) and pushes everything, submodules first,
REM then the main repo so Render never points at a commit GitHub doesn't have.
REM Each repo is announced with its friendly name, remote and branch so every prompt says which repo it is for.
for /f "delims=" %%t in ('powershell -nop -c "Get-Date -Format yyyy-MM-dd_HH:mm"') do set "stamp=%%t"

call :process EducationAI "1 of 3" "EducationAI" "main app (submodule)"
if errorlevel 1 goto :failed
call :process school-management-system "2 of 3" "KoderKids ERP" "koderkids_erp (submodule)"
if errorlevel 1 goto :failed
call :process . "3 of 3" "PARENT repo" "personal-gateway - only updates the submodule pointers"
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
REM %1 = folder, %2 = "n of 3", %3 = friendly name, %4 = description
set "label=%~3"
set "folder=%~f1"
pushd %1
for /f "delims=" %%b in ('git branch --show-current') do set "branch=%%b"
for /f "delims=" %%r in ('git remote get-url origin') do set "remote=%%r"
set "changes=0"
REM full path to find.exe: a GNU find earlier on PATH would hang here instead of counting lines
for /f %%c in ('git status --short ^| "%SystemRoot%\System32\find.exe" /c /v ""') do set "changes=%%c"
echo ===============================
echo   Repo %~2: !label!  [%~4]
echo   Folder : !folder!
echo   Remote : !remote!
echo   Branch : !branch!
echo   Changes: !changes! file(s)
echo ===============================
git add .
git status --short
set "msg="
git diff --cached --quiet
if errorlevel 1 (
    set /p msg="Commit message for !label! ^(!changes! files, branch !branch!^) - blank = Update !stamp!: "
    if "!msg!"=="" set "msg=Update !stamp!"
    git commit -m "!msg!"
) else (
    echo No changes in !label! - nothing to commit, skipping the commit.
)
REM -u so a new branch gets an upstream; a plain push fails silently on one
git push -u origin HEAD
if errorlevel 1 (
    popd
    exit /b 1
)
if /i not "!branch!"=="main" if /i not "!branch!"=="master" (
    set "merge="
    set /p merge="Merge !branch! of !label! into main and delete the branch? (y/N): "
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
