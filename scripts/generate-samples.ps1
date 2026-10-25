# PowerShell script to generate sample PDF, WAV/MP3, and EPUB files
$ErrorActionPreference = 'Stop'

# 1. Sample PDF
$pdfContent = @"
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 230 >>
stream
BT
/F1 22 Tf
80 700 Td
(PRIVATE DOCS - TAI LIEU MAU) Tj
/F1 13 Tf
0 -40 Td
(Chao mung ban den voi kho tai lieu ca nhan Private Docs.) Tj
0 -25 Td
(Trinh xem PDF tich hop san cho phep doc truc tiep tren trinh duyet.) Tj
0 -25 Td
(Ban co the tai ve hoac mo toan man hinh de xem ro hon.) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000224 00000 n 
0000000305 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
588
%%EOF
"@

[System.IO.File]::WriteAllBytes("files/Sach-va-Tai-lieu/Huong-dan-su-dung.pdf", [System.Text.Encoding]::ASCII.GetBytes($pdfContent))
Write-Host "Created sample PDF: Huong-dan-su-dung.pdf"

# 2. Sample Audio (WAV file with a pleasant 4-second chime arpeggio)
$sampleRate = 22050
$duration = 3.5 # seconds
$numSamples = [int]($sampleRate * $duration)
$wavStream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter($wavStream)

# RIFF Header
$writer.Write([System.Text.Encoding]::ASCII.GetBytes("RIFF"))
$writer.Write([int](36 + $numSamples * 2))
$writer.Write([System.Text.Encoding]::ASCII.GetBytes("WAVE"))

# fmt chunk
$writer.Write([System.Text.Encoding]::ASCII.GetBytes("fmt "))
$writer.Write([int]16) # Subchunk1Size (16 for PCM)
$writer.Write([int16]1) # AudioFormat (1 = PCM)
$writer.Write([int16]1) # NumChannels (1 = Mono)
$writer.Write([int]$sampleRate)
$writer.Write([int]($sampleRate * 2)) # ByteRate
$writer.Write([int16]2) # BlockAlign
$writer.Write([int16]16) # BitsPerSample

# data chunk
$writer.Write([System.Text.Encoding]::ASCII.GetBytes("data"))
$writer.Write([int]($numSamples * 2))

# Generate simple musical chime notes (C5, E5, G5, C6)
$frequencies = @(523.25, 659.25, 783.99, 1046.50)
$noteLen = $numSamples / 4

for ($i = 0; $i -lt $numSamples; $i++) {
    $noteIndex = [math]::Min(3, [int]($i / $noteLen))
    $freq = $frequencies[$noteIndex]
    $t = $i / $sampleRate
    $subT = ($i % $noteLen) / $sampleRate
    $decay = [math]::Exp(-$subT * 4.0)
    $sampleVal = [math]::Sin(2 * [math]::PI * $freq * $t) * $decay * 0.5
    $shortVal = [int16]($sampleVal * 32767)
    $writer.Write($shortVal)
}

$writer.Flush()
[System.IO.File]::WriteAllBytes("files/Audiobooks-va-Podcast/Mau-Am-Thanh-Khoi-Dong.mp3", $wavStream.ToArray())
Write-Host "Created sample Audio: Mau-Am-Thanh-Khoi-Dong.mp3"

# 3. Sample EPUB
# Create temporary folder for epub structure
$tempEpubDir = Join-Path $env:TEMP "sample_epub_$([Guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path "$tempEpubDir/META-INF" -Force | Out-Null
New-Item -ItemType Directory -Path "$tempEpubDir/OEBPS" -Force | Out-Null

[System.IO.File]::WriteAllText("$tempEpubDir/mimetype", "application/epub+zip", [System.Text.Encoding]::ASCII)

$containerXml = @"
<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>
"@
[System.IO.File]::WriteAllText("$tempEpubDir/META-INF/container.xml", $containerXml, [System.Text.Encoding]::UTF8)

