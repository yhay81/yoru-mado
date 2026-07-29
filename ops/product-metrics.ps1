[CmdletBinding()]
param(
    [switch]$Local
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$SqlPath = Join-Path $PSScriptRoot "product-metrics.sql"
$Wrangler = Join-Path $RepoRoot "node_modules\.bin\wrangler.cmd"
$Target = if ($Local) { "--local" } else { "--remote" }
$Sql = (Get-Content $SqlPath) -join " "

$Output = & $Wrangler d1 execute yoru-mado $Target --json --command $Sql
if ($LASTEXITCODE -ne 0) {
    throw "D1 metrics query failed with exit code $LASTEXITCODE"
}

$Payload = ($Output -join [Environment]::NewLine) | ConvertFrom-Json
$Row = $Payload[0].results[0]
if (-not $Row) {
    throw "D1 metrics query returned no result"
}

function Get-Percent {
    param(
        [int]$Numerator,
        [int]$Denominator
    )

    if ($Denominator -eq 0) { return $null }
    return [Math]::Round(($Numerator / $Denominator) * 100, 1)
}

$Users = [int]$Row.users
$Organizers = [int]$Row.organizers
$WithViews = [int]$Row.organizers_with_views
$WithCompletion = [int]$Row.organizers_with_completion
$Returned = [int]$Row.returned_users

[ordered]@{
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    service = "yoru-mado"
    environment = if ($Local) { "local" } else { "production" }
    funnel = [ordered]@{
        users = $Users
        organizers = $Organizers
        events_created = [int]$Row.events_created
        active_events = [int]$Row.active_events
        viewers = [int]$Row.viewers
        events_viewed = [int]$Row.events_viewed
        organizers_with_views = $WithViews
        outbound_users = [int]$Row.outbound_users
        events_with_outbound = [int]$Row.events_with_outbound
        calendar_users = [int]$Row.calendar_users
        sharing_users = [int]$Row.sharing_users
        confirmed_users = [int]$Row.confirmed_users
        organizers_with_completion = $WithCompletion
        returned_users = $Returned
        users_7d = [int]$Row.users_7d
        organizers_7d = [int]$Row.organizers_7d
        events_7d = [int]$Row.events_7d
        completed_users_7d = [int]$Row.completed_users_7d
    }
    rates = [ordered]@{
        exposure_to_creator_percent = Get-Percent $Organizers $Users
        value_creation_percent = Get-Percent $WithViews $Organizers
        completion_percent = Get-Percent $WithCompletion $WithViews
        return_percent = Get-Percent $Returned $WithCompletion
    }
    safety = [ordered]@{
        reports = [int]$Row.reports
        hidden_events = [int]$Row.hidden_events
    }
} | ConvertTo-Json -Depth 4
