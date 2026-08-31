@echo off
setlocal enabledelayedexpansion

echo ===============================
echo   Push EducationAI
echo ===============================
cd EducationAI
git add .
set /p msg1="Enter commit message for EducationAI (leave blank to skip): "
if not "!msg1!"=="" (
    git commit -m "!msg1!"
    git push
) else (
    echo Skipped EducationAI commit.
)
cd ..

echo ===============================
echo   Push school-management-system
echo ===============================
cd school-management-system
git add .
set /p msg2="Enter commit message for school-management-system (leave blank to skip): "
if not "!msg2!"=="" (
    git commit -m "!msg2!"
    git push
) else (
    echo Skipped school-management-system commit.
)
cd ..

echo ===============================
echo   Push main repo (personal)
echo ===============================
git add .
set /p msg3="Enter commit message for main repo (leave blank to skip): "
if not "!msg3!"=="" (
    git commit -m "!msg3!"
    git push
) else (
    echo Skipped main repo commit.
)

echo ===============================
echo   Done.
echo ===============================
pause
