$path = ".\app\panel\laporan\page.tsx"
$backup = "$path.bak-tanda-tangan"

if (!(Test-Path $path)) {
  Write-Host "page.tsx tidak ditemukan." -ForegroundColor Red
  exit 1
}

# Kembalikan file ke kondisi sebelum PATCH V2 yang merusak JSX.
if (Test-Path $backup) {
  Copy-Item $backup $path -Force
  Write-Host "Backup valid dipulihkan dari:" $backup -ForegroundColor Green
} else {
  Write-Host "Backup tidak ditemukan. Tidak aman melakukan recovery otomatis." -ForegroundColor Red
  exit 1
}

$text = Get-Content $path -Raw

# Cari semua <section>...</section>, lalu pilih section terakhir
# yang memang mengandung teks tanda tangan.
$matches = [regex]::Matches(
  $text,
  '(?s)<section\b.*?</section>'
)

$target = $null

for ($i = $matches.Count - 1; $i -ge 0; $i--) {
  $candidate = $matches[$i].Value

  if (
    $candidate -match 'Bendahara' -and
    $candidate -match 'Ketua RT'
  ) {
    $target = $matches[$i]
    break
  }
}

if ($null -eq $target) {
  Write-Host "Section tanda tangan tidak ditemukan setelah recovery." -ForegroundColor Red
  Write-Host "File sudah dipulihkan dari backup dan tidak dimodifikasi lagi."
  exit 1
}

$newSection = @'
<section
  className="hidden print:block mt-10"
  style={{
    pageBreakInside: "avoid",
    breakInside: "avoid",
    width: "100%",
  }}
>
  <div
    style={{
      textAlign: "center",
      marginBottom: "28px",
      fontSize: "12px",
    }}
  >
    Karawang, __________________ 2026
  </div>

  <div
    style={{
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      width: "100%",
      textAlign: "center",
    }}
  >
    <div style={{ width: "30%" }}>
      <div>Dibuat oleh,</div>
      <div style={{ fontWeight: 700, marginTop: "4px" }}>
        BENDAHARA
      </div>
      <div style={{ height: "85px" }} />
      <div style={{ fontWeight: 700, textDecoration: "underline" }}>
        Andriyanto
      </div>
    </div>

    <div style={{ width: "30%" }}>
      <div>Mengetahui,</div>
      <div style={{ fontWeight: 700, marginTop: "4px" }}>
        SEKRETARIS
      </div>
      <div style={{ height: "85px" }} />
      <div style={{ fontWeight: 700, textDecoration: "underline" }}>
        Wawan Setiawan
      </div>
    </div>

    <div style={{ width: "30%" }}>
      <div>Mengetahui,</div>
      <div style={{ fontWeight: 700, marginTop: "4px" }}>
        KETUA RT 011
      </div>
      <div style={{ height: "85px" }} />
      <div style={{ fontWeight: 700, textDecoration: "underline" }}>
        Ikhlas Wahyu
      </div>
    </div>
  </div>
</section>
'@

$before = $text.Substring(0, $target.Index)
$after = $text.Substring($target.Index + $target.Length)

$text = $before + $newSection + $after

Set-Content -Path $path -Value $text -Encoding UTF8

Write-Host ""
Write-Host "RECOVERY + PATCH BERHASIL." -ForegroundColor Green
Write-Host ""
Write-Host "Bendahara  : Andriyanto"
Write-Host "Sekretaris : Wawan Setiawan"
Write-Host "Ketua RT   : Ikhlas Wahyu"
Write-Host ""
Write-Host "Sekarang jalankan:"
Write-Host "  npm run dev"
Write-Host ""
Write-Host "Jika server masih berjalan, Ctrl+C dahulu."
