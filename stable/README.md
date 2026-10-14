# Stabil surumler (geri donus noktalari)

Her klasor, belirli bir zamanda calisan ve testi onaylanan surumun tam kopyasidir.
Deploy'a dahil degildir.

- stable/surum-1-sifreli/ : Sifreli kisi verisi (ilk guvenli surum). Ozet paneli, tema ve harita yok.
- stable/surum-2-ozet-harita/ : Ozet paneli, acik/koyu tema, iliski haritasi (ilk surum).

Geri donmek icin: secilen klasordeki dosyalari repo kokune ayni yollarla kopyalayip commit atin.
Yollar: src/worker.js, public/*, schema.sql, wrangler.toml, scripts/hash-password.mjs.
