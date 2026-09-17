# Copia un post al portapapeles con el formato que respeta el editor de LinkedIn.
#
# Por que existe (Iker, 2026-09-17): el editor nuevo de LinkedIn se come los
# saltos de linea al pegar texto plano, y las rutas de rescate fallan cada una a
# su manera: Gmail duplica los blancos entre frases, Google Docs y Gmail se
# comen los emojis, y Notion convierte "1. " en una lista numerada.
#
# Este script se salta a todos: mete en el portapapeles HTML con un <p> por
# linea y un <p><br></p> por cada linea en blanco (lo que el editor de LinkedIn
# genera el mismo), con los emojis como texto. Deja tambien el texto plano por
# si el destino no lee HTML.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts\copiar-post.ps1 <fichero.txt>
#   ... -Modo br   -> un solo <p> con <br> (plan B si el modo por defecto falla)
param(
    [Parameter(Mandatory = $true)][string]$Fichero,
    [ValidateSet('p', 'br')][string]$Modo = 'p'
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Web

$texto = [System.IO.File]::ReadAllText((Resolve-Path $Fichero), [System.Text.Encoding]::UTF8)
$texto = $texto -replace "`r`n", "`n"
$texto = $texto.TrimEnd("`n")
$lineas = $texto -split "`n"

# Todo lo que no es ASCII va como entidad numerica (&#128680;), emojis incluidos:
# asi el HTML es ASCII puro y no depende de como decodifique el destino.
function Codificar([string]$s) {
    $sb = New-Object System.Text.StringBuilder
    for ($i = 0; $i -lt $s.Length; $i++) {
        $c = $s[$i]
        if ([char]::IsHighSurrogate($c) -and ($i + 1) -lt $s.Length) {
            [void]$sb.Append('&#' + [char]::ConvertToUtf32($c, $s[$i + 1]) + ';'); $i++
        } elseif ([int]$c -gt 127) { [void]$sb.Append('&#' + [int]$c + ';') }
        elseif ($c -eq '&') { [void]$sb.Append('&amp;') }
        elseif ($c -eq '<') { [void]$sb.Append('&lt;') }
        elseif ($c -eq '>') { [void]$sb.Append('&gt;') }
        else { [void]$sb.Append($c) }
    }
    $sb.ToString()
}

if ($Modo -eq 'p') {
    $cuerpo = ($lineas | ForEach-Object {
        if ($_.Trim() -eq '') { '<p><br></p>' }
        else { '<p>' + (Codificar $_) + '</p>' }
    }) -join ''
} else {
    $cuerpo = '<p>' + (($lineas | ForEach-Object { Codificar $_ }) -join '<br>') + '</p>'
}

# Formato CF_HTML: cabecera con los offsets en BYTES UTF-8.
$pre = '<html><body><!--StartFragment-->'
$post = '<!--EndFragment--></body></html>'
$plantilla = "Version:0.9`r`nStartHTML:{0:D10}`r`nEndHTML:{1:D10}`r`nStartFragment:{2:D10}`r`nEndFragment:{3:D10}`r`n"
$utf8 = [System.Text.Encoding]::UTF8
$lenCab = $utf8.GetByteCount(($plantilla -f 0, 0, 0, 0))
$startHtml = $lenCab
$startFrag = $startHtml + $utf8.GetByteCount($pre)
$endFrag = $startFrag + $utf8.GetByteCount($cuerpo)
$endHtml = $endFrag + $utf8.GetByteCount($post)
$cf = ($plantilla -f $startHtml, $endHtml, $startFrag, $endFrag) + $pre + $cuerpo + $post

$datos = New-Object System.Windows.Forms.DataObject
$bytes = $utf8.GetBytes($cf)
$datos.SetData('HTML Format', (New-Object System.IO.MemoryStream(, $bytes)))
$datos.SetData([System.Windows.Forms.DataFormats]::UnicodeText, ($lineas -join "`r`n"))
[System.Windows.Forms.Clipboard]::SetDataObject($datos, $true)

Write-Host ("Copiado al portapapeles: {0} lineas, modo {1}. Pega directo en LinkedIn con Ctrl+V." -f $lineas.Count, $Modo)
