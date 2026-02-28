@echo off
setlocal enabledelayedexpansion

echo ====================================================
echo Starting Project Excelsior Deployment Pipeline...
echo ====================================================

echo 1. Extracting environment variables from web/.env.local...

set "ENV_VARS="
for /f "usebackq tokens=1* delims==" %%a in ("web\.env.local") do (
    set "key=%%a"
    set "val=%%b"
    
    REM Skip comments and empty lines
    set "first_char=!key:~0,1!"
    if NOT "!first_char!"=="#" if NOT "!key!"=="" (
        REM Remove quotes if present
        set "val=!val:"=!"
        
        REM Build the env-vars string
        if "!ENV_VARS!"=="" (
            set "ENV_VARS=!key!=!val!"
        ) else (
            set "ENV_VARS=!ENV_VARS!,!key!=!val!"
        )
    )
)

echo 2. Initiating Google Cloud Run deployment to 'fitsync-web'...
echo Source: ./web
echo Region: us-central1
echo.

call gcloud run deploy fitsync-web ^
  --source ./web ^
  --region us-central1 ^
  --allow-unauthenticated ^
  --set-env-vars="%ENV_VARS%"

if %ERRORLEVEL% equ 0 (
    echo ====================================================
    echo Success! Project Excelsior is live.
    echo https://fitsync-web-911277083046.us-central1.run.app/
    echo ====================================================
) else (
    echo.
    echo [ERROR] Deployment failed with exit code %ERRORLEVEL%.
    echo Please ensure you are authenticated: gcloud auth login
)

pause
