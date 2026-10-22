# Stabil surumler (geri donus noktalari)

Her klasor, belirli bir kaynak revizyonunun geri yukleme kopyasidir. `stable/` altindaki arsivler dogrudan deploy edilmez. Bir surumu geri yuklerken dosyalari repo kokune ayni goreli yollarla kopyalayin ve deploy oncesi test edin.

- `stable/surum-1-sifreli/` : Sifreli kisi verisi (ilk guvenli surum).
- `stable/surum-2-ozet-harita/` : Ozet paneli, acik/koyu tema, iliski haritasi.
- `stable/surum-3-harita-alt-bar/` : Kisiler yaninda IH sekmesi, sol ustte Ozet, ortada ekle.
- `stable/surum-4-mobil-ih/` : Tam ekran mobil IH, parmakla yakinlastirma.
- `stable/surum-5-ayarlar-menu/` : Alt bar sadece menu ve ekle.
- `stable/surum-6-yazi-duzeltme/` : Harita yazi duzeltmeleri; eski surumde bazi kayitlar duz metindi.
- `stable/surum-7-guncel-paket/` : 2026-10-22 tarihinde kaynak `main` commit `8ddee4be4dc8a8a9e779e6c3da4eab5e2e172334` icin tam proje snapshot'i; kaynak kod, otomasyon, testler ve belgeler dahildir. Test durumu ve bilinen sinirlar icin klasor icindeki `README.md` ve `AUDIT-REPORT.md` dosyalarina bakin.

**Geri yukleme:** Secilen surum klasorunun icerigini repo kokune goreli yollarini koruyarak kopyalayin. Canli ortama almadan once testleri ve Cloudflare staging kontrollerini calistirin.
