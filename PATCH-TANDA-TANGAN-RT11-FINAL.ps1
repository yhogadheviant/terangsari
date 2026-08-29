$path = ".\app\panel\laporan\page.tsx"

$text = Get-Content $path -Raw

$startMarker = '        {/* FOOTER */}'
$start = $text.IndexOf($startMarker)

if ($start -lt 0) {
  Write-Host "Marker FOOTER tidak ditemukan." -ForegroundColor Red
  exit 1
}

$sectionStart = $text.IndexOf('<section className="hidden print:block">', $start)

if ($sectionStart -lt 0) {
  Write-Host "Section FOOTER tidak ditemukan." -ForegroundColor Red
  exit 1
}

$sectionEnd = $text.IndexOf('</section>', $sectionStart)

if ($sectionEnd -lt 0) {
  Write-Host "Penutup section FOOTER tidak ditemukan." -ForegroundColor Red
  exit 1
}

$sectionEnd += '</section>'.Length

$newFooter = @'
        {/* FOOTER / TANDA TANGAN */}

        <section
          className="hidden print:block"
          style={{
            pageBreakInside: "avoid",
            breakInside: "avoid",
            marginTop: "40px",
            width: "100%",
          }}
        >
          <div
            style={{
              textAlign: "center",
              marginBottom: "28px",
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
              <div style={{ fontWeight: "bold", marginTop: "4px" }}>
                BENDAHARA
              </div>
              <div style={{ height: "85px" }}></div>
              <div
                style={{
                  fontWeight: "bold",
                  textDecoration: "underline",
                }}
              >
                Andriyanto
              </div>
            </div>

            <div style={{ width: "30%" }}>
              <div>Mengetahui,</div>
              <div style={{ fontWeight: "bold", marginTop: "4px" }}>
                SEKRETARIS
              </div>
              <div style={{ height: "85px" }}></div>
              <div
                style={{
                  fontWeight: "bold",
                  textDecoration: "underline",
                }}
              >
                Wawan Setiawan
              </div>
            </div>

            <div style={{ width: "30%" }}>
              <div>Mengetahui,</div>
              <div style={{ fontWeight: "bold", marginTop: "4px" }}>
                KETUA RT 011
              </div>
              <div style={{ height: "85px" }}></div>
              <div
                style={{
                  fontWeight: "bold",
                  textDecoration: "underline",
                }}
              >
                Ikhlas Wahyu
              </div>
            </div>
          </div>
        </section>
'@

$backup = "$path.bak-sebelum-tanda-tangan-final"
Copy-Item $path $backup -Force

$text = $text.Substring(0, $start) + $newFooter + $text.Substring($sectionEnd)

Set-Content -Path $path -Value $text -Encoding UTF8

Write-Host ""
Write-Host "BERHASIL." -ForegroundColor Green
Write-Host "Footer CETAK sekarang 3 kolom:"
Write-Host "  Bendahara  : Andriyanto"
Write-Host "  Sekretaris : Wawan Setiawan"
Write-Host "  Ketua RT   : Ikhlas Wahyu"
Write-Host ""
Write-Host "Backup dibuat:"
Write-Host "  $backup"
Write-Host ""
Write-Host "Restart Next.js:"
Write-Host "  Ctrl+C"
Write-Host "  npm run dev"
