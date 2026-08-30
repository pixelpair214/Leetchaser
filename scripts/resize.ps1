Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("C:\Users\Shivanshu\Downloads\easyappicon-icons-1788082865442\android\playstore-icon.png")

foreach ($size in @(16, 32, 48, 96, 128)) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $graph = [System.Drawing.Graphics]::FromImage($bmp)
    $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graph.DrawImage($img, 0, 0, $size, $size)
    $bmp.Save("c:\Users\Shivanshu\Documents\LeetChaser\public\icon\$size.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $graph.Dispose()
    $bmp.Dispose()
}
$img.Dispose()
Write-Host "Icons successfully resized and replaced!"
