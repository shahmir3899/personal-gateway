@echo off
setlocal enabledelayedexpansion

call :process EducationAI
call :process school-management-system

echo ===============================
echo   Push main repo (personal)
echo ===============================
git add .
set "msg="
set /p msg="Enter commit message for main repo (leave blank to skip): "
if not "!msg!"=="" (
    git commit -m "!msg!"
    git push
) else (
    echo Skipped main repo commit.
)

echo ===============================
echo   Done.
echo ===============================
pause
exit /b

:process
echo ===============================
echo   Push %1
echo ===============================
pushd %1
for /f "delims=" %%b in ('git branch --show-current') do set "branch=%%b"
echo Current branch: !branch!
git add .
set "msg="
set /p msg="Enter commit message for %1 (leave blank to skip): "
if not "!msg!"=="" (
    git commit -m "!msg!"
    REM -u so a new branch gets an upstream; a plain push fails silently on one
    git push -u origin HEAD
    if errorlevel 1 (
        echo.
        echo PUSH FAILED for %1 - fix this before pushing the main repo, or Render will point at a commit GitHub does not have.
        popd
        pause
        exit /b 1
    )
) else (
    echo Skipped %1 commit.
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
exit /b
