# Ortaca Pet Kuaför — MONO LINK Sadakat (ayrı proje)

**Kural:** 1, 2, 3. tamamlanan kuaför ziyaretleri birer damga kazandırır. 4. ziyarette personel %30 indirimi uygular ve `İndirimi kullan` işlemiyle kartı 0/3'e döndürür. İndirim 4. ziyaret dışında kullanılamaz. Kampanyanın hangi hizmetleri kapsadığı ve başka indirimlerle birleşip birleşmediği işletmece belirlenmelidir.

## Kurulum

1. Yeni ve **ayrı** GitHub deposu açıp bu klasördeki `package.json`, `server.js`, `public/index.html` dosyalarını yükleyin. Eski Ortaca Pet sitesinin deposuna yüklemeyin.
2. Kalıcı PostgreSQL veritabanı oluşturun. Render üzerinde web service (Node, `npm install`, `npm start`) kurun. **Static Site seçmeyin.** Render'ın ücretsiz web servisinin yerel dosyaları kalıcı değildir; bu yüzden PostgreSQL zorunlu.
3. Ortam değişkenlerini Render web servisine **gizli** ekleyin: `DATABASE_URL` (PostgreSQL bağlantı URL'si), `SESSION_SECRET` (en az 32 rastgele karakter), `ADMIN_PASSWORD` (en az 12 karakter). Bunları GitHub'a koymayın. `PGSSL=disable` yalnızca SSL gerektirmeyen özel ağ bağlantısında kullanılabilir.
4. `/ ?yonetim` (boşluk olmadan `/?yonetim`) adresinden personel girişi yapın. Kart oluşturun; çıkan `/?kart=...` bağlantısını müşteriye gönderin veya NFC etikete yazın.
5. Personel her kuaför ziyaretini panelden onaylar. 3 onaydan sonra 4. ziyarette indirim uygulanır ve `İndirimi kullan` butonuna basılır.

## Güvenlik ve operasyon

- Kart bağlantıları gizli ve tahmin edilmesi güç token içerir; bağlantıya sahip herkes karttaki ad ve ziyaret bilgisini görebilir. Müşteriye sadece kendi bağlantısını verin; halka açık NFC standa bireysel kart bağlantısı yazmayın. Standda genel kayıt/tanıtım sayfası açılabilir.
- Yönetici şifresi ve veritabanı URL'si sadece ortam değişkenlerinde olmalı. HTTPS zorunlu. Yönetici girişi HttpOnly, Secure, SameSite cookie kullanır. Giriş denemelerinde temel hız sınırı vardır; üretimde ek IP/WAF sınırı önerilir.
- Ad/takma ad ve evcil hayvan adı dışında kişisel veri toplanmaz. Canlı kullanımdan önce KVKK aydınlatması, veri saklama/silme politikası ve müşteri talebiyle silme akışı tamamlanmalıdır. Bu sürümde silme, yedekleme, çoklu personel rolleri ve müşteri doğrulaması bulunmuyor.
- Kampanya işlemleri `events` tablosunda zaman damgalı tutulur. Veritabanı yedekleme ayarlayın.
- Bu paket gerçek backend içerir ancak henüz canlıya yüklenmedi veya uçtan uca test edilmedi.