$contentOpf = @"
<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>Sách Mẫu - Private Docs</dc:title>
        <dc:creator>Private Docs Vault</dc:creator>
        <dc:identifier id="BookID">urn:uuid:12345678-1234-5678-1234-567812345678</dc:identifier>
        <dc:language>vi</dc:language>
    </metadata>
    <manifest>
        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
        <item id="chap1" href="chap1.xhtml" media-type="application/xhtml+xml"/>
        <item id="chap2" href="chap2.xhtml" media-type="application/xhtml+xml"/>
    </manifest>
    <spine toc="ncx">
        <itemref idref="chap1"/>
        <itemref idref="chap2"/>
    </spine>
</package>
"@
[System.IO.File]::WriteAllText("$tempEpubDir/OEBPS/content.opf", $contentOpf, [System.Text.Encoding]::UTF8)

$tocNcx = @"
<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head>
        <meta name="dtb:uid" content="urn:uuid:12345678-1234-5678-1234-567812345678"/>
    </head>
    <docTitle><text>Sách Mẫu - Private Docs</text></docTitle>
    <navMap>
        <navPoint id="navPoint-1" playOrder="1">
            <navLabel><text>Chương 1: Giới thiệu</text></navLabel>
            <content src="chap1.xhtml"/>
        </navPoint>
        <navPoint id="navPoint-2" playOrder="2">
            <navLabel><text>Chương 2: Tính năng nổi bật</text></navLabel>
            <content src="chap2.xhtml"/>
        </navPoint>
    </navMap>
</ncx>
"@
[System.IO.File]::WriteAllText("$tempEpubDir/OEBPS/toc.ncx", $tocNcx, [System.Text.Encoding]::UTF8)

$chap1Html = @"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>Chương 1: Giới thiệu</title>
    <style type="text/css">
        body { font-family: sans-serif; line-height: 1.6; padding: 20px; }
        h1 { color: #2563eb; }
    </style>
</head>
<body>
    <h1>Chương 1: Giới thiệu ứng dụng</h1>
    <p>Chào mừng bạn đã mở thành công sách điện tử EPUB mẫu trong trình đọc tích hợp của <strong>Private Docs</strong>.</p>
    <p>Trình đọc này hỗ trợ chuyển chương, đổi cỡ chữ, đổi màu nền (sáng, tối, sepia) và điều hướng dễ dàng.</p>
</body>
</html>
"@
[System.IO.File]::WriteAllText("$tempEpubDir/OEBPS/chap1.xhtml", $chap1Html, [System.Text.Encoding]::UTF8)

$chap2Html = @"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>Chương 2: Tính năng nổi bật</title>
    <style type="text/css">
        body { font-family: sans-serif; line-height: 1.6; padding: 20px; }
        h1 { color: #10b981; }
    </style>
</head>
<body>
    <h1>Chương 2: Tính năng nổi bật</h1>
    <ul>
        <li><strong>Bảo mật mật khẩu:</strong> Sử dụng mã hóa băm SHA-256 bảo vệ trước người lạ.</li>
        <li><strong>Đọc PDF mượt mà:</strong> Hỗ trợ phóng to, tải xuống, mở tab mới.</li>
        <li><strong>Máy phát audio:</strong> Thanh phát nhạc cố định, tua 10 giây, chỉnh tốc độ.</li>
        <li><strong>Trình đọc EPUB:</strong> Lật trang, xem mục lục, tuỳ chỉnh phong cách đọc.</li>
    </ul>
</body>
</html>
"@
[System.IO.File]::WriteAllText("$tempEpubDir/OEBPS/chap2.xhtml", $chap2Html, [System.Text.Encoding]::UTF8)

# Zip folder into .epub using System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$destEpub = "files/Ebooks-EPUB/Sach-Mau-Huong-Dan.epub"
if (Test-Path $destEpub) { Remove-Item -Force $destEpub }
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempEpubDir, $destEpub)
Remove-Item -Recurse -Force $tempEpubDir
Write-Host "Created sample EPUB: Sach-Mau-Huong-Dan.epub"
