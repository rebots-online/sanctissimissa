[CmdletBinding()]
param([Parameter(Mandatory = $true)][ValidateSet('MSI', 'MSIX')][string]$Kind)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw 'Native Windows is required; this script cannot package through WSL or Linux.'
}
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Read-Json([string]$Path) {
    try { return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json }
    catch { throw ('Missing or invalid JSON: ' + $Path) }
}
function Write-Json([string]$Path, $Value) {
    [IO.File]::WriteAllText($Path, (($Value | ConvertTo-Json -Depth 8) + [Environment]::NewLine), [Text.UTF8Encoding]::new($false))
}
function Invoke-Checked([string]$Tool, [string[]]$ToolArguments) {
    & $Tool @ToolArguments
    if ($LASTEXITCODE -ne 0) { throw ('Native tool failed: ' + (Split-Path -Leaf $Tool)) }
}
function Find-SdkTool([string]$Name) {
    $Command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($Command) { return $Command.Source }
    $Kits = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\bin'
    if (Test-Path -LiteralPath $Kits) {
        foreach ($Directory in @(Get-ChildItem -LiteralPath $Kits -Directory | Sort-Object Name -Descending)) {
            $Candidate = Join-Path $Directory.FullName ('x64\' + $Name)
            if (Test-Path -LiteralPath $Candidate) { return $Candidate }
        }
    }
    throw ('Install the Windows SDK tool: ' + $Name)
}
function Assert-X64([string]$Path) {
    $Stream = [IO.File]::OpenRead($Path)
    $Reader = New-Object IO.BinaryReader($Stream)
    try {
        if ($Reader.ReadUInt16() -ne 0x5a4d) { throw 'Native executable lacks an MZ header.' }
        $Stream.Position = 0x3c
        $Offset = $Reader.ReadUInt32()
        if ($Offset -gt ($Stream.Length - 6)) { throw 'Invalid native PE offset.' }
        $Stream.Position = $Offset
        if ($Reader.ReadUInt32() -ne 0x4550 -or $Reader.ReadUInt16() -ne 0x8664) {
            throw 'Native executable is not an x64 PE.'
        }
    } finally { $Reader.Dispose(); $Stream.Dispose() }
}
function Assert-Signature([string]$Path) {
    Invoke-Checked $SignTool @('verify', '/pa', '/all', $Path)
    $Signature = Get-AuthenticodeSignature -LiteralPath $Path
    if ($Signature.Status -ne 'Valid' -or
        $Signature.SignerCertificate.Thumbprint -ne $Thumbprint) {
        throw 'Artifact signature does not match the configured Windows certificate.'
    }
}
function Get-Artifact([string]$Path) {
    return @{ path = $Path.Substring($Target.Length + 1).Replace('\', '/'); sha256 = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }
}
function Assert-ReceiptArtifact($Artifact) {
    if (-not $Artifact -or [IO.Path]::IsPathRooted($Artifact.path)) { throw 'Invalid native artifact receipt.' }
    $Path = [IO.Path]::GetFullPath((Join-Path $Target $Artifact.path))
    if (-not $Path.StartsWith(($Target + [IO.Path]::DirectorySeparatorChar), [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Native receipt artifact escapes its target directory.'
    }
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf) -or
        (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() -cne $Artifact.sha256) {
        throw 'Native artifact does not match its frozen release receipt.'
    }
    return $Path
}
function Save-Receipt($Receipt) {
    if (Test-Path -LiteralPath $ReceiptPath) {
        $Backup = Join-Path $env:USERPROFILE 'outbox\standroidsmissal'
        New-Item -ItemType Directory -Path $Backup -Force | Out-Null
        Copy-Item -LiteralPath $ReceiptPath -Destination (Join-Path $Backup ($Prefix + '-windows-native-metadata-before-' + $Attempt + '.json'))
    }
    Write-Json $ReceiptPath $Receipt
}
function Assert-PackageIdentity([string]$ManifestPath) {
    [xml]$Manifest = Get-Content -LiteralPath $ManifestPath -Raw
    $Identity = $Manifest.Package.Identity
    if ($Identity.Name -cne $env:SAM_MS_STORE_IDENTITY_NAME -or
        $Identity.Publisher -cne $env:SAM_MS_STORE_PUBLISHER -or
        $Identity.ProcessorArchitecture -cne 'x64' -or $Identity.Version -cne $MsixVersion) {
        throw 'MSIX identity, publisher, architecture or mapped version differs from the frozen Store configuration.'
    }
}

$VersionData = Read-Json (Join-Path $Root 'version.json')
$Version = [string]$VersionData.version
if ($Version -notmatch '^([0-9]+)\.([0-9]+)\.([0-9]+)$') { throw 'Invalid canonical release version.' }
$Major = [uint32]$Matches[1]
$Minor = [uint32]$Matches[2]
if ($Major -gt 255 -or $Minor -gt 255 -or $Major -eq 0) {
    throw 'Windows installer mapping requires MAJOR 1..255 and MINOR 0..255; do not truncate a version.'
}
$MsiVersion = '{0}.{1}.0' -f $Major, $Minor
$MsixVersion = '{0}.{1}.0.0' -f $Major, $Minor
if ((Get-Content -LiteralPath (Join-Path $Root 'version.txt') -Raw).Trim() -cne $Version) {
    throw 'version.txt and version.json disagree.'
}
$State = Read-Json (Join-Path $Root 'standroidsmissal-release-state.json')
$PendingStamp = $State.PSObject.Properties['stampPending']
if ($PendingStamp -and $PendingStamp.Value -is [bool] -and $PendingStamp.Value -eq $true) {
    throw 'Release stamping is incomplete; reconcile the pending stamp through the canonical release driver before native packaging.'
}
$SourceHead = (& git rev-parse HEAD | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $State.version -cne $Version -or $State.sourceHead -cne $SourceHead) {
    throw 'Native packaging requires the matching frozen release state and source commit; resume the canonical release.'
}
if ($State.PSObject.Properties.Name -notcontains 'inputHashes' -or -not $State.inputHashes) {
    throw 'Frozen release input hashes are missing; use the canonical release driver.'
}
foreach ($InputName in @('assets/missal.db', '.env')) {
    $InputPath = Join-Path $Root $InputName
    if (Test-Path -LiteralPath $InputPath -PathType Leaf) {
        $ActualHash = (Get-FileHash -LiteralPath $InputPath -Algorithm SHA256).Hash.ToLowerInvariant()
    } elseif ($InputName -ceq '.env' -and -not (Test-Path -LiteralPath $InputPath)) {
        $ActualHash = 'absent'
    } else {
        throw ('Required release input is missing or is not a file: ' + $InputName)
    }
    $FrozenHash = $State.inputHashes.PSObject.Properties[$InputName]
    if (-not $FrozenHash -or $FrozenHash.Value -cne $ActualHash) {
        throw ('Release input differs from the frozen cross-platform release: ' + $InputName)
    }
}
$TauriConfig = Read-Json (Join-Path $Root 'src-tauri\tauri.conf.json')
if ($TauriConfig.version -cne $Version) { throw 'Tauri configuration has a different release version.' }
$Thumbprint = $env:SAM_WINDOWS_CERTIFICATE_THUMBPRINT
$TimestampUrl = $env:SAM_WINDOWS_TIMESTAMP_URL
if ([string]::IsNullOrWhiteSpace($Thumbprint) -or [string]::IsNullOrWhiteSpace($TimestampUrl)) {
    throw 'SAM_WINDOWS_CERTIFICATE_THUMBPRINT and SAM_WINDOWS_TIMESTAMP_URL are required.'
}
if ($Thumbprint -notmatch '^[a-fA-F0-9]{40}$' -or $TimestampUrl -notmatch '^https://') {
    throw 'Windows signing configuration is invalid; supply a certificate thumbprint and HTTPS timestamp URL.'
}
$Certificate = Get-Item -LiteralPath ('Cert:\CurrentUser\My\' + $Thumbprint)
if (-not $Certificate.HasPrivateKey) { throw 'Configured Windows signing certificate has no private key.' }
$SignTool = Find-SdkTool 'signtool.exe'
$Prefix = 'standroidsmissal-v' + $Version
$Attempt = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssfffZ') + '-' + [guid]::NewGuid().ToString('N')
$Target = [IO.Path]::GetFullPath((Join-Path $Root 'src-tauri\target\windows-native'))
$env:CARGO_TARGET_DIR = $Target
$AttemptDir = Join-Path $Target ($Prefix + '-windows-native-' + $Attempt)
New-Item -ItemType Directory -Path $AttemptDir | Out-Null
$NativeRelease = Join-Path $Target 'x86_64-pc-windows-msvc\release'
$ExePath = Join-Path $NativeRelease 'st-androids-missal.exe'
$ReceiptPath = Join-Path $Target ($Prefix + '-windows-native-metadata.json')

if ($Kind -eq 'MSI') {
    $ConfigPath = Join-Path $AttemptDir ($Prefix + '-windows-msi-config.json')
    Write-Json $ConfigPath @{ bundle = @{ targets = @('msi'); windows = @{
        webviewInstallMode = @{ type = 'offlineInstaller'; silent = $true }
        certificateThumbprint = $Thumbprint; timestampUrl = $TimestampUrl; tsp = $true
        wix = @{ version = $MsiVersion }
    } } }
    $BuildStarted = [DateTime]::UtcNow
    Invoke-Checked (Join-Path $Root 'node_modules\.bin\tauri.cmd') @('build', '--target', 'x86_64-pc-windows-msvc', '--bundles', 'msi', '--config', $ConfigPath, '--ci')
    Assert-X64 $ExePath
    $EmbeddedVersion = [Diagnostics.FileVersionInfo]::GetVersionInfo($ExePath).ProductVersion
    if ($EmbeddedVersion -cne $Version -and $EmbeddedVersion -cne ($Version + '.0')) {
        throw 'Native EXE product version differs from the canonical full version.'
    }
    $MsiFiles = @(Get-ChildItem -LiteralPath (Join-Path $NativeRelease 'bundle\msi') -Filter '*.msi' |
        Where-Object { $_.LastWriteTimeUtc -ge $BuildStarted })
    if ($MsiFiles.Count -ne 1) { throw 'Expected exactly one MSI from this native invocation.' }
    $MsiPath = $MsiFiles[0].FullName
    $Installer = New-Object -ComObject WindowsInstaller.Installer
    $Database = $Installer.OpenDatabase($MsiPath, 0)
    $View = $Database.OpenView('SELECT `Value` FROM `Property` WHERE `Property` = ''ProductVersion''')
    $View.Execute()
    $Record = $View.Fetch()
    if (-not $Record -or $Record.StringData(1) -cne $MsiVersion) { throw 'MSI embedded installer version is incorrect.' }
    $View.Close()
    Assert-Signature $ExePath
    Assert-Signature $MsiPath
    Save-Receipt @{ version = $Version; sourceHead = $SourceHead; msiVersion = $MsiVersion; msixVersion = $MsixVersion
        artifacts = @{ exe = (Get-Artifact $ExePath); msi = (Get-Artifact $MsiPath) }
        verification = @{ signatures = $true; storeRuntime = $false } }
} else {
    foreach ($Setting in @('SAM_MS_STORE_IDENTITY_NAME', 'SAM_MS_STORE_PUBLISHER')) {
        if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Setting))) {
            throw ($Setting + ' must match the existing Partner Center app identity.')
        }
    }
    if ($Certificate.Subject -cne $env:SAM_MS_STORE_PUBLISHER) { throw 'Signing certificate subject must match the MSIX publisher exactly.' }
    $Receipt = Read-Json $ReceiptPath
    if ($Receipt.version -cne $Version -or $Receipt.sourceHead -cne $SourceHead -or
        $Receipt.msiVersion -cne $MsiVersion -or $Receipt.msixVersion -cne $MsixVersion) {
        throw 'MSIX requires the native MSI stage receipt for this frozen release.'
    }
    $ExePath = Assert-ReceiptArtifact $Receipt.artifacts.exe
    $MsiPath = Assert-ReceiptArtifact $Receipt.artifacts.msi
    Assert-X64 $ExePath
    Assert-Signature $ExePath
    Assert-Signature $MsiPath
    Assert-PackageIdentity (Join-Path $Root 'Package.appxmanifest')
    $Stage = Join-Path $AttemptDir 'stage'
    New-Item -ItemType Directory -Path (Join-Path $Stage 'Assets') | Out-Null
    Copy-Item -LiteralPath $ExePath -Destination $Stage
    Copy-Item -LiteralPath (Join-Path $Root 'version.json') -Destination $Stage
    Copy-Item -LiteralPath (Join-Path $Root 'Package.appxmanifest') -Destination (Join-Path $Stage 'AppxManifest.xml')
    foreach ($Logo in @('StoreLogo', 'Square44x44Logo', 'Square150x150Logo', 'Square310x310Logo', 'Square71x71Logo')) {
        Copy-Item -LiteralPath (Join-Path $Root ('src-tauri\icons\' + $Logo + '.png')) -Destination (Join-Path $Stage 'Assets')
    }
    $MakeAppx = Find-SdkTool 'makeappx.exe'
    $Package = Join-Path $AttemptDir ($Prefix + '-windows-x64.msix')
    Invoke-Checked $MakeAppx @('pack', '/d', $Stage, '/p', $Package)
    Invoke-Checked $SignTool @('sign', '/sha1', $Thumbprint, '/fd', 'SHA256', '/tr', $TimestampUrl, '/td', 'SHA256', $Package)
    Assert-Signature $Package
    $Unpacked = Join-Path $AttemptDir 'verified-package'
    Invoke-Checked $MakeAppx @('unpack', '/p', $Package, '/d', $Unpacked)
    Assert-PackageIdentity (Join-Path $Unpacked 'AppxManifest.xml')
    if ((Read-Json (Join-Path $Unpacked 'version.json')).version -cne $Version -or
        (Get-FileHash -LiteralPath (Join-Path $Unpacked 'st-androids-missal.exe') -Algorithm SHA256).Hash -cne
        (Get-FileHash -LiteralPath $ExePath -Algorithm SHA256).Hash) {
        throw 'MSIX contents differ from the frozen native executable or full release version.'
    }
    $Output = Join-Path $Target ($Prefix + '-windows-x64.msix')
    if (Test-Path -LiteralPath $Output) { throw 'Refusing to overwrite an existing MSIX; preserve and reconcile the previous release attempt.' }
    Copy-Item -LiteralPath $Package -Destination $Output
    $Receipt.artifacts | Add-Member -NotePropertyName msix -NotePropertyValue (Get-Artifact $Output) -Force
    Save-Receipt $Receipt
}
Write-Host ('Native ' + $Kind + ' generated and package signatures checked for v' + $Version + '; Store acceptance/runtime verification remain unverified.')
