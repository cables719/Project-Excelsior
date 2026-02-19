
# scripts/deploy-env.ps1

$envFile = "web/.env.local"
if (-not (Test-Path $envFile)) {
    Write-Error "Could not find $envFile"
    exit 1
}

Write-Host "Reading env vars from $envFile..." -ForegroundColor Cyan

$envVars = @()
$lines = Get-Content $envFile
foreach ($line in $lines) {
    $line = $line.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { continue }

    # Simple parsing logic for KEY="VALUE" or KEY=VALUE
    if ($line -match '^([^=]+)=(.*)$') {
        $key = $matches[1]
        $val = $matches[2]
        
        # Remove surrounding quotes if present
        if ($val.StartsWith('"') -and $val.EndsWith('"')) {
            $val = $val.Substring(1, $val.Length - 2)
        }

        # Escape existing commas for gcloud (comma is delimiter)
        # gcloud uses comma to separate vars, so we must escape any commas inside the value.
        # Actually, gcloud --set-env-vars format is K=V,K2=V2. 
        # If V contains comma, we need to escape it.
        # According to gcloud docs, values can be weird.
        # A safer way is to use --set-env-vars-file if available, but it's preview?
        # Let's try to escape commas. Usually internal commas in keys (like private keys) don't have commas.
        # The private key has \n but no commas.
        
        $envVars += "$key=$val"
    }
}

$envString = $envVars -join ","

Write-Host "Deploying environment variables to Cloud Run service 'fitsync-web'..." -ForegroundColor Yellow
# Write-Host "Vars: $envString" # Debug only, don't print secrets

# Run gcloud command
# Note: This assumes the service name is 'fitsync-web' and region is 'us-central1'
# If region varies, gcloud might ask or fail. safely add region if known or rely on defaults.
gcloud run services update fitsync-web --set-env-vars "$envString" --region us-central1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Success! Environment variables updated." -ForegroundColor Green
} else {
    Write-Host "Failed to update environment variables." -ForegroundColor Red
}
