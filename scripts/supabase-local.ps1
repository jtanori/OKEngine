[CmdletBinding()]
param(
  [ValidateSet('up', 'status', 'down', 'reset')]
  [string]$Action = 'up',

  # Create a local .env.local from `supabase status -o env` after starting the stack.
  # This refuses to overwrite an existing .env.local.
  [switch]$WriteAppEnv
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envFile = Join-Path $repoRoot '.env.local'

function Assert-Command {
  param([Parameter(Mandatory)][string]$Name)

  if (-not (Get-Command -Name $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found in PATH. See docs/LOCAL-SUPABASE-WINDOWS.md."
  }
}

function Invoke-Supabase {
  param([Parameter(Mandatory)][string[]]$CliArgs)

  & supabase @CliArgs
  if ($LASTEXITCODE -ne 0) {
    throw "supabase $($CliArgs -join ' ') failed with exit code $LASTEXITCODE."
  }
}

function Import-LocalOAuthEnv {
  # Do not accidentally pass provider credentials inherited from a hosted/dev
  # shell into the local Auth container. Only values explicitly in ignored
  # .env.local are eligible for this local stack.
  $providerEnvNames = @(
    'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID',
    'SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET',
    'SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID',
    'SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET'
  )
  foreach ($name in $providerEnvNames) {
    [System.Environment]::SetEnvironmentVariable($name, $null, 'Process')
  }

  # Load only the four OAuth provider entries from the ignored app env file;
  # never print credential values or execute the file as PowerShell.
  if (-not (Test-Path -LiteralPath $envFile)) {
    return
  }

  $providerEnvPattern = '^\s*(?:export\s+)?(SUPABASE_AUTH_EXTERNAL_(?:GOOGLE|GITHUB)_(?:CLIENT_ID|SECRET))\s*=\s*(.*)$'
  foreach ($line in [System.IO.File]::ReadAllLines($envFile)) {
    if ([string]$line -match $providerEnvPattern) {
      $name = $Matches[1]
      $value = $Matches[2].Trim()
      if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
          ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
      }
      [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
  }
}

function Set-LocalOAuthProviderState {
  param(
    [Parameter(Mandatory)][string]$ConfigText,
    [Parameter(Mandatory)][ValidateSet('google', 'github')][string]$Provider
  )

  $prefix = "SUPABASE_AUTH_EXTERNAL_$($Provider.ToUpperInvariant())"
  $clientId = [System.Environment]::GetEnvironmentVariable("${prefix}_CLIENT_ID", 'Process')
  $secret = [System.Environment]::GetEnvironmentVariable("${prefix}_SECRET", 'Process')
  $enabled = if (-not [string]::IsNullOrWhiteSpace($clientId) -and -not [string]::IsNullOrWhiteSpace($secret)) { 'true' } else { 'false' }

  # The provider section is changed only in-memory for the CLI invocation. The
  # committed/default config remains disabled and requires no OAuth credentials.
  $pattern = "(?ms)(^\[auth\.external\.$Provider\]\r?\n(?:(?!^\[).)*?^\s*enabled\s*=\s*)[^\r\n]+"
  $regex = [System.Text.RegularExpressions.Regex]::new($pattern)
  if (-not $regex.IsMatch($ConfigText)) {
    throw "Could not locate the [auth.external.$Provider] enabled setting in supabase/config.toml."
  }
  $replacement = [System.Text.RegularExpressions.MatchEvaluator]{
    param($match)
    return $match.Groups[1].Value + $enabled
  }
  return $regex.Replace($ConfigText, $replacement, 1)
}

function Invoke-LocalSupabaseStart {
  $configPath = Join-Path $repoRoot 'supabase/config.toml'
  $originalConfig = [System.IO.File]::ReadAllText($configPath)
  $localConfig = $originalConfig
  $changedOnDisk = $false

  try {
    $localConfig = Set-LocalOAuthProviderState -ConfigText $localConfig -Provider 'google'
    $localConfig = Set-LocalOAuthProviderState -ConfigText $localConfig -Provider 'github'
    if ($localConfig -cne $originalConfig) {
      $changedOnDisk = $true
      $encoding = [System.Text.UTF8Encoding]::new($false)
      [System.IO.File]::WriteAllText($configPath, $localConfig, $encoding)
    }
    Invoke-Supabase -CliArgs @('start')
  }
  finally {
    if ($changedOnDisk) {
      $encoding = [System.Text.UTF8Encoding]::new($false)
      [System.IO.File]::WriteAllText($configPath, $originalConfig, $encoding)
    }
  }
}

function New-LocalSecret {
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $bytes = [byte[]]::new(32)
    $rng.GetBytes($bytes)
    return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
  }
  finally {
    $rng.Dispose()
  }
}

function Get-LocalSupabaseEnv {
  $output = & supabase status -o env
  if ($LASTEXITCODE -ne 0) {
    throw 'Could not read local Supabase keys. Is the local stack running?'
  }

  $values = @{}
  foreach ($line in $output) {
    if ([string]$line -match '^\s*(?:export\s+)?([A-Z_]+)=(.*)$') {
      $value = $Matches[2].Trim()
      if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
          ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
      }
      $values[$Matches[1]] = $value
    }
  }

  # Newer Supabase CLI releases can expose publishable/secret keys alongside or
  # instead of the legacy anon/service-role names. The app keeps its existing
  # env var contract, so normalize the key names here.
  if ((-not $values.ContainsKey('ANON_KEY') -or [string]::IsNullOrWhiteSpace($values['ANON_KEY'])) -and $values.ContainsKey('PUBLISHABLE_KEY')) {
    $values['ANON_KEY'] = $values['PUBLISHABLE_KEY']
  }
  if ((-not $values.ContainsKey('SERVICE_ROLE_KEY') -or [string]::IsNullOrWhiteSpace($values['SERVICE_ROLE_KEY'])) -and $values.ContainsKey('SECRET_KEY')) {
    $values['SERVICE_ROLE_KEY'] = $values['SECRET_KEY']
  }

  foreach ($required in @('API_URL', 'DB_URL', 'ANON_KEY', 'SERVICE_ROLE_KEY')) {
    if (-not $values.ContainsKey($required) -or [string]::IsNullOrWhiteSpace($values[$required])) {
      throw "supabase status -o env did not return a usable local '$required' value. Copy the local API URL, database URL, and public/server keys from supabase status into .env.local manually."
    }
  }

  return $values
}

function Write-LocalAppEnv {
  param([Parameter(Mandatory)][hashtable]$SupabaseEnv)

  $lines = @(
    '# Generated by scripts/supabase-local.ps1. Local development only; do not use these values in production.',
    'OKENG_ENV=development',
    'OKENG_DATA_MODE=supabase',
    'OKENG_ENABLE_PASSWORD_RESET=true',
    'NODE_ENV=development',
    'PORT=3000',
    "DATABASE_URL=$($SupabaseEnv['DB_URL'])",
    "SUPABASE_URL=$($SupabaseEnv['API_URL'])",
    "SUPABASE_ANON_KEY=$($SupabaseEnv['ANON_KEY'])",
    "SUPABASE_SERVICE_ROLE_KEY=$($SupabaseEnv['SERVICE_ROLE_KEY'])",
    'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=',
    'SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=',
    'SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID=',
    'SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET=',
    "SESSION_SECRET=$(New-LocalSecret)",
    "CSRF_SECRET=$(New-LocalSecret)",
    "OKENG_SESSION_SECRET=$(New-LocalSecret)",
    "OKENG_CSRF_SECRET=$(New-LocalSecret)",
    "OKENG_SESSION_COOKIE_SECRET=$(New-LocalSecret)",
    "OKENG_CSRF_HMAC_SECRET=$(New-LocalSecret)",
    "OKENG_KMS_MASTER_KEY=$(New-LocalSecret)",
    "OKENG_SIGNING_SECRET=$(New-LocalSecret)",
    "OKENG_RLS_CONTEXT_SECRET=$(New-LocalSecret)",
    'NEXT_PUBLIC_APP_URL=http://localhost:3000',
    'OKENG_ALLOWED_ORIGINS=http://localhost:3000',
    'CORS_ALLOWED_ORIGINS=http://localhost:3000',
    'CACHE_BACKEND=memory',
    'CACHE_ENABLED=true',
    'OKENG_DISABLE_GENERATIVE_AI=true',
    'OKENG_DAILY_GEMINI_TOKEN_BUDGET=250000'
  )

  $encoding = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllLines($envFile, $lines, $encoding)
  Write-Host "Created ignored local env file: $envFile" -ForegroundColor Green
}

Push-Location $repoRoot
try {
  Assert-Command -Name 'docker'
  Assert-Command -Name 'supabase'

  if ($WriteAppEnv -and $Action -ne 'up') {
    throw '-WriteAppEnv is only valid with -Action up.'
  }
  if ($WriteAppEnv -and (Test-Path -LiteralPath $envFile)) {
    throw "Refusing to overwrite existing $envFile. Back it up or add the local values manually from supabase status -o env."
  }

  if ($Action -in @('up', 'reset')) {
    & docker info *> $null
    if ($LASTEXITCODE -ne 0) {
      throw 'Docker is installed but its engine is not running. Start Docker Desktop with the WSL 2/Linux container backend, then retry.'
    }
  }

  switch ($Action) {
    'up' {
      Import-LocalOAuthEnv
      Invoke-LocalSupabaseStart
      # Apply only pending local migrations. The explicit flag is a second safety
      # barrier if this checkout is linked to a hosted Supabase project.
      Invoke-Supabase -CliArgs @('migration', 'up', '--local')
      Invoke-Supabase -CliArgs @('status')
      if ($WriteAppEnv) {
        $localEnv = Get-LocalSupabaseEnv
        Write-LocalAppEnv -SupabaseEnv $localEnv
      }
      Write-Host 'Local Supabase is ready. Start OKEngine with: npm run dev' -ForegroundColor Green
    }
    'status' {
      Invoke-Supabase -CliArgs @('status')
    }
    'down' {
      # Stops containers without deleting their local volumes/data.
      Invoke-Supabase -CliArgs @('stop')
    }
    'reset' {
      Write-Warning 'This drops and recreates the local Supabase database, then reapplies migrations. Local database data will be lost.'
      $answer = Read-Host 'Type RESET to continue'
      if ($answer -cne 'RESET') {
        Write-Host 'Reset cancelled.'
        break
      }
      Import-LocalOAuthEnv
      Invoke-LocalSupabaseStart
      Invoke-Supabase -CliArgs @('db', 'reset', '--local', '--yes')
      Invoke-Supabase -CliArgs @('status')
    }
  }
}
finally {
  Pop-Location
}
