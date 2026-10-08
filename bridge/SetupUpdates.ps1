param([string]$ExtensionDirectory='', [string]$Repository='')
$ErrorActionPreference='Stop'
$taskBridgeRoot=Split-Path -Parent $MyInvocation.MyCommand.Path
$taskInteractive=-not $PSBoundParameters.ContainsKey('ExtensionDirectory')
if($taskInteractive){
 Add-Type -AssemblyName System.Windows.Forms
 $taskPicker=New-Object System.Windows.Forms.FolderBrowserDialog
 $taskPicker.Description='Selecciona la carpeta de Sebams que contiene manifest.json (la misma que cargaste en Chrome).'
 $taskPicker.ShowNewFolderButton=$false
 try{if($taskPicker.ShowDialog() -ne [Windows.Forms.DialogResult]::OK){Write-Host 'Configuracion cancelada.';exit 0};$ExtensionDirectory=$taskPicker.SelectedPath}finally{$taskPicker.Dispose()}
 $Repository=Read-Host 'Repositorio publico de GitHub (usuario/repositorio o enlace). Deja vacio para versiones locales'
}
$taskTarget=(Resolve-Path -LiteralPath $ExtensionDirectory).Path
$taskRelease=Join-Path $taskBridgeRoot 'releases/stable'
$taskManifest=Get-Content -LiteralPath (Join-Path $taskTarget 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if($taskManifest.manifest_version -ne 3 -or $taskManifest.name -ne ('Sebams '+[char]0x2014+' A little space to focus')){throw 'Esa carpeta no contiene la extension Sebams.'}
if((Get-Item -LiteralPath $taskTarget).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Elige una carpeta normal, no un enlace.'}
$taskRepo=$Repository.Trim().TrimEnd('/').Replace('https://github.com/','') -replace '\.git$',''
if($taskRepo -and $taskRepo -notmatch '^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?/[A-Za-z0-9][A-Za-z0-9._-]{0,99}$'){throw 'Usa un repositorio publico: usuario/repositorio o https://github.com/usuario/repositorio.'}
$taskTargetPrefix=$taskTarget.TrimEnd('\')+'\'
$taskReleasePrefix=[IO.Path]::GetFullPath($taskRelease).TrimEnd('\')+'\'
if($taskReleasePrefix.StartsWith($taskTargetPrefix,[StringComparison]::OrdinalIgnoreCase) -or $taskTargetPrefix.StartsWith($taskReleasePrefix,[StringComparison]::OrdinalIgnoreCase)){throw 'Las carpetas de la extension y Bridge deben estar separadas.'}
if(-not(Test-Path -LiteralPath (Join-Path $taskRelease 'release.json'))){throw 'Falta la version local incluida. Extrae el ZIP completo de Sebams Bridge.'}
$taskData=Join-Path $taskBridgeRoot 'data';New-Item -ItemType Directory -Path $taskData -Force | Out-Null
$taskConfig=@{extensionDirectory=$taskTarget;releaseDirectory=[IO.Path]::GetFullPath($taskRelease);githubRepository=$taskRepo}|ConvertTo-Json
[IO.File]::WriteAllText((Join-Path $taskData 'updates.json'),$taskConfig,[Text.UTF8Encoding]::new($false))
Write-Host 'Actualizaciones configuradas para esta PC. Abre Start.cmd, conecta Bridge en Sebams y ve a Settings > Updates.'
if($taskRepo){Write-Host 'Fuente compartida de GitHub guardada.'}else{Write-Host 'Fuente local guardada. Puedes agregar GitHub despues desde Settings > Updates.'}
