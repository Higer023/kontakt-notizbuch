// Dil destegi: tr, en, de, ar. Ilk giriste tarayici diline gore secilir; sag ustten degistirilir,
// giris yapildiginda ayarlara tasinir. Ceviri anahtari Turkce kaynak metindir.
(function () {
  const LANGS = { tr: 'Türkçe', en: 'English', de: 'Deutsch', ar: 'العربية' };
  const DICT = {"en": {"+ Alan ekle": "+ Add field", "+ Hesap ekle": "+ Add account", "0 kisi secili": "0 contacts selected", "0 secili": "0 selected", "Acik oturumlar": "Open sessions", "Adresler": "Addresses", "Ay": "Month", "Ayak izleri": "Footprints", "Ayarlar": "Settings", "Ayrintili goster": "Show details", "Basarisiz": "Failed", "Bildirimler": "Notifications", "Bildirimleri ac": "Turn on notifications", "Birlestir": "Merge", "Bu cihaz disindaki oturumlari buradan kapatabilirsiniz.": "You can close sessions on other devices here.", "Bu cihaz haric tumunu kapat": "Close all except this device", "Bu hassas bir islem. Devam etmek icin sifrenizi ve konum izninizi onaylayin.": "This is a sensitive action. Confirm your password and location permission to continue.", "Bu kisi, onlarin:": "This person is their:", "Cikis yap": "Log out", "Cop kutusu": "Trash", "Cop kutusu (30 gun)": "Trash (30 days)", "Deneme": "Attempts", "Disa aktar (CSV, sifresiz)": "Export (CSV, unencrypted)", "Dogum": "Birth", "Dogum gunu bildirimlerini ac": "Enable birthday notifications", "Dogum gunu takvimi (.ics)": "Birthday calendar (.ics)", "Dogum yeri": "Place of birth", "E-posta": "Email", "Ek telefon, ozel tarih, hobi, kisa not... istediginiz bilgiyi ekleyin.": "Add extra phone, special dates, hobbies, short notes... any info you want.", "Engellenenler": "Blocked", "Engelli": "Blocked", "Etiket ekle": "Add tag", "Etiketler": "Tags", "Etiketleri goster": "Show tags", "Giris icin kasa parolasi ve ikinci dogrulama gerekir: parmak izi ya da kurtarma kodu.": "Login requires your vault password and a second factor: passkey or recovery code.", "Gorunum ve uygulama": "Appearance and app", "Gruba ata": "Assign to group", "Grup / sinif": "Group / class", "Gun": "Day", "Guvenlik": "Security", "Harita": "Map", "Harita ayarlari": "Map settings", "Haritayi kilitle": "Lock map", "Hesap ve guvenlik": "Account and security", "Iletisim": "Contact", "Iliski haritasi": "Relationship map", "Iliski turu": "Relationship type", "Iptal": "Cancel", "Isim *": "Name *", "Kapat": "Close", "Kaydet": "Save", "Kayitli parmak izlerini yonet": "Manage passkeys", "Kimlik": "Identity", "Kisi ice aktar (.vcf / Google .csv)": "Import contacts (.vcf / Google .csv)", "Kisi sec": "Select contact", "Kisiler": "Contacts", "Kisisel": "Personal", "Kurtarma kodu ile giris": "Log in with recovery code", "Kurtarma kodunu e-postala": "Email recovery code", "Menu": "Menu", "Meslek": "Occupation", "Nasil tanistik": "How we met", "Notlar": "Notes", "Okul": "School", "Onayla": "Confirm", "Ozel alanlar": "Custom fields", "Ozet": "Summary", "Parmak izi ekle (bu cihaz)": "Add passkey (this device)", "Parmak izi ile giris": "Log in with passkey", "Parmakla kaydir, iki parmakla buyut": "Swipe with one finger, pinch to zoom", "Parolayi yazdiktan sonra parmak izi veya kurtarma kodu ile dogrulayin.": "After entering your password, verify with a passkey or recovery code.", "Rehber": "Address book", "Sec": "Select", "Secilen kisiler, bu kisinin:": "Selected people are their:", "Secili kisi ile asagidaki kisiler arasinda tek seferde iliski kurulur.": "A relationship is created at once between the selected person and the people below.", "Sehir": "City", "Sehir alanina gore kisi konumlari. Harita karolari OpenStreetMap sunucularindan yuklenir.": "Contact locations by city. Map tiles load from OpenStreetMap servers.", "Sifrenizi tekrar girin": "Re-enter your password", "Silinen kisiler 30 gun saklanir, sonra kalici olarak silinir.": "Deleted contacts are kept for 30 days, then permanently removed.", "Sosyal medya": "Social media", "Soyisim": "Last name", "Takma ad": "Nickname", "Tam gorunum": "Full view", "Telefon": "Phone", "Tema degistir (acik / koyu)": "Switch theme (light / dark)", "Temizle": "Clear", "Test bildirimi gonder": "Send test notification", "Toplu iliski": "Bulk relationship", "Tum gruplar": "All groups", "Tumunu sec": "Select all", "Uygulama olarak yukle": "Install as app", "Uzaklastir": "Zoom out", "Vazgec": "Cancel", "Web sitesi": "Website", "Yakinlastir": "Zoom in", "Yasam ve okul": "Life and school", "Yedek ve disa aktarim": "Backup and export", "Yedekle (JSON, sifresiz)": "Back up (JSON, unencrypted)", "Yeni kisi": "New contact", "Yil": "Year", "Ara: isim, okul, grup, etiket": "Search: name, school, group, tag", "Kisi ekle": "Add contact", "Kullanici adi": "Username", "Sifre": "Password", "Harita menusu": "Map menu", "Hesabiniz yok mu? Hesap olusturun": "No account? Create one", "Parolamu unuttum (kurtarma kodu)": "Forgot password (recovery code)", "Hesap olustur": "Create account", "Her hesabin kendine ozel rehberi olur. Parola, parmak izi ve kurtarma kodu gerekir.": "Each account has its own address book. Password, passkey and recovery code are required.", "Kullanici adi (3-30 karakter)": "Username (3-30 characters)", "Parola (en az 10 karakter)": "Password (at least 10 characters)", "Parola tekrar": "Repeat password", "Parmak izi ile olustur": "Create with passkey", "Kurtarma kodunuz": "Your recovery code", "Parolanizi unutursaniz bu kodla hesabiniza girebilirsiniz. Kodu guvenli bir yere kaydedin. Bu kod bir daha gosterilmez.": "If you forget your password, you can use this code to sign in. Store it safely. This code will not be shown again.", "Kopyala": "Copy", "Kaydettim, devam et": "Saved, continue", "Kullanici adiniz ve kayit sirasinda aldiginiz kurtarma kodunu girin.": "Enter your username and the recovery code you received at sign-up.", "Kurtarma kodu (ABCDE-FGHJK-...)": "Recovery code (ABCDE-FGHJK-...)", "Giris yap": "Log in", "Once dogrulamayi tamamlayin.": "Please complete verification first.", "Parolalar eslesmiyor.": "Passwords do not match.", "Parola en az 10 karakter olmali.": "Password must be at least 10 characters.", "Bu tarayici parmak izi desteklemiyor.": "This browser does not support passkeys.", "Parmak izi bekleniyor...": "Waiting for passkey...", "Kayit iptal edildi.": "Registration cancelled.", "Kurtarma kodu hatali.": "Recovery code is incorrect.", "Konum izni isteniyor...": "Requesting location permission...", "Kurtarma kodunu kaydedin": "Save your recovery code", "Dil": "Language"}, "de": {"+ Alan ekle": "+ Feld hinzufügen", "+ Hesap ekle": "+ Konto hinzufügen", "0 kisi secili": "0 Kontakte ausgewählt", "0 secili": "0 ausgewählt", "Acik oturumlar": "Offene Sitzungen", "Adresler": "Adressen", "Ay": "Monat", "Ayak izleri": "Spuren", "Ayarlar": "Einstellungen", "Ayrintili goster": "Details anzeigen", "Basarisiz": "Fehlgeschlagen", "Bildirimler": "Benachrichtigungen", "Bildirimleri ac": "Benachrichtigungen aktivieren", "Birlestir": "Zusammenführen", "Bu cihaz disindaki oturumlari buradan kapatabilirsiniz.": "Sitzungen auf anderen Geräten können Sie hier beenden.", "Bu cihaz haric tumunu kapat": "Alle außer diesem Gerät beenden", "Bu hassas bir islem. Devam etmek icin sifrenizi ve konum izninizi onaylayin.": "Dies ist eine sensible Aktion. Bestätigen Sie Passwort und Standortfreigabe, um fortzufahren.", "Bu kisi, onlarin:": "Diese Person ist deren:", "Cikis yap": "Abmelden", "Cop kutusu": "Papierkorb", "Cop kutusu (30 gun)": "Papierkorb (30 Tage)", "Deneme": "Versuche", "Disa aktar (CSV, sifresiz)": "Exportieren (CSV, unverschlüsselt)", "Dogum": "Geburt", "Dogum gunu bildirimlerini ac": "Geburtstagsbenachrichtigungen aktivieren", "Dogum gunu takvimi (.ics)": "Geburtstagskalender (.ics)", "Dogum yeri": "Geburtsort", "E-posta": "E-Mail", "Ek telefon, ozel tarih, hobi, kisa not... istediginiz bilgiyi ekleyin.": "Zusätzliches Telefon, besondere Daten, Hobbys, kurze Notizen ... beliebige Informationen hinzufügen.", "Engellenenler": "Gesperrte", "Engelli": "Gesperrt", "Etiket ekle": "Tag hinzufügen", "Etiketler": "Tags", "Etiketleri goster": "Tags anzeigen", "Giris icin kasa parolasi ve ikinci dogrulama gerekir: parmak izi ya da kurtarma kodu.": "Für die Anmeldung sind Tresorpasswort und ein zweiter Faktor nötig: Passkey oder Wiederherstellungscode.", "Gorunum ve uygulama": "Darstellung und App", "Gruba ata": "Gruppe zuweisen", "Grup / sinif": "Gruppe / Klasse", "Gun": "Tag", "Guvenlik": "Sicherheit", "Harita": "Karte", "Harita ayarlari": "Karteneinstellungen", "Haritayi kilitle": "Karte sperren", "Hesap ve guvenlik": "Konto und Sicherheit", "Iletisim": "Kontakt", "Iliski haritasi": "Beziehungskarte", "Iliski turu": "Beziehungstyp", "Iptal": "Abbrechen", "Isim *": "Name *", "Kapat": "Schließen", "Kaydet": "Speichern", "Kayitli parmak izlerini yonet": "Passkeys verwalten", "Kimlik": "Identität", "Kisi ice aktar (.vcf / Google .csv)": "Kontakte importieren (.vcf / Google .csv)", "Kisi sec": "Kontakt auswählen", "Kisiler": "Kontakte", "Kisisel": "Persönlich", "Kurtarma kodu ile giris": "Anmeldung mit Wiederherstellungscode", "Kurtarma kodunu e-postala": "Wiederherstellungscode per E-Mail", "Menu": "Menü", "Meslek": "Beruf", "Nasil tanistik": "Wie wir uns kennengelernt haben", "Notlar": "Notizen", "Okul": "Schule", "Onayla": "Bestätigen", "Ozel alanlar": "Benutzerdefinierte Felder", "Ozet": "Übersicht", "Parmak izi ekle (bu cihaz)": "Passkey hinzufügen (dieses Gerät)", "Parmak izi ile giris": "Anmeldung mit Passkey", "Parmakla kaydir, iki parmakla buyut": "Mit einem Finger wischen, zum Zoomen zwei Finger", "Parolayi yazdiktan sonra parmak izi veya kurtarma kodu ile dogrulayin.": "Nach Eingabe des Passworts mit Passkey oder Wiederherstellungscode bestätigen.", "Rehber": "Adressbuch", "Sec": "Wählen", "Secilen kisiler, bu kisinin:": "Ausgewählte Personen sind deren:", "Secili kisi ile asagidaki kisiler arasinda tek seferde iliski kurulur.": "Zwischen der ausgewählten Person und den unten stehenden wird auf einmal eine Beziehung erstellt.", "Sehir": "Stadt", "Sehir alanina gore kisi konumlari. Harita karolari OpenStreetMap sunucularindan yuklenir.": "Kontaktstandorte nach Stadt. Kartenkacheln werden von OpenStreetMap-Servern geladen.", "Sifrenizi tekrar girin": "Passwort erneut eingeben", "Silinen kisiler 30 gun saklanir, sonra kalici olarak silinir.": "Gelöschte Kontakte werden 30 Tage aufbewahrt und danach endgültig entfernt.", "Sosyal medya": "Soziale Medien", "Soyisim": "Nachname", "Takma ad": "Spitzname", "Tam gorunum": "Vollansicht", "Telefon": "Telefon", "Tema degistir (acik / koyu)": "Design wechseln (hell / dunkel)", "Temizle": "Leeren", "Test bildirimi gonder": "Testbenachrichtigung senden", "Toplu iliski": "Massenbeziehung", "Tum gruplar": "Alle Gruppen", "Tumunu sec": "Alle auswählen", "Uygulama olarak yukle": "Als App installieren", "Uzaklastir": "Verkleinern", "Vazgec": "Abbrechen", "Web sitesi": "Webseite", "Yakinlastir": "Vergrößern", "Yasam ve okul": "Leben und Schule", "Yedek ve disa aktarim": "Sicherung und Export", "Yedekle (JSON, sifresiz)": "Sichern (JSON, unverschlüsselt)", "Yeni kisi": "Neuer Kontakt", "Yil": "Jahr", "Ara: isim, okul, grup, etiket": "Suche: Name, Schule, Gruppe, Tag", "Kisi ekle": "Kontakt hinzufügen", "Kullanici adi": "Benutzername", "Sifre": "Passwort", "Harita menusu": "Kartenmenü", "Hesabiniz yok mu? Hesap olusturun": "Noch kein Konto? Konto erstellen", "Parolamu unuttum (kurtarma kodu)": "Passwort vergessen (Wiederherstellungscode)", "Hesap olustur": "Konto erstellen", "Her hesabin kendine ozel rehberi olur. Parola, parmak izi ve kurtarma kodu gerekir.": "Jedes Konto hat ein eigenes Adressbuch. Passwort, Passkey und Wiederherstellungscode sind erforderlich.", "Kullanici adi (3-30 karakter)": "Benutzername (3–30 Zeichen)", "Parola (en az 10 karakter)": "Passwort (mindestens 10 Zeichen)", "Parola tekrar": "Passwort wiederholen", "Parmak izi ile olustur": "Mit Passkey erstellen", "Kurtarma kodunuz": "Ihr Wiederherstellungscode", "Parolanizi unutursaniz bu kodla hesabiniza girebilirsiniz. Kodu guvenli bir yere kaydedin. Bu kod bir daha gosterilmez.": "Wenn Sie Ihr Passwort vergessen, können Sie sich mit diesem Code anmelden. Bewahren Sie ihn sicher auf. Dieser Code wird nicht erneut angezeigt.", "Kopyala": "Kopieren", "Kaydettim, devam et": "Gespeichert, weiter", "Kullanici adiniz ve kayit sirasinda aldiginiz kurtarma kodunu girin.": "Geben Sie Ihren Benutzernamen und den bei der Registrierung erhaltenen Wiederherstellungscode ein.", "Kurtarma kodu (ABCDE-FGHJK-...)": "Wiederherstellungscode (ABCDE-FGHJK-...)", "Giris yap": "Anmelden", "Once dogrulamayi tamamlayin.": "Bitte schließen Sie zuerst die Prüfung ab.", "Parolalar eslesmiyor.": "Passwörter stimmen nicht überein.", "Parola en az 10 karakter olmali.": "Das Passwort muss mindestens 10 Zeichen haben.", "Bu tarayici parmak izi desteklemiyor.": "Dieser Browser unterstützt keine Passkeys.", "Parmak izi bekleniyor...": "Warte auf Passkey ...", "Kayit iptal edildi.": "Registrierung abgebrochen.", "Kurtarma kodu hatali.": "Wiederherstellungscode ist falsch.", "Konum izni isteniyor...": "Standortfreigabe wird angefordert ...", "Kurtarma kodunu kaydedin": "Wiederherstellungscode speichern", "Dil": "Sprache"}, "ar": {"+ Alan ekle": "+ إضافة حقل", "+ Hesap ekle": "+ إضافة حساب", "0 kisi secili": "تم تحديد 0 جهة اتصال", "0 secili": "تم تحديد 0", "Acik oturumlar": "الجلسات المفتوحة", "Adresler": "العناوين", "Ay": "الشهر", "Ayak izleri": "آثار الدخول", "Ayarlar": "الإعدادات", "Ayrintili goster": "عرض التفاصيل", "Basarisiz": "فشل", "Bildirimler": "الإشعارات", "Bildirimleri ac": "تفعيل الإشعارات", "Birlestir": "دمج", "Bu cihaz disindaki oturumlari buradan kapatabilirsiniz.": "يمكنك إنهاء الجلسات على الأجهزة الأخرى من هنا.", "Bu cihaz haric tumunu kapat": "إغلاق الكل ما عدا هذا الجهاز", "Bu hassas bir islem. Devam etmek icin sifrenizi ve konum izninizi onaylayin.": "هذا إجراء حساس. أكّد كلمة المرور وإذن الموقع للمتابعة.", "Bu kisi, onlarin:": "هذا الشخص بالنسبة لهم:", "Cikis yap": "تسجيل الخروج", "Cop kutusu": "سلة المهملات", "Cop kutusu (30 gun)": "سلة المهملات (30 يومًا)", "Deneme": "المحاولات", "Disa aktar (CSV, sifresiz)": "تصدير (CSV، غير مشفّر)", "Dogum": "الميلاد", "Dogum gunu bildirimlerini ac": "تفعيل إشعارات أعياد الميلاد", "Dogum gunu takvimi (.ics)": "تقويم أعياد الميلاد (.ics)", "Dogum yeri": "مكان الميلاد", "E-posta": "البريد الإلكتروني", "Ek telefon, ozel tarih, hobi, kisa not... istediginiz bilgiyi ekleyin.": "أضف هاتفًا إضافيًا أو تواريخ خاصة أو هوايات أو ملاحظات قصيرة... أي معلومات تريدها.", "Engellenenler": "المحظورون", "Engelli": "محظور", "Etiket ekle": "إضافة وسم", "Etiketler": "الوسوم", "Etiketleri goster": "عرض الوسوم", "Giris icin kasa parolasi ve ikinci dogrulama gerekir: parmak izi ya da kurtarma kodu.": "تسجيل الدخول يتطلب كلمة مرور الخزنة وعاملًا ثانيًا: مفتاح مرور أو رمز استرداد.", "Gorunum ve uygulama": "المظهر والتطبيق", "Gruba ata": "تعيين إلى مجموعة", "Grup / sinif": "المجموعة / الصف", "Gun": "اليوم", "Guvenlik": "الأمان", "Harita": "الخريطة", "Harita ayarlari": "إعدادات الخريطة", "Haritayi kilitle": "قفل الخريطة", "Hesap ve guvenlik": "الحساب والأمان", "Iletisim": "الاتصال", "Iliski haritasi": "خريطة العلاقات", "Iliski turu": "نوع العلاقة", "Iptal": "إلغاء", "Isim *": "الاسم *", "Kapat": "إغلاق", "Kaydet": "حفظ", "Kayitli parmak izlerini yonet": "إدارة مفاتيح المرور", "Kimlik": "الهوية", "Kisi ice aktar (.vcf / Google .csv)": "استيراد جهات الاتصال (.vcf / Google .csv)", "Kisi sec": "اختيار جهة اتصال", "Kisiler": "جهات الاتصال", "Kisisel": "شخصي", "Kurtarma kodu ile giris": "تسجيل الدخول برمز الاسترداد", "Kurtarma kodunu e-postala": "إرسال رمز الاسترداد بالبريد", "Menu": "القائمة", "Meslek": "المهنة", "Nasil tanistik": "كيف تعرفنا", "Notlar": "ملاحظات", "Okul": "المدرسة", "Onayla": "تأكيد", "Ozel alanlar": "حقول مخصصة", "Ozet": "الملخص", "Parmak izi ekle (bu cihaz)": "إضافة مفتاح مرور (هذا الجهاز)", "Parmak izi ile giris": "تسجيل الدخول بمفتاح المرور", "Parmakla kaydir, iki parmakla buyut": "اسحب بإصبع واحد، وقرّب بإصبعين للتكبير", "Parolayi yazdiktan sonra parmak izi veya kurtarma kodu ile dogrulayin.": "بعد إدخال كلمة المرور، تحقق بمفتاح المرور أو رمز الاسترداد.", "Rehber": "دفتر العناوين", "Sec": "اختيار", "Secilen kisiler, bu kisinin:": "الأشخاص المحددون بالنسبة له:", "Secili kisi ile asagidaki kisiler arasinda tek seferde iliski kurulur.": "سيتم إنشاء علاقة دفعة واحدة بين الشخص المحدد والأشخاص أدناه.", "Sehir": "المدينة", "Sehir alanina gore kisi konumlari. Harita karolari OpenStreetMap sunucularindan yuklenir.": "مواقع جهات الاتصال حسب المدينة. تُحمَّل بلاطات الخريطة من خوادم OpenStreetMap.", "Sifrenizi tekrar girin": "أعد إدخال كلمة المرور", "Silinen kisiler 30 gun saklanir, sonra kalici olarak silinir.": "تُحفظ جهات الاتصال المحذوفة 30 يومًا ثم تُحذف نهائيًا.", "Sosyal medya": "وسائل التواصل الاجتماعي", "Soyisim": "اسم العائلة", "Takma ad": "اللقب", "Tam gorunum": "عرض كامل", "Telefon": "الهاتف", "Tema degistir (acik / koyu)": "تبديل السمة (فاتح / داكن)", "Temizle": "مسح", "Test bildirimi gonder": "إرسال إشعار تجريبي", "Toplu iliski": "علاقات جماعية", "Tum gruplar": "كل المجموعات", "Tumunu sec": "تحديد الكل", "Uygulama olarak yukle": "تثبيت كتطبيق", "Uzaklastir": "تصغير", "Vazgec": "إلغاء", "Web sitesi": "الموقع الإلكتروني", "Yakinlastir": "تكبير", "Yasam ve okul": "الحياة والمدرسة", "Yedek ve disa aktarim": "النسخ الاحتياطي والتصدير", "Yedekle (JSON, sifresiz)": "نسخ احتياطي (JSON، غير مشفّر)", "Yeni kisi": "جهة اتصال جديدة", "Yil": "السنة", "Ara: isim, okul, grup, etiket": "بحث: الاسم، المدرسة، المجموعة، الوسم", "Kisi ekle": "إضافة جهة اتصال", "Kullanici adi": "اسم المستخدم", "Sifre": "كلمة المرور", "Harita menusu": "قائمة الخريطة", "Hesabiniz yok mu? Hesap olusturun": "ليس لديك حساب؟ أنشئ حسابًا", "Parolamu unuttum (kurtarma kodu)": "نسيت كلمة المرور (رمز الاسترداد)", "Hesap olustur": "إنشاء حساب", "Her hesabin kendine ozel rehberi olur. Parola, parmak izi ve kurtarma kodu gerekir.": "لكل حساب دفتر عناوين خاص به. مطلوب كلمة المرور ومفتاح المرور ورمز الاسترداد.", "Kullanici adi (3-30 karakter)": "اسم المستخدم (من 3 إلى 30 حرفًا)", "Parola (en az 10 karakter)": "كلمة المرور (10 أحرف على الأقل)", "Parola tekrar": "أعد كتابة كلمة المرور", "Parmak izi ile olustur": "إنشاء بمفتاح المرور", "Kurtarma kodunuz": "رمز الاسترداد الخاص بك", "Parolanizi unutursaniz bu kodla hesabiniza girebilirsiniz. Kodu guvenli bir yere kaydedin. Bu kod bir daha gosterilmez.": "إذا نسيت كلمة المرور يمكنك الدخول بهذا الرمز. احفظه في مكان آمن. لن يُعرض هذا الرمز مرة أخرى.", "Kopyala": "نسخ", "Kaydettim, devam et": "حفظته، متابعة", "Kullanici adiniz ve kayit sirasinda aldiginiz kurtarma kodunu girin.": "أدخل اسم المستخدم ورمز الاسترداد الذي حصلت عليه عند التسجيل.", "Kurtarma kodu (ABCDE-FGHJK-...)": "رمز الاسترداد (ABCDE-FGHJK-...)", "Giris yap": "تسجيل الدخول", "Once dogrulamayi tamamlayin.": "يرجى إكمال التحقق أولًا.", "Parolalar eslesmiyor.": "كلمتا المرور غير متطابقتين.", "Parola en az 10 karakter olmali.": "يجب أن تكون كلمة المرور 10 أحرف على الأقل.", "Bu tarayici parmak izi desteklemiyor.": "هذا المتصفح لا يدعم مفاتيح المرور.", "Parmak izi bekleniyor...": "بانتظار مفتاح المرور...", "Kayit iptal edildi.": "تم إلغاء التسجيل.", "Kurtarma kodu hatali.": "رمز الاسترداد غير صحيح.", "Konum izni isteniyor...": "جارٍ طلب إذن الموقع...", "Kurtarma kodunu kaydedin": "احفظ رمز الاسترداد", "Dil": "اللغة"}};
  const KEY = 'rehber-lang';
  const ATTRS = ['placeholder', 'aria-label', 'title'];
  const textOrig = new WeakMap();
  const attrOrig = new WeakMap();

  function detect() {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) { /* gizli mod: kayit yok */ }
    if (saved && LANGS[saved]) return saved;
    for (const l of (navigator.languages || [navigator.language || ''])) {
      const c = String(l).slice(0, 2).toLowerCase();
      if (LANGS[c]) return c;
    }
    return 'en';
  }

  let current = detect();

  function tr(src) {
    if (current === 'tr') return src;
    const t = DICT[current] && DICT[current][src];
    return t || src;
  }

  function translateTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const parent = node.parentNode;
      if (!parent || /^(SCRIPT|STYLE|TEXTAREA)$/.test(parent.nodeName)) continue;
      if (!textOrig.has(node)) textOrig.set(node, node.nodeValue);
      const src = textOrig.get(node);
      const trimmed = src.trim();
      if (!trimmed) continue;
      const out = src.replace(trimmed, tr(trimmed));
      if (node.nodeValue !== out) node.nodeValue = out;
    }
  }

  function translateAttrs(root) {
    const els = root.querySelectorAll ? root.querySelectorAll('[placeholder],[aria-label],[title]') : [];
    for (const el of els) {
      if (!attrOrig.has(el)) attrOrig.set(el, {});
      const saved = attrOrig.get(el);
      for (const a of ATTRS) {
        if (!el.hasAttribute(a)) continue;
        if (!(a in saved)) saved[a] = el.getAttribute(a);
        const v = tr(saved[a]);
        if (el.getAttribute(a) !== v) el.setAttribute(a, v);
      }
    }
  }

  let observer = null;
  function apply() {
    if (observer) observer.disconnect();
    document.documentElement.lang = current;
    document.documentElement.dir = current === 'ar' ? 'rtl' : 'ltr';
    translateTextNodes(document.body);
    translateAttrs(document.body);
    syncSwitchers();
    if (observer) observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  function makeSelect(id) {
    const sel = document.createElement('select');
    sel.id = id;
    sel.setAttribute('aria-label', 'Dil / Language');
    for (const [code, name] of Object.entries(LANGS)) {
      const o = document.createElement('option');
      o.value = code;
      o.textContent = name;
      sel.appendChild(o);
    }
    sel.addEventListener('change', () => setLang(sel.value));
    return sel;
  }

  let topSwitch = null;
  let settingsSwitch = null;

  function ensureSwitchers() {
    if (!topSwitch) {
      topSwitch = makeSelect('lang-switch-top');
      topSwitch.style.position = 'fixed';
      topSwitch.style.top = '12px';
      topSwitch.style.insetInlineEnd = '12px';
      topSwitch.style.zIndex = '60';
      topSwitch.style.width = 'auto';
      topSwitch.style.padding = '6px 10px';
      topSwitch.style.borderRadius = '12px';
      topSwitch.style.background = 'rgba(255,255,255,0.06)';
      topSwitch.style.border = '1px solid rgba(255,255,255,0.14)';
      topSwitch.style.color = 'inherit';
      document.body.appendChild(topSwitch);
    }
    const settings = document.getElementById('settings-dialog');
    if (settings && !settingsSwitch) {
      const wrap = document.createElement('div');
      wrap.style.margin = '8px 0';
      const label = document.createElement('label');
      label.textContent = tr('Dil');
      settingsSwitch = makeSelect('lang-switch-settings');
      label.appendChild(settingsSwitch);
      wrap.appendChild(label);
      const body = settings.querySelector('.sheet-body') || settings;
      body.insertBefore(wrap, body.firstChild);
    }
  }

  function syncSwitchers() {
    ensureSwitchers();
    if (topSwitch) topSwitch.value = current;
    if (settingsSwitch) settingsSwitch.value = current;
    const loginVisible = !document.getElementById('login-view')?.classList.contains('hidden');
    if (topSwitch) topSwitch.style.display = loginVisible ? '' : 'none';
  }

  function setLang(code) {
    if (!LANGS[code]) return;
    current = code;
    try { localStorage.setItem(KEY, code); } catch (e) { /* kayit yapilamadi */ }
    apply();
  }

  function start() {
    let scheduled = false;
    observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; apply(); });
    });
    apply();
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');
    const vis = new MutationObserver(() => syncSwitchers());
    if (loginView) vis.observe(loginView, { attributes: true, attributeFilter: ['class'] });
    if (appView) vis.observe(appView, { attributes: true, attributeFilter: ['class'] });
  }

  window.i18n = { setLang, current: () => current, LANGS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
