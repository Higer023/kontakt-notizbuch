# Stabil surumler (geri donus noktalari)

Her klasor, belirli bir zamanda calisan ve testi onaylanan surumun tam kopyasidir. Deploy'a dahil degildir.

- stable/surum-1-sifreli/ : Sifreli kisi verisi (ilk guvenli surum).
- stable/surum-2-ozet-harita/ : Ozet paneli, acik/koyu tema, iliski haritasi (ilk surum).
- stable/surum-3-harita-alt-bar/ : Kisiler yaninda IH sekmesi, sol ustte Ozet, ortada ekle butonu.
- stable/surum-4-mobil-ih/ : Tam ekran mobil IH, parmakla yakinlastirma, IH icinde alt bar menu.
- stable/surum-5-ayarlar-menu/ : Alt bar sadece hamburger (menu) ve ekle. Kisiler, IH, Ozet, Guvenlik, Ayarlar tek menude. Harita yazilari ust uste biniyordu.

Geri donmek icin: secilen klasordeki dosyalari repo kokune ayni yollarla kopyalayip commit atin.
Yollar: src/worker.js, public/*, schema.sql, wrangler.toml, scripts/hash-password.mjs.
