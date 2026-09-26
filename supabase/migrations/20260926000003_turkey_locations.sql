-- Turkey cities and districts seed
-- Source: data/tr-il-ilce/il-ilce-list.json

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('ADANA', 1, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ALADAĞ', true
FROM public.cities
WHERE plate_code = 1
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'CEYHAN', true
FROM public.cities
WHERE plate_code = 1
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇUKUROVA', true
FROM public.cities
WHERE plate_code = 1
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'FEKE', true
FROM public.cities
WHERE plate_code = 1
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İMAMOĞLU', true
FROM public.cities
WHERE plate_code = 1
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARAİSALI', true
FROM public.cities
WHERE plate_code = 1
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARATAŞ', true
FROM public.cities
WHERE plate_code = 1
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KOZAN', true
FROM public.cities
WHERE plate_code = 1
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'POZANTI', true
FROM public.cities
WHERE plate_code = 1
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SAİMBEYLİ', true
FROM public.cities
WHERE plate_code = 1
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SARIÇAM', true
FROM public.cities
WHERE plate_code = 1
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SEYHAN', true
FROM public.cities
WHERE plate_code = 1
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TUFANBEYLİ', true
FROM public.cities
WHERE plate_code = 1
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YUMURTALIK', true
FROM public.cities
WHERE plate_code = 1
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YÜREĞİR', true
FROM public.cities
WHERE plate_code = 1
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('ADIYAMAN', 2, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BESNİ', true
FROM public.cities
WHERE plate_code = 2
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇELİKHAN', true
FROM public.cities
WHERE plate_code = 2
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GERGER', true
FROM public.cities
WHERE plate_code = 2
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÖLBAŞI', true
FROM public.cities
WHERE plate_code = 2
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KAHTA', true
FROM public.cities
WHERE plate_code = 2
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 2
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SAMSAT', true
FROM public.cities
WHERE plate_code = 2
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SİNCİK', true
FROM public.cities
WHERE plate_code = 2
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TUT', true
FROM public.cities
WHERE plate_code = 2
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('AFYONKARAHİSAR', 3, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAŞMAKÇI', true
FROM public.cities
WHERE plate_code = 3
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAYAT', true
FROM public.cities
WHERE plate_code = 3
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BOLVADİN', true
FROM public.cities
WHERE plate_code = 3
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇAY', true
FROM public.cities
WHERE plate_code = 3
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇOBANLAR', true
FROM public.cities
WHERE plate_code = 3
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DAZKIRI', true
FROM public.cities
WHERE plate_code = 3
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DİNAR', true
FROM public.cities
WHERE plate_code = 3
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'EMİRDAĞ', true
FROM public.cities
WHERE plate_code = 3
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'EVCİLER', true
FROM public.cities
WHERE plate_code = 3
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HOCALAR', true
FROM public.cities
WHERE plate_code = 3
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İHSANİYE', true
FROM public.cities
WHERE plate_code = 3
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İSCEHİSAR', true
FROM public.cities
WHERE plate_code = 3
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KIZILÖREN', true
FROM public.cities
WHERE plate_code = 3
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 3
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SANDIKLI', true
FROM public.cities
WHERE plate_code = 3
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SİNANPAŞA', true
FROM public.cities
WHERE plate_code = 3
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SULTANDAĞI', true
FROM public.cities
WHERE plate_code = 3
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ŞUHUT', true
FROM public.cities
WHERE plate_code = 3
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('AĞRI', 4, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DİYADİN', true
FROM public.cities
WHERE plate_code = 4
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DOĞUBAYAZIT', true
FROM public.cities
WHERE plate_code = 4
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ELEŞKİRT', true
FROM public.cities
WHERE plate_code = 4
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HAMUR', true
FROM public.cities
WHERE plate_code = 4
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 4
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PATNOS', true
FROM public.cities
WHERE plate_code = 4
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TAŞLIÇAY', true
FROM public.cities
WHERE plate_code = 4
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TUTAK', true
FROM public.cities
WHERE plate_code = 4
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('AKSARAY', 68, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AĞAÇÖREN', true
FROM public.cities
WHERE plate_code = 68
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ESKİL', true
FROM public.cities
WHERE plate_code = 68
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜLAĞAÇ', true
FROM public.cities
WHERE plate_code = 68
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜZELYURT', true
FROM public.cities
WHERE plate_code = 68
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 68
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ORTAKÖY', true
FROM public.cities
WHERE plate_code = 68
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SARIYAHŞİ', true
FROM public.cities
WHERE plate_code = 68
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SULTANHANI', true
FROM public.cities
WHERE plate_code = 68
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('AMASYA', 5, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÖYNÜCEK', true
FROM public.cities
WHERE plate_code = 5
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜMÜŞHACIKÖY', true
FROM public.cities
WHERE plate_code = 5
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HAMAMÖZÜ', true
FROM public.cities
WHERE plate_code = 5
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 5
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERZİFON', true
FROM public.cities
WHERE plate_code = 5
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SULUOVA', true
FROM public.cities
WHERE plate_code = 5
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TAŞOVA', true
FROM public.cities
WHERE plate_code = 5
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('ANKARA', 6, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AKYURT', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ALTINDAĞ', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AYAŞ', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BALA', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BEYPAZARI', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇAMLIDERE', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇANKAYA', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇUBUK', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ELMADAĞ', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ETİMESGUT', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'EVREN', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÖLBAŞI', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜDÜL', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HAYMANA', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KAHRAMANKAZAN', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KALECİK', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KEÇİÖREN', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KIZILCAHAMAM', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MAMAK', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'NALLIHAN', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'POLATLI', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PURSAKLAR', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SİNCAN', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ŞEREFLİKOÇHİSAR', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YENİMAHALLE', true
FROM public.cities
WHERE plate_code = 6
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('ANTALYA', 7, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AKSEKİ', true
FROM public.cities
WHERE plate_code = 7
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AKSU', true
FROM public.cities
WHERE plate_code = 7
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ALANYA', true
FROM public.cities
WHERE plate_code = 7
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DEMRE', true
FROM public.cities
WHERE plate_code = 7
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DÖŞEMEALTI', true
FROM public.cities
WHERE plate_code = 7
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ELMALI', true
FROM public.cities
WHERE plate_code = 7
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'FİNİKE', true
FROM public.cities
WHERE plate_code = 7
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GAZİPAŞA', true
FROM public.cities
WHERE plate_code = 7
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜNDOĞMUŞ', true
FROM public.cities
WHERE plate_code = 7
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İBRADI', true
FROM public.cities
WHERE plate_code = 7
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KAŞ', true
FROM public.cities
WHERE plate_code = 7
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KEMER', true
FROM public.cities
WHERE plate_code = 7
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KEPEZ', true
FROM public.cities
WHERE plate_code = 7
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KONYAALTI', true
FROM public.cities
WHERE plate_code = 7
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KORKUTELİ', true
FROM public.cities
WHERE plate_code = 7
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KUMLUCA', true
FROM public.cities
WHERE plate_code = 7
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MANAVGAT', true
FROM public.cities
WHERE plate_code = 7
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MURATPAŞA', true
FROM public.cities
WHERE plate_code = 7
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SERİK', true
FROM public.cities
WHERE plate_code = 7
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('ARDAHAN', 75, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇILDIR', true
FROM public.cities
WHERE plate_code = 75
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DAMAL', true
FROM public.cities
WHERE plate_code = 75
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÖLE', true
FROM public.cities
WHERE plate_code = 75
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HANAK', true
FROM public.cities
WHERE plate_code = 75
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 75
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'POSOF', true
FROM public.cities
WHERE plate_code = 75
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('ARTVİN', 8, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ARDANUÇ', true
FROM public.cities
WHERE plate_code = 8
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ARHAVİ', true
FROM public.cities
WHERE plate_code = 8
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BORÇKA', true
FROM public.cities
WHERE plate_code = 8
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HOPA', true
FROM public.cities
WHERE plate_code = 8
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KEMALPAŞA', true
FROM public.cities
WHERE plate_code = 8
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 8
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MURGUL', true
FROM public.cities
WHERE plate_code = 8
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ŞAVŞAT', true
FROM public.cities
WHERE plate_code = 8
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YUSUFELİ', true
FROM public.cities
WHERE plate_code = 8
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('AYDIN', 9, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BOZDOĞAN', true
FROM public.cities
WHERE plate_code = 9
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BUHARKENT', true
FROM public.cities
WHERE plate_code = 9
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇİNE', true
FROM public.cities
WHERE plate_code = 9
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DİDİM', true
FROM public.cities
WHERE plate_code = 9
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'EFELER', true
FROM public.cities
WHERE plate_code = 9
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GERMENCİK', true
FROM public.cities
WHERE plate_code = 9
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İNCİRLİOVA', true
FROM public.cities
WHERE plate_code = 9
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARACASU', true
FROM public.cities
WHERE plate_code = 9
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARPUZLU', true
FROM public.cities
WHERE plate_code = 9
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KOÇARLI', true
FROM public.cities
WHERE plate_code = 9
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KÖŞK', true
FROM public.cities
WHERE plate_code = 9
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KUŞADASI', true
FROM public.cities
WHERE plate_code = 9
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KUYUCAK', true
FROM public.cities
WHERE plate_code = 9
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'NAZİLLİ', true
FROM public.cities
WHERE plate_code = 9
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SÖKE', true
FROM public.cities
WHERE plate_code = 9
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SULTANHİSAR', true
FROM public.cities
WHERE plate_code = 9
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YENİPAZAR', true
FROM public.cities
WHERE plate_code = 9
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('BALIKESİR', 10, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ALTIEYLÜL', true
FROM public.cities
WHERE plate_code = 10
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AYVALIK', true
FROM public.cities
WHERE plate_code = 10
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BALYA', true
FROM public.cities
WHERE plate_code = 10
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BANDIRMA', true
FROM public.cities
WHERE plate_code = 10
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BİGADİÇ', true
FROM public.cities
WHERE plate_code = 10
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BURHANİYE', true
FROM public.cities
WHERE plate_code = 10
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DURSUNBEY', true
FROM public.cities
WHERE plate_code = 10
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'EDREMİT', true
FROM public.cities
WHERE plate_code = 10
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ERDEK', true
FROM public.cities
WHERE plate_code = 10
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÖMEÇ', true
FROM public.cities
WHERE plate_code = 10
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÖNEN', true
FROM public.cities
WHERE plate_code = 10
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HAVRAN', true
FROM public.cities
WHERE plate_code = 10
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İVRİNDİ', true
FROM public.cities
WHERE plate_code = 10
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARESİ', true
FROM public.cities
WHERE plate_code = 10
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KEPSUT', true
FROM public.cities
WHERE plate_code = 10
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MANYAS', true
FROM public.cities
WHERE plate_code = 10
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MARMARA', true
FROM public.cities
WHERE plate_code = 10
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SAVAŞTEPE', true
FROM public.cities
WHERE plate_code = 10
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SINDIRGI', true
FROM public.cities
WHERE plate_code = 10
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SUSURLUK', true
FROM public.cities
WHERE plate_code = 10
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('BARTIN', 74, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AMASRA', true
FROM public.cities
WHERE plate_code = 74
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KURUCAŞİLE', true
FROM public.cities
WHERE plate_code = 74
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 74
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ULUS', true
FROM public.cities
WHERE plate_code = 74
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('BATMAN', 72, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BEŞİRİ', true
FROM public.cities
WHERE plate_code = 72
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GERCÜŞ', true
FROM public.cities
WHERE plate_code = 72
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HASANKEYF', true
FROM public.cities
WHERE plate_code = 72
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KOZLUK', true
FROM public.cities
WHERE plate_code = 72
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 72
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SASON', true
FROM public.cities
WHERE plate_code = 72
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('BAYBURT', 69, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AYDINTEPE', true
FROM public.cities
WHERE plate_code = 69
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DEMİRÖZÜ', true
FROM public.cities
WHERE plate_code = 69
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 69
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('BİLECİK', 11, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BOZÜYÜK', true
FROM public.cities
WHERE plate_code = 11
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÖLPAZARI', true
FROM public.cities
WHERE plate_code = 11
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İNHİSAR', true
FROM public.cities
WHERE plate_code = 11
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 11
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'OSMANELİ', true
FROM public.cities
WHERE plate_code = 11
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PAZARYERİ', true
FROM public.cities
WHERE plate_code = 11
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SÖĞÜT', true
FROM public.cities
WHERE plate_code = 11
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YENİPAZAR', true
FROM public.cities
WHERE plate_code = 11
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('BİNGÖL', 12, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ADAKLI', true
FROM public.cities
WHERE plate_code = 12
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GENÇ', true
FROM public.cities
WHERE plate_code = 12
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARLIOVA', true
FROM public.cities
WHERE plate_code = 12
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KİĞI', true
FROM public.cities
WHERE plate_code = 12
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 12
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SOLHAN', true
FROM public.cities
WHERE plate_code = 12
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YAYLADERE', true
FROM public.cities
WHERE plate_code = 12
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YEDİSU', true
FROM public.cities
WHERE plate_code = 12
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('BİTLİS', 13, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ADİLCEVAZ', true
FROM public.cities
WHERE plate_code = 13
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AHLAT', true
FROM public.cities
WHERE plate_code = 13
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜROYMAK', true
FROM public.cities
WHERE plate_code = 13
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HİZAN', true
FROM public.cities
WHERE plate_code = 13
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 13
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MUTKİ', true
FROM public.cities
WHERE plate_code = 13
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TATVAN', true
FROM public.cities
WHERE plate_code = 13
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('BOLU', 14, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DÖRTDİVAN', true
FROM public.cities
WHERE plate_code = 14
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GEREDE', true
FROM public.cities
WHERE plate_code = 14
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÖYNÜK', true
FROM public.cities
WHERE plate_code = 14
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KIBRISCIK', true
FROM public.cities
WHERE plate_code = 14
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MENGEN', true
FROM public.cities
WHERE plate_code = 14
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 14
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MUDURNU', true
FROM public.cities
WHERE plate_code = 14
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SEBEN', true
FROM public.cities
WHERE plate_code = 14
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YENİÇAĞA', true
FROM public.cities
WHERE plate_code = 14
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('BURDUR', 15, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AĞLASUN', true
FROM public.cities
WHERE plate_code = 15
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ALTINYAYLA', true
FROM public.cities
WHERE plate_code = 15
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BUCAK', true
FROM public.cities
WHERE plate_code = 15
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇAVDIR', true
FROM public.cities
WHERE plate_code = 15
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇELTİKÇİ', true
FROM public.cities
WHERE plate_code = 15
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÖLHİSAR', true
FROM public.cities
WHERE plate_code = 15
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARAMANLI', true
FROM public.cities
WHERE plate_code = 15
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KEMER', true
FROM public.cities
WHERE plate_code = 15
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 15
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TEFENNİ', true
FROM public.cities
WHERE plate_code = 15
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YEŞİLOVA', true
FROM public.cities
WHERE plate_code = 15
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('BURSA', 16, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BÜYÜKORHAN', true
FROM public.cities
WHERE plate_code = 16
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GEMLİK', true
FROM public.cities
WHERE plate_code = 16
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜRSU', true
FROM public.cities
WHERE plate_code = 16
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HARMANCIK', true
FROM public.cities
WHERE plate_code = 16
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İNEGÖL', true
FROM public.cities
WHERE plate_code = 16
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İZNİK', true
FROM public.cities
WHERE plate_code = 16
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARACABEY', true
FROM public.cities
WHERE plate_code = 16
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KELES', true
FROM public.cities
WHERE plate_code = 16
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KESTEL', true
FROM public.cities
WHERE plate_code = 16
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MUDANYA', true
FROM public.cities
WHERE plate_code = 16
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MUSTAFAKEMALPAŞA', true
FROM public.cities
WHERE plate_code = 16
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'NİLÜFER', true
FROM public.cities
WHERE plate_code = 16
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ORHANELİ', true
FROM public.cities
WHERE plate_code = 16
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ORHANGAZİ', true
FROM public.cities
WHERE plate_code = 16
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'OSMANGAZİ', true
FROM public.cities
WHERE plate_code = 16
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YENİŞEHİR', true
FROM public.cities
WHERE plate_code = 16
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YILDIRIM', true
FROM public.cities
WHERE plate_code = 16
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('ÇANAKKALE', 17, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AYVACIK', true
FROM public.cities
WHERE plate_code = 17
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAYRAMİÇ', true
FROM public.cities
WHERE plate_code = 17
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BİGA', true
FROM public.cities
WHERE plate_code = 17
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BOZCAADA', true
FROM public.cities
WHERE plate_code = 17
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇAN', true
FROM public.cities
WHERE plate_code = 17
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ECEABAT', true
FROM public.cities
WHERE plate_code = 17
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'EZİNE', true
FROM public.cities
WHERE plate_code = 17
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GELİBOLU', true
FROM public.cities
WHERE plate_code = 17
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÖKÇEADA', true
FROM public.cities
WHERE plate_code = 17
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'LAPSEKİ', true
FROM public.cities
WHERE plate_code = 17
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 17
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YENİCE', true
FROM public.cities
WHERE plate_code = 17
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('ÇANKIRI', 18, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ATKARACALAR', true
FROM public.cities
WHERE plate_code = 18
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAYRAMÖREN', true
FROM public.cities
WHERE plate_code = 18
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇERKEŞ', true
FROM public.cities
WHERE plate_code = 18
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ELDİVAN', true
FROM public.cities
WHERE plate_code = 18
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ILGAZ', true
FROM public.cities
WHERE plate_code = 18
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KIZILIRMAK', true
FROM public.cities
WHERE plate_code = 18
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KORGUN', true
FROM public.cities
WHERE plate_code = 18
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KURŞUNLU', true
FROM public.cities
WHERE plate_code = 18
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 18
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ORTA', true
FROM public.cities
WHERE plate_code = 18
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ŞABANÖZÜ', true
FROM public.cities
WHERE plate_code = 18
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YAPRAKLI', true
FROM public.cities
WHERE plate_code = 18
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('ÇORUM', 19, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ALACA', true
FROM public.cities
WHERE plate_code = 19
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAYAT', true
FROM public.cities
WHERE plate_code = 19
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BOĞAZKALE', true
FROM public.cities
WHERE plate_code = 19
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DODURGA', true
FROM public.cities
WHERE plate_code = 19
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İSKİLİP', true
FROM public.cities
WHERE plate_code = 19
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARGI', true
FROM public.cities
WHERE plate_code = 19
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'LAÇİN', true
FROM public.cities
WHERE plate_code = 19
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MECİTÖZÜ', true
FROM public.cities
WHERE plate_code = 19
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 19
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'OĞUZLAR', true
FROM public.cities
WHERE plate_code = 19
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ORTAKÖY', true
FROM public.cities
WHERE plate_code = 19
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'OSMANCIK', true
FROM public.cities
WHERE plate_code = 19
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SUNGURLU', true
FROM public.cities
WHERE plate_code = 19
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'UĞURLUDAĞ', true
FROM public.cities
WHERE plate_code = 19
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('DENİZLİ', 20, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ACIPAYAM', true
FROM public.cities
WHERE plate_code = 20
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BABADAĞ', true
FROM public.cities
WHERE plate_code = 20
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAKLAN', true
FROM public.cities
WHERE plate_code = 20
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BEKİLLİ', true
FROM public.cities
WHERE plate_code = 20
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BEYAĞAÇ', true
FROM public.cities
WHERE plate_code = 20
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BOZKURT', true
FROM public.cities
WHERE plate_code = 20
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BULDAN', true
FROM public.cities
WHERE plate_code = 20
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇAL', true
FROM public.cities
WHERE plate_code = 20
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇAMELİ', true
FROM public.cities
WHERE plate_code = 20
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇARDAK', true
FROM public.cities
WHERE plate_code = 20
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇİVRİL', true
FROM public.cities
WHERE plate_code = 20
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜNEY', true
FROM public.cities
WHERE plate_code = 20
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HONAZ', true
FROM public.cities
WHERE plate_code = 20
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KALE', true
FROM public.cities
WHERE plate_code = 20
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZEFENDİ', true
FROM public.cities
WHERE plate_code = 20
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PAMUKKALE', true
FROM public.cities
WHERE plate_code = 20
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SARAYKÖY', true
FROM public.cities
WHERE plate_code = 20
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SERİNHİSAR', true
FROM public.cities
WHERE plate_code = 20
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TAVAS', true
FROM public.cities
WHERE plate_code = 20
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('DİYARBAKIR', 21, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAĞLAR', true
FROM public.cities
WHERE plate_code = 21
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BİSMİL', true
FROM public.cities
WHERE plate_code = 21
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇERMİK', true
FROM public.cities
WHERE plate_code = 21
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇINAR', true
FROM public.cities
WHERE plate_code = 21
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇÜNGÜŞ', true
FROM public.cities
WHERE plate_code = 21
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DİCLE', true
FROM public.cities
WHERE plate_code = 21
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'EĞİL', true
FROM public.cities
WHERE plate_code = 21
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ERGANİ', true
FROM public.cities
WHERE plate_code = 21
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HANİ', true
FROM public.cities
WHERE plate_code = 21
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HAZRO', true
FROM public.cities
WHERE plate_code = 21
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KAYAPINAR', true
FROM public.cities
WHERE plate_code = 21
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KOCAKÖY', true
FROM public.cities
WHERE plate_code = 21
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KULP', true
FROM public.cities
WHERE plate_code = 21
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'LİCE', true
FROM public.cities
WHERE plate_code = 21
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SİLVAN', true
FROM public.cities
WHERE plate_code = 21
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SUR', true
FROM public.cities
WHERE plate_code = 21
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YENİŞEHİR', true
FROM public.cities
WHERE plate_code = 21
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('DÜZCE', 81, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AKÇAKOCA', true
FROM public.cities
WHERE plate_code = 81
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'CUMAYERİ', true
FROM public.cities
WHERE plate_code = 81
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇİLİMLİ', true
FROM public.cities
WHERE plate_code = 81
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÖLYAKA', true
FROM public.cities
WHERE plate_code = 81
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜMÜŞOVA', true
FROM public.cities
WHERE plate_code = 81
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KAYNAŞLI', true
FROM public.cities
WHERE plate_code = 81
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 81
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YIĞILCA', true
FROM public.cities
WHERE plate_code = 81
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('EDİRNE', 22, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ENEZ', true
FROM public.cities
WHERE plate_code = 22
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HAVSA', true
FROM public.cities
WHERE plate_code = 22
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İPSALA', true
FROM public.cities
WHERE plate_code = 22
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KEŞAN', true
FROM public.cities
WHERE plate_code = 22
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'LALAPAŞA', true
FROM public.cities
WHERE plate_code = 22
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERİÇ', true
FROM public.cities
WHERE plate_code = 22
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 22
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SÜLOĞLU', true
FROM public.cities
WHERE plate_code = 22
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'UZUNKÖPRÜ', true
FROM public.cities
WHERE plate_code = 22
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('ELAZIĞ', 23, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AĞIN', true
FROM public.cities
WHERE plate_code = 23
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ALACAKAYA', true
FROM public.cities
WHERE plate_code = 23
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ARICAK', true
FROM public.cities
WHERE plate_code = 23
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BASKİL', true
FROM public.cities
WHERE plate_code = 23
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARAKOÇAN', true
FROM public.cities
WHERE plate_code = 23
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KEBAN', true
FROM public.cities
WHERE plate_code = 23
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KOVANCILAR', true
FROM public.cities
WHERE plate_code = 23
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MADEN', true
FROM public.cities
WHERE plate_code = 23
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 23
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PALU', true
FROM public.cities
WHERE plate_code = 23
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SİVRİCE', true
FROM public.cities
WHERE plate_code = 23
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('ERZİNCAN', 24, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇAYIRLI', true
FROM public.cities
WHERE plate_code = 24
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İLİÇ', true
FROM public.cities
WHERE plate_code = 24
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KEMAH', true
FROM public.cities
WHERE plate_code = 24
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KEMALİYE', true
FROM public.cities
WHERE plate_code = 24
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 24
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'OTLUKBELİ', true
FROM public.cities
WHERE plate_code = 24
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'REFAHİYE', true
FROM public.cities
WHERE plate_code = 24
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TERCAN', true
FROM public.cities
WHERE plate_code = 24
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÜZÜMLÜ', true
FROM public.cities
WHERE plate_code = 24
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('ERZURUM', 25, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AŞKALE', true
FROM public.cities
WHERE plate_code = 25
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AZİZİYE', true
FROM public.cities
WHERE plate_code = 25
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇAT', true
FROM public.cities
WHERE plate_code = 25
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HINIS', true
FROM public.cities
WHERE plate_code = 25
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HORASAN', true
FROM public.cities
WHERE plate_code = 25
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İSPİR', true
FROM public.cities
WHERE plate_code = 25
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARAÇOBAN', true
FROM public.cities
WHERE plate_code = 25
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARAYAZI', true
FROM public.cities
WHERE plate_code = 25
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KÖPRÜKÖY', true
FROM public.cities
WHERE plate_code = 25
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'NARMAN', true
FROM public.cities
WHERE plate_code = 25
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'OLTU', true
FROM public.cities
WHERE plate_code = 25
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'OLUR', true
FROM public.cities
WHERE plate_code = 25
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PALANDÖKEN', true
FROM public.cities
WHERE plate_code = 25
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PASİNLER', true
FROM public.cities
WHERE plate_code = 25
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PAZARYOLU', true
FROM public.cities
WHERE plate_code = 25
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ŞENKAYA', true
FROM public.cities
WHERE plate_code = 25
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TEKMAN', true
FROM public.cities
WHERE plate_code = 25
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TORTUM', true
FROM public.cities
WHERE plate_code = 25
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'UZUNDERE', true
FROM public.cities
WHERE plate_code = 25
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YAKUTİYE', true
FROM public.cities
WHERE plate_code = 25
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('ESKİŞEHİR', 26, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ALPU', true
FROM public.cities
WHERE plate_code = 26
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BEYLİKOVA', true
FROM public.cities
WHERE plate_code = 26
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇİFTELER', true
FROM public.cities
WHERE plate_code = 26
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜNYÜZÜ', true
FROM public.cities
WHERE plate_code = 26
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HAN', true
FROM public.cities
WHERE plate_code = 26
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İNÖNÜ', true
FROM public.cities
WHERE plate_code = 26
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MAHMUDİYE', true
FROM public.cities
WHERE plate_code = 26
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MİHALGAZİ', true
FROM public.cities
WHERE plate_code = 26
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MİHALIÇÇIK', true
FROM public.cities
WHERE plate_code = 26
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ODUNPAZARI', true
FROM public.cities
WHERE plate_code = 26
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SARICAKAYA', true
FROM public.cities
WHERE plate_code = 26
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SEYİTGAZİ', true
FROM public.cities
WHERE plate_code = 26
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SİVRİHİSAR', true
FROM public.cities
WHERE plate_code = 26
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TEPEBAŞI', true
FROM public.cities
WHERE plate_code = 26
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('GAZİANTEP', 27, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ARABAN', true
FROM public.cities
WHERE plate_code = 27
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İSLAHİYE', true
FROM public.cities
WHERE plate_code = 27
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARKAMIŞ', true
FROM public.cities
WHERE plate_code = 27
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'NİZİP', true
FROM public.cities
WHERE plate_code = 27
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'NURDAĞI', true
FROM public.cities
WHERE plate_code = 27
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'OĞUZELİ', true
FROM public.cities
WHERE plate_code = 27
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ŞAHİNBEY', true
FROM public.cities
WHERE plate_code = 27
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ŞEHİTKAMİL', true
FROM public.cities
WHERE plate_code = 27
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YAVUZELİ', true
FROM public.cities
WHERE plate_code = 27
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('GİRESUN', 28, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ALUCRA', true
FROM public.cities
WHERE plate_code = 28
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BULANCAK', true
FROM public.cities
WHERE plate_code = 28
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇAMOLUK', true
FROM public.cities
WHERE plate_code = 28
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇANAKÇI', true
FROM public.cities
WHERE plate_code = 28
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DERELİ', true
FROM public.cities
WHERE plate_code = 28
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DOĞANKENT', true
FROM public.cities
WHERE plate_code = 28
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ESPİYE', true
FROM public.cities
WHERE plate_code = 28
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'EYNESİL', true
FROM public.cities
WHERE plate_code = 28
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÖRELE', true
FROM public.cities
WHERE plate_code = 28
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜCE', true
FROM public.cities
WHERE plate_code = 28
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KEŞAP', true
FROM public.cities
WHERE plate_code = 28
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 28
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PİRAZİZ', true
FROM public.cities
WHERE plate_code = 28
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ŞEBİNKARAHİSAR', true
FROM public.cities
WHERE plate_code = 28
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TİREBOLU', true
FROM public.cities
WHERE plate_code = 28
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YAĞLIDERE', true
FROM public.cities
WHERE plate_code = 28
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('GÜMÜŞHANE', 29, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KELKİT', true
FROM public.cities
WHERE plate_code = 29
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KÖSE', true
FROM public.cities
WHERE plate_code = 29
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KÜRTÜN', true
FROM public.cities
WHERE plate_code = 29
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 29
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ŞİRAN', true
FROM public.cities
WHERE plate_code = 29
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TORUL', true
FROM public.cities
WHERE plate_code = 29
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('HAKKARİ', 30, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇUKURCA', true
FROM public.cities
WHERE plate_code = 30
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DERECİK', true
FROM public.cities
WHERE plate_code = 30
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 30
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ŞEMDİNLİ', true
FROM public.cities
WHERE plate_code = 30
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YÜKSEKOVA', true
FROM public.cities
WHERE plate_code = 30
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('HATAY', 31, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ALTINÖZÜ', true
FROM public.cities
WHERE plate_code = 31
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ANTAKYA', true
FROM public.cities
WHERE plate_code = 31
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ARSUZ', true
FROM public.cities
WHERE plate_code = 31
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BELEN', true
FROM public.cities
WHERE plate_code = 31
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DEFNE', true
FROM public.cities
WHERE plate_code = 31
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DÖRTYOL', true
FROM public.cities
WHERE plate_code = 31
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ERZİN', true
FROM public.cities
WHERE plate_code = 31
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HASSA', true
FROM public.cities
WHERE plate_code = 31
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İSKENDERUN', true
FROM public.cities
WHERE plate_code = 31
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KIRIKHAN', true
FROM public.cities
WHERE plate_code = 31
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KUMLU', true
FROM public.cities
WHERE plate_code = 31
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PAYAS', true
FROM public.cities
WHERE plate_code = 31
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'REYHANLI', true
FROM public.cities
WHERE plate_code = 31
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SAMANDAĞ', true
FROM public.cities
WHERE plate_code = 31
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YAYLADAĞI', true
FROM public.cities
WHERE plate_code = 31
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('IĞDIR', 76, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ARALIK', true
FROM public.cities
WHERE plate_code = 76
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARAKOYUNLU', true
FROM public.cities
WHERE plate_code = 76
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 76
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TUZLUCA', true
FROM public.cities
WHERE plate_code = 76
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('ISPARTA', 32, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AKSU', true
FROM public.cities
WHERE plate_code = 32
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ATABEY', true
FROM public.cities
WHERE plate_code = 32
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'EĞİRDİR', true
FROM public.cities
WHERE plate_code = 32
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GELENDOST', true
FROM public.cities
WHERE plate_code = 32
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÖNEN', true
FROM public.cities
WHERE plate_code = 32
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KEÇİBORLU', true
FROM public.cities
WHERE plate_code = 32
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 32
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SENİRKENT', true
FROM public.cities
WHERE plate_code = 32
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SÜTÇÜLER', true
FROM public.cities
WHERE plate_code = 32
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ŞARKİKARAAĞAÇ', true
FROM public.cities
WHERE plate_code = 32
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ULUBORLU', true
FROM public.cities
WHERE plate_code = 32
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YALVAÇ', true
FROM public.cities
WHERE plate_code = 32
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YENİŞARBADEMLİ', true
FROM public.cities
WHERE plate_code = 32
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('İSTANBUL', 34, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ADALAR', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ARNAVUTKÖY', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ATAŞEHİR', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AVCILAR', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAĞCILAR', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAHÇELİEVLER', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAKIRKÖY', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAŞAKŞEHİR', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAYRAMPAŞA', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BEŞİKTAŞ', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BEYKOZ', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BEYLİKDÜZÜ', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BEYOĞLU', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BÜYÜKÇEKMECE', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇATALCA', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇEKMEKÖY', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ESENLER', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ESENYURT', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'EYÜPSULTAN', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'FATİH', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GAZİOSMANPAŞA', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜNGÖREN', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KADIKÖY', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KAĞITHANE', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARTAL', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KÜÇÜKÇEKMECE', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MALTEPE', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PENDİK', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SANCAKTEPE', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SARIYER', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SİLİVRİ', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SULTANBEYLİ', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SULTANGAZİ', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ŞİLE', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ŞİŞLİ', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TUZLA', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÜMRANİYE', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÜSKÜDAR', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ZEYTİNBURNU', true
FROM public.cities
WHERE plate_code = 34
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('İZMİR', 35, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ALİAĞA', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BALÇOVA', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAYINDIR', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAYRAKLI', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BERGAMA', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BEYDAĞ', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BORNOVA', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BUCA', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇEŞME', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇİĞLİ', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DİKİLİ', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'FOÇA', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GAZİEMİR', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜZELBAHÇE', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARABAĞLAR', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARABURUN', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARŞIYAKA', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KEMALPAŞA', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KINIK', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KİRAZ', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KONAK', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MENDERES', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MENEMEN', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'NARLIDERE', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÖDEMİŞ', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SEFERİHİSAR', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SELÇUK', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TİRE', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TORBALI', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'URLA', true
FROM public.cities
WHERE plate_code = 35
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('KAHRAMANMARAŞ', 46, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AFŞİN', true
FROM public.cities
WHERE plate_code = 46
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ANDIRIN', true
FROM public.cities
WHERE plate_code = 46
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇAĞLAYANCERİT', true
FROM public.cities
WHERE plate_code = 46
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DULKADİROĞLU', true
FROM public.cities
WHERE plate_code = 46
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'EKİNÖZÜ', true
FROM public.cities
WHERE plate_code = 46
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ELBİSTAN', true
FROM public.cities
WHERE plate_code = 46
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÖKSUN', true
FROM public.cities
WHERE plate_code = 46
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'NURHAK', true
FROM public.cities
WHERE plate_code = 46
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ONİKİŞUBAT', true
FROM public.cities
WHERE plate_code = 46
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PAZARCIK', true
FROM public.cities
WHERE plate_code = 46
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TÜRKOĞLU', true
FROM public.cities
WHERE plate_code = 46
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('KARABÜK', 78, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'EFLANİ', true
FROM public.cities
WHERE plate_code = 78
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ESKİPAZAR', true
FROM public.cities
WHERE plate_code = 78
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 78
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'OVACIK', true
FROM public.cities
WHERE plate_code = 78
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SAFRANBOLU', true
FROM public.cities
WHERE plate_code = 78
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YENİCE', true
FROM public.cities
WHERE plate_code = 78
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('KARAMAN', 70, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AYRANCI', true
FROM public.cities
WHERE plate_code = 70
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAŞYAYLA', true
FROM public.cities
WHERE plate_code = 70
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ERMENEK', true
FROM public.cities
WHERE plate_code = 70
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KAZIMKARABEKİR', true
FROM public.cities
WHERE plate_code = 70
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 70
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SARIVELİLER', true
FROM public.cities
WHERE plate_code = 70
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('KARS', 36, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AKYAKA', true
FROM public.cities
WHERE plate_code = 36
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ARPAÇAY', true
FROM public.cities
WHERE plate_code = 36
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DİGOR', true
FROM public.cities
WHERE plate_code = 36
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KAĞIZMAN', true
FROM public.cities
WHERE plate_code = 36
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 36
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SARIKAMIŞ', true
FROM public.cities
WHERE plate_code = 36
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SELİM', true
FROM public.cities
WHERE plate_code = 36
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SUSUZ', true
FROM public.cities
WHERE plate_code = 36
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('KASTAMONU', 37, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ABANA', true
FROM public.cities
WHERE plate_code = 37
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AĞLI', true
FROM public.cities
WHERE plate_code = 37
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ARAÇ', true
FROM public.cities
WHERE plate_code = 37
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AZDAVAY', true
FROM public.cities
WHERE plate_code = 37
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BOZKURT', true
FROM public.cities
WHERE plate_code = 37
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'CİDE', true
FROM public.cities
WHERE plate_code = 37
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇATALZEYTİN', true
FROM public.cities
WHERE plate_code = 37
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DADAY', true
FROM public.cities
WHERE plate_code = 37
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DEVREKANİ', true
FROM public.cities
WHERE plate_code = 37
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DOĞANYURT', true
FROM public.cities
WHERE plate_code = 37
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HANÖNÜ', true
FROM public.cities
WHERE plate_code = 37
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İHSANGAZİ', true
FROM public.cities
WHERE plate_code = 37
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İNEBOLU', true
FROM public.cities
WHERE plate_code = 37
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KÜRE', true
FROM public.cities
WHERE plate_code = 37
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 37
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PINARBAŞI', true
FROM public.cities
WHERE plate_code = 37
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SEYDİLER', true
FROM public.cities
WHERE plate_code = 37
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ŞENPAZAR', true
FROM public.cities
WHERE plate_code = 37
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TAŞKÖPRÜ', true
FROM public.cities
WHERE plate_code = 37
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TOSYA', true
FROM public.cities
WHERE plate_code = 37
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('KAYSERİ', 38, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AKKIŞLA', true
FROM public.cities
WHERE plate_code = 38
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BÜNYAN', true
FROM public.cities
WHERE plate_code = 38
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DEVELİ', true
FROM public.cities
WHERE plate_code = 38
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'FELAHİYE', true
FROM public.cities
WHERE plate_code = 38
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HACILAR', true
FROM public.cities
WHERE plate_code = 38
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İNCESU', true
FROM public.cities
WHERE plate_code = 38
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KOCASİNAN', true
FROM public.cities
WHERE plate_code = 38
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MELİKGAZİ', true
FROM public.cities
WHERE plate_code = 38
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÖZVATAN', true
FROM public.cities
WHERE plate_code = 38
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PINARBAŞI', true
FROM public.cities
WHERE plate_code = 38
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SARIOĞLAN', true
FROM public.cities
WHERE plate_code = 38
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SARIZ', true
FROM public.cities
WHERE plate_code = 38
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TALAS', true
FROM public.cities
WHERE plate_code = 38
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TOMARZA', true
FROM public.cities
WHERE plate_code = 38
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YAHYALI', true
FROM public.cities
WHERE plate_code = 38
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YEŞİLHİSAR', true
FROM public.cities
WHERE plate_code = 38
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('KIRIKKALE', 71, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAHŞİLİ', true
FROM public.cities
WHERE plate_code = 71
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BALIŞEYH', true
FROM public.cities
WHERE plate_code = 71
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇELEBİ', true
FROM public.cities
WHERE plate_code = 71
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DELİCE', true
FROM public.cities
WHERE plate_code = 71
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARAKEÇİLİ', true
FROM public.cities
WHERE plate_code = 71
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KESKİN', true
FROM public.cities
WHERE plate_code = 71
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 71
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SULAKYURT', true
FROM public.cities
WHERE plate_code = 71
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YAHŞİHAN', true
FROM public.cities
WHERE plate_code = 71
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('KIRKLARELİ', 39, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BABAESKİ', true
FROM public.cities
WHERE plate_code = 39
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DEMİRKÖY', true
FROM public.cities
WHERE plate_code = 39
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KOFÇAZ', true
FROM public.cities
WHERE plate_code = 39
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'LÜLEBURGAZ', true
FROM public.cities
WHERE plate_code = 39
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 39
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PEHLİVANKÖY', true
FROM public.cities
WHERE plate_code = 39
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PINARHİSAR', true
FROM public.cities
WHERE plate_code = 39
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'VİZE', true
FROM public.cities
WHERE plate_code = 39
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('KIRŞEHİR', 40, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AKÇAKENT', true
FROM public.cities
WHERE plate_code = 40
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AKPINAR', true
FROM public.cities
WHERE plate_code = 40
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BOZTEPE', true
FROM public.cities
WHERE plate_code = 40
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇİÇEKDAĞI', true
FROM public.cities
WHERE plate_code = 40
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KAMAN', true
FROM public.cities
WHERE plate_code = 40
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 40
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MUCUR', true
FROM public.cities
WHERE plate_code = 40
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('KİLİS', 79, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ELBEYLİ', true
FROM public.cities
WHERE plate_code = 79
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 79
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MUSABEYLİ', true
FROM public.cities
WHERE plate_code = 79
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'POLATELİ', true
FROM public.cities
WHERE plate_code = 79
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('KOCAELİ', 41, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAŞİSKELE', true
FROM public.cities
WHERE plate_code = 41
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇAYIROVA', true
FROM public.cities
WHERE plate_code = 41
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DARICA', true
FROM public.cities
WHERE plate_code = 41
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DERİNCE', true
FROM public.cities
WHERE plate_code = 41
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DİLOVASI', true
FROM public.cities
WHERE plate_code = 41
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GEBZE', true
FROM public.cities
WHERE plate_code = 41
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÖLCÜK', true
FROM public.cities
WHERE plate_code = 41
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İZMİT', true
FROM public.cities
WHERE plate_code = 41
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KANDIRA', true
FROM public.cities
WHERE plate_code = 41
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARAMÜRSEL', true
FROM public.cities
WHERE plate_code = 41
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARTEPE', true
FROM public.cities
WHERE plate_code = 41
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KÖRFEZ', true
FROM public.cities
WHERE plate_code = 41
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('KONYA', 42, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AHIRLI', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AKÖREN', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AKŞEHİR', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ALTINEKİN', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BEYŞEHİR', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BOZKIR', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'CİHANBEYLİ', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇELTİK', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇUMRA', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DERBENT', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DEREBUCAK', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DOĞANHİSAR', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'EMİRGAZİ', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'EREĞLİ', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜNEYSINIR', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HADİM', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HALKAPINAR', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HÜYÜK', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ILGIN', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KADINHANI', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARAPINAR', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARATAY', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KULU', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERAM', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SARAYÖNÜ', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SELÇUKLU', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SEYDİŞEHİR', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TAŞKENT', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TUZLUKÇU', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YALIHÜYÜK', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YUNAK', true
FROM public.cities
WHERE plate_code = 42
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('KÜTAHYA', 43, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ALTINTAŞ', true
FROM public.cities
WHERE plate_code = 43
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ASLANAPA', true
FROM public.cities
WHERE plate_code = 43
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇAVDARHİSAR', true
FROM public.cities
WHERE plate_code = 43
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DOMANİÇ', true
FROM public.cities
WHERE plate_code = 43
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DUMLUPINAR', true
FROM public.cities
WHERE plate_code = 43
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'EMET', true
FROM public.cities
WHERE plate_code = 43
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GEDİZ', true
FROM public.cities
WHERE plate_code = 43
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HİSARCIK', true
FROM public.cities
WHERE plate_code = 43
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 43
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PAZARLAR', true
FROM public.cities
WHERE plate_code = 43
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SİMAV', true
FROM public.cities
WHERE plate_code = 43
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ŞAPHANE', true
FROM public.cities
WHERE plate_code = 43
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TAVŞANLI', true
FROM public.cities
WHERE plate_code = 43
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('MALATYA', 44, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AKÇADAĞ', true
FROM public.cities
WHERE plate_code = 44
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ARAPGİR', true
FROM public.cities
WHERE plate_code = 44
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ARGUVAN', true
FROM public.cities
WHERE plate_code = 44
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BATTALGAZİ', true
FROM public.cities
WHERE plate_code = 44
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DARENDE', true
FROM public.cities
WHERE plate_code = 44
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DOĞANŞEHİR', true
FROM public.cities
WHERE plate_code = 44
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DOĞANYOL', true
FROM public.cities
WHERE plate_code = 44
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HEKİMHAN', true
FROM public.cities
WHERE plate_code = 44
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KALE', true
FROM public.cities
WHERE plate_code = 44
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KULUNCAK', true
FROM public.cities
WHERE plate_code = 44
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PÜTÜRGE', true
FROM public.cities
WHERE plate_code = 44
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YAZIHAN', true
FROM public.cities
WHERE plate_code = 44
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YEŞİLYURT', true
FROM public.cities
WHERE plate_code = 44
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('MANİSA', 45, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AHMETLİ', true
FROM public.cities
WHERE plate_code = 45
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AKHİSAR', true
FROM public.cities
WHERE plate_code = 45
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ALAŞEHİR', true
FROM public.cities
WHERE plate_code = 45
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DEMİRCİ', true
FROM public.cities
WHERE plate_code = 45
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÖLMARMARA', true
FROM public.cities
WHERE plate_code = 45
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÖRDES', true
FROM public.cities
WHERE plate_code = 45
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KIRKAĞAÇ', true
FROM public.cities
WHERE plate_code = 45
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KÖPRÜBAŞI', true
FROM public.cities
WHERE plate_code = 45
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KULA', true
FROM public.cities
WHERE plate_code = 45
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SALİHLİ', true
FROM public.cities
WHERE plate_code = 45
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SARIGÖL', true
FROM public.cities
WHERE plate_code = 45
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SARUHANLI', true
FROM public.cities
WHERE plate_code = 45
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SELENDİ', true
FROM public.cities
WHERE plate_code = 45
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SOMA', true
FROM public.cities
WHERE plate_code = 45
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ŞEHZADELER', true
FROM public.cities
WHERE plate_code = 45
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TURGUTLU', true
FROM public.cities
WHERE plate_code = 45
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YUNUSEMRE', true
FROM public.cities
WHERE plate_code = 45
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('MARDİN', 47, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ARTUKLU', true
FROM public.cities
WHERE plate_code = 47
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DARGEÇİT', true
FROM public.cities
WHERE plate_code = 47
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DERİK', true
FROM public.cities
WHERE plate_code = 47
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KIZILTEPE', true
FROM public.cities
WHERE plate_code = 47
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MAZIDAĞI', true
FROM public.cities
WHERE plate_code = 47
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MİDYAT', true
FROM public.cities
WHERE plate_code = 47
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'NUSAYBİN', true
FROM public.cities
WHERE plate_code = 47
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÖMERLİ', true
FROM public.cities
WHERE plate_code = 47
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SAVUR', true
FROM public.cities
WHERE plate_code = 47
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YEŞİLLİ', true
FROM public.cities
WHERE plate_code = 47
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('MERSİN', 33, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AKDENİZ', true
FROM public.cities
WHERE plate_code = 33
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ANAMUR', true
FROM public.cities
WHERE plate_code = 33
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AYDINCIK', true
FROM public.cities
WHERE plate_code = 33
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BOZYAZI', true
FROM public.cities
WHERE plate_code = 33
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇAMLIYAYLA', true
FROM public.cities
WHERE plate_code = 33
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ERDEMLİ', true
FROM public.cities
WHERE plate_code = 33
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜLNAR', true
FROM public.cities
WHERE plate_code = 33
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MEZİTLİ', true
FROM public.cities
WHERE plate_code = 33
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MUT', true
FROM public.cities
WHERE plate_code = 33
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SİLİFKE', true
FROM public.cities
WHERE plate_code = 33
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TARSUS', true
FROM public.cities
WHERE plate_code = 33
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TOROSLAR', true
FROM public.cities
WHERE plate_code = 33
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YENİŞEHİR', true
FROM public.cities
WHERE plate_code = 33
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('MUĞLA', 48, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BODRUM', true
FROM public.cities
WHERE plate_code = 48
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DALAMAN', true
FROM public.cities
WHERE plate_code = 48
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DATÇA', true
FROM public.cities
WHERE plate_code = 48
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'FETHİYE', true
FROM public.cities
WHERE plate_code = 48
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KAVAKLIDERE', true
FROM public.cities
WHERE plate_code = 48
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KÖYCEĞİZ', true
FROM public.cities
WHERE plate_code = 48
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MARMARİS', true
FROM public.cities
WHERE plate_code = 48
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MENTEŞE', true
FROM public.cities
WHERE plate_code = 48
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MİLAS', true
FROM public.cities
WHERE plate_code = 48
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ORTACA', true
FROM public.cities
WHERE plate_code = 48
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SEYDİKEMER', true
FROM public.cities
WHERE plate_code = 48
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ULA', true
FROM public.cities
WHERE plate_code = 48
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YATAĞAN', true
FROM public.cities
WHERE plate_code = 48
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('MUŞ', 49, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BULANIK', true
FROM public.cities
WHERE plate_code = 49
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HASKÖY', true
FROM public.cities
WHERE plate_code = 49
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KORKUT', true
FROM public.cities
WHERE plate_code = 49
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MALAZGİRT', true
FROM public.cities
WHERE plate_code = 49
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 49
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'VARTO', true
FROM public.cities
WHERE plate_code = 49
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('NEVŞEHİR', 50, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ACIGÖL', true
FROM public.cities
WHERE plate_code = 50
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AVANOS', true
FROM public.cities
WHERE plate_code = 50
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DERİNKUYU', true
FROM public.cities
WHERE plate_code = 50
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜLŞEHİR', true
FROM public.cities
WHERE plate_code = 50
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HACIBEKTAŞ', true
FROM public.cities
WHERE plate_code = 50
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KOZAKLI', true
FROM public.cities
WHERE plate_code = 50
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 50
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÜRGÜP', true
FROM public.cities
WHERE plate_code = 50
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('NİĞDE', 51, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ALTUNHİSAR', true
FROM public.cities
WHERE plate_code = 51
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BOR', true
FROM public.cities
WHERE plate_code = 51
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇAMARDI', true
FROM public.cities
WHERE plate_code = 51
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇİFTLİK', true
FROM public.cities
WHERE plate_code = 51
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 51
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ULUKIŞLA', true
FROM public.cities
WHERE plate_code = 51
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('ORDU', 52, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AKKUŞ', true
FROM public.cities
WHERE plate_code = 52
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ALTINORDU', true
FROM public.cities
WHERE plate_code = 52
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AYBASTI', true
FROM public.cities
WHERE plate_code = 52
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇAMAŞ', true
FROM public.cities
WHERE plate_code = 52
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇATALPINAR', true
FROM public.cities
WHERE plate_code = 52
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇAYBAŞI', true
FROM public.cities
WHERE plate_code = 52
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'FATSA', true
FROM public.cities
WHERE plate_code = 52
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÖLKÖY', true
FROM public.cities
WHERE plate_code = 52
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜLYALI', true
FROM public.cities
WHERE plate_code = 52
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜRGENTEPE', true
FROM public.cities
WHERE plate_code = 52
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İKİZCE', true
FROM public.cities
WHERE plate_code = 52
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KABADÜZ', true
FROM public.cities
WHERE plate_code = 52
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KABATAŞ', true
FROM public.cities
WHERE plate_code = 52
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KORGAN', true
FROM public.cities
WHERE plate_code = 52
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KUMRU', true
FROM public.cities
WHERE plate_code = 52
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MESUDİYE', true
FROM public.cities
WHERE plate_code = 52
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PERŞEMBE', true
FROM public.cities
WHERE plate_code = 52
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ULUBEY', true
FROM public.cities
WHERE plate_code = 52
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÜNYE', true
FROM public.cities
WHERE plate_code = 52
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('OSMANİYE', 80, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAHÇE', true
FROM public.cities
WHERE plate_code = 80
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DÜZİÇİ', true
FROM public.cities
WHERE plate_code = 80
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HASANBEYLİ', true
FROM public.cities
WHERE plate_code = 80
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KADİRLİ', true
FROM public.cities
WHERE plate_code = 80
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 80
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SUMBAS', true
FROM public.cities
WHERE plate_code = 80
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TOPRAKKALE', true
FROM public.cities
WHERE plate_code = 80
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('RİZE', 53, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ARDEŞEN', true
FROM public.cities
WHERE plate_code = 53
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇAMLIHEMŞİN', true
FROM public.cities
WHERE plate_code = 53
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇAYELİ', true
FROM public.cities
WHERE plate_code = 53
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DEREPAZARI', true
FROM public.cities
WHERE plate_code = 53
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'FINDIKLI', true
FROM public.cities
WHERE plate_code = 53
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜNEYSU', true
FROM public.cities
WHERE plate_code = 53
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HEMŞİN', true
FROM public.cities
WHERE plate_code = 53
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İKİZDERE', true
FROM public.cities
WHERE plate_code = 53
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İYİDERE', true
FROM public.cities
WHERE plate_code = 53
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KALKANDERE', true
FROM public.cities
WHERE plate_code = 53
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 53
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PAZAR', true
FROM public.cities
WHERE plate_code = 53
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('SAKARYA', 54, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ADAPAZARI', true
FROM public.cities
WHERE plate_code = 54
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AKYAZI', true
FROM public.cities
WHERE plate_code = 54
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ARİFİYE', true
FROM public.cities
WHERE plate_code = 54
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ERENLER', true
FROM public.cities
WHERE plate_code = 54
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'FERİZLİ', true
FROM public.cities
WHERE plate_code = 54
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GEYVE', true
FROM public.cities
WHERE plate_code = 54
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HENDEK', true
FROM public.cities
WHERE plate_code = 54
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARAPÜRÇEK', true
FROM public.cities
WHERE plate_code = 54
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARASU', true
FROM public.cities
WHERE plate_code = 54
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KAYNARCA', true
FROM public.cities
WHERE plate_code = 54
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KOCAALİ', true
FROM public.cities
WHERE plate_code = 54
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PAMUKOVA', true
FROM public.cities
WHERE plate_code = 54
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SAPANCA', true
FROM public.cities
WHERE plate_code = 54
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SERDİVAN', true
FROM public.cities
WHERE plate_code = 54
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SÖĞÜTLÜ', true
FROM public.cities
WHERE plate_code = 54
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TARAKLI', true
FROM public.cities
WHERE plate_code = 54
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('SAMSUN', 55, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, '19 MAYIS', true
FROM public.cities
WHERE plate_code = 55
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ALAÇAM', true
FROM public.cities
WHERE plate_code = 55
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ASARCIK', true
FROM public.cities
WHERE plate_code = 55
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ATAKUM', true
FROM public.cities
WHERE plate_code = 55
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AYVACIK', true
FROM public.cities
WHERE plate_code = 55
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAFRA', true
FROM public.cities
WHERE plate_code = 55
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'CANİK', true
FROM public.cities
WHERE plate_code = 55
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇARŞAMBA', true
FROM public.cities
WHERE plate_code = 55
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HAVZA', true
FROM public.cities
WHERE plate_code = 55
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İLKADIM', true
FROM public.cities
WHERE plate_code = 55
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KAVAK', true
FROM public.cities
WHERE plate_code = 55
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'LADİK', true
FROM public.cities
WHERE plate_code = 55
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SALIPAZARI', true
FROM public.cities
WHERE plate_code = 55
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TEKKEKÖY', true
FROM public.cities
WHERE plate_code = 55
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TERME', true
FROM public.cities
WHERE plate_code = 55
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'VEZİRKÖPRÜ', true
FROM public.cities
WHERE plate_code = 55
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YAKAKENT', true
FROM public.cities
WHERE plate_code = 55
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('SİİRT', 56, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAYKAN', true
FROM public.cities
WHERE plate_code = 56
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ERUH', true
FROM public.cities
WHERE plate_code = 56
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KURTALAN', true
FROM public.cities
WHERE plate_code = 56
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 56
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PERVARİ', true
FROM public.cities
WHERE plate_code = 56
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ŞİRVAN', true
FROM public.cities
WHERE plate_code = 56
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TİLLO', true
FROM public.cities
WHERE plate_code = 56
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('SİNOP', 57, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AYANCIK', true
FROM public.cities
WHERE plate_code = 57
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BOYABAT', true
FROM public.cities
WHERE plate_code = 57
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DİKMEN', true
FROM public.cities
WHERE plate_code = 57
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DURAĞAN', true
FROM public.cities
WHERE plate_code = 57
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ERFELEK', true
FROM public.cities
WHERE plate_code = 57
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GERZE', true
FROM public.cities
WHERE plate_code = 57
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 57
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SARAYDÜZÜ', true
FROM public.cities
WHERE plate_code = 57
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TÜRKELİ', true
FROM public.cities
WHERE plate_code = 57
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('SİVAS', 58, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AKINCILAR', true
FROM public.cities
WHERE plate_code = 58
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ALTINYAYLA', true
FROM public.cities
WHERE plate_code = 58
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DİVRİĞİ', true
FROM public.cities
WHERE plate_code = 58
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DOĞANŞAR', true
FROM public.cities
WHERE plate_code = 58
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GEMEREK', true
FROM public.cities
WHERE plate_code = 58
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÖLOVA', true
FROM public.cities
WHERE plate_code = 58
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜRÜN', true
FROM public.cities
WHERE plate_code = 58
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HAFİK', true
FROM public.cities
WHERE plate_code = 58
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İMRANLI', true
FROM public.cities
WHERE plate_code = 58
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KANGAL', true
FROM public.cities
WHERE plate_code = 58
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KOYULHİSAR', true
FROM public.cities
WHERE plate_code = 58
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 58
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SUŞEHRİ', true
FROM public.cities
WHERE plate_code = 58
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ŞARKIŞLA', true
FROM public.cities
WHERE plate_code = 58
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ULAŞ', true
FROM public.cities
WHERE plate_code = 58
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YILDIZELİ', true
FROM public.cities
WHERE plate_code = 58
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ZARA', true
FROM public.cities
WHERE plate_code = 58
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('ŞANLIURFA', 63, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AKÇAKALE', true
FROM public.cities
WHERE plate_code = 63
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BİRECİK', true
FROM public.cities
WHERE plate_code = 63
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BOZOVA', true
FROM public.cities
WHERE plate_code = 63
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'CEYLANPINAR', true
FROM public.cities
WHERE plate_code = 63
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'EYYÜBİYE', true
FROM public.cities
WHERE plate_code = 63
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HALFETİ', true
FROM public.cities
WHERE plate_code = 63
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HALİLİYE', true
FROM public.cities
WHERE plate_code = 63
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HARRAN', true
FROM public.cities
WHERE plate_code = 63
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HİLVAN', true
FROM public.cities
WHERE plate_code = 63
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARAKÖPRÜ', true
FROM public.cities
WHERE plate_code = 63
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SİVEREK', true
FROM public.cities
WHERE plate_code = 63
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SURUÇ', true
FROM public.cities
WHERE plate_code = 63
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'VİRANŞEHİR', true
FROM public.cities
WHERE plate_code = 63
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('ŞIRNAK', 73, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BEYTÜŞŞEBAP', true
FROM public.cities
WHERE plate_code = 73
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'CİZRE', true
FROM public.cities
WHERE plate_code = 73
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜÇLÜKONAK', true
FROM public.cities
WHERE plate_code = 73
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İDİL', true
FROM public.cities
WHERE plate_code = 73
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 73
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SİLOPİ', true
FROM public.cities
WHERE plate_code = 73
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ULUDERE', true
FROM public.cities
WHERE plate_code = 73
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('TEKİRDAĞ', 59, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇERKEZKÖY', true
FROM public.cities
WHERE plate_code = 59
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇORLU', true
FROM public.cities
WHERE plate_code = 59
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ERGENE', true
FROM public.cities
WHERE plate_code = 59
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HAYRABOLU', true
FROM public.cities
WHERE plate_code = 59
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KAPAKLI', true
FROM public.cities
WHERE plate_code = 59
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MALKARA', true
FROM public.cities
WHERE plate_code = 59
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MARMARAEREĞLİSİ', true
FROM public.cities
WHERE plate_code = 59
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MURATLI', true
FROM public.cities
WHERE plate_code = 59
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SARAY', true
FROM public.cities
WHERE plate_code = 59
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SÜLEYMANPAŞA', true
FROM public.cities
WHERE plate_code = 59
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ŞARKÖY', true
FROM public.cities
WHERE plate_code = 59
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('TOKAT', 60, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ALMUS', true
FROM public.cities
WHERE plate_code = 60
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ARTOVA', true
FROM public.cities
WHERE plate_code = 60
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAŞÇİFTLİK', true
FROM public.cities
WHERE plate_code = 60
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ERBAA', true
FROM public.cities
WHERE plate_code = 60
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 60
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'NİKSAR', true
FROM public.cities
WHERE plate_code = 60
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PAZAR', true
FROM public.cities
WHERE plate_code = 60
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'REŞADİYE', true
FROM public.cities
WHERE plate_code = 60
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SULUSARAY', true
FROM public.cities
WHERE plate_code = 60
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TURHAL', true
FROM public.cities
WHERE plate_code = 60
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YEŞİLYURT', true
FROM public.cities
WHERE plate_code = 60
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ZİLE', true
FROM public.cities
WHERE plate_code = 60
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('TRABZON', 61, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AKÇAABAT', true
FROM public.cities
WHERE plate_code = 61
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ARAKLI', true
FROM public.cities
WHERE plate_code = 61
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ARSİN', true
FROM public.cities
WHERE plate_code = 61
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BEŞİKDÜZÜ', true
FROM public.cities
WHERE plate_code = 61
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇARŞIBAŞI', true
FROM public.cities
WHERE plate_code = 61
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇAYKARA', true
FROM public.cities
WHERE plate_code = 61
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DERNEKPAZARI', true
FROM public.cities
WHERE plate_code = 61
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DÜZKÖY', true
FROM public.cities
WHERE plate_code = 61
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HAYRAT', true
FROM public.cities
WHERE plate_code = 61
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KÖPRÜBAŞI', true
FROM public.cities
WHERE plate_code = 61
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MAÇKA', true
FROM public.cities
WHERE plate_code = 61
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'OF', true
FROM public.cities
WHERE plate_code = 61
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ORTAHİSAR', true
FROM public.cities
WHERE plate_code = 61
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SÜRMENE', true
FROM public.cities
WHERE plate_code = 61
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ŞALPAZARI', true
FROM public.cities
WHERE plate_code = 61
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TONYA', true
FROM public.cities
WHERE plate_code = 61
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'VAKFIKEBİR', true
FROM public.cities
WHERE plate_code = 61
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YOMRA', true
FROM public.cities
WHERE plate_code = 61
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('TUNCELİ', 62, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇEMİŞGEZEK', true
FROM public.cities
WHERE plate_code = 62
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'HOZAT', true
FROM public.cities
WHERE plate_code = 62
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MAZGİRT', true
FROM public.cities
WHERE plate_code = 62
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 62
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'NAZIMİYE', true
FROM public.cities
WHERE plate_code = 62
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'OVACIK', true
FROM public.cities
WHERE plate_code = 62
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PERTEK', true
FROM public.cities
WHERE plate_code = 62
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'PÜLÜMÜR', true
FROM public.cities
WHERE plate_code = 62
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('UŞAK', 64, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BANAZ', true
FROM public.cities
WHERE plate_code = 64
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'EŞME', true
FROM public.cities
WHERE plate_code = 64
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KARAHALLI', true
FROM public.cities
WHERE plate_code = 64
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 64
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SİVASLI', true
FROM public.cities
WHERE plate_code = 64
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ULUBEY', true
FROM public.cities
WHERE plate_code = 64
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('VAN', 65, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAHÇESARAY', true
FROM public.cities
WHERE plate_code = 65
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BAŞKALE', true
FROM public.cities
WHERE plate_code = 65
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇALDIRAN', true
FROM public.cities
WHERE plate_code = 65
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇATAK', true
FROM public.cities
WHERE plate_code = 65
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'EDREMİT', true
FROM public.cities
WHERE plate_code = 65
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ERCİŞ', true
FROM public.cities
WHERE plate_code = 65
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GEVAŞ', true
FROM public.cities
WHERE plate_code = 65
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÜRPINAR', true
FROM public.cities
WHERE plate_code = 65
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'İPEKYOLU', true
FROM public.cities
WHERE plate_code = 65
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MURADİYE', true
FROM public.cities
WHERE plate_code = 65
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÖZALP', true
FROM public.cities
WHERE plate_code = 65
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SARAY', true
FROM public.cities
WHERE plate_code = 65
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TUŞBA', true
FROM public.cities
WHERE plate_code = 65
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('YALOVA', 77, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ALTINOVA', true
FROM public.cities
WHERE plate_code = 77
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ARMUTLU', true
FROM public.cities
WHERE plate_code = 77
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇINARCIK', true
FROM public.cities
WHERE plate_code = 77
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇİFTLİKKÖY', true
FROM public.cities
WHERE plate_code = 77
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 77
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'TERMAL', true
FROM public.cities
WHERE plate_code = 77
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('YOZGAT', 66, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AKDAĞMADENİ', true
FROM public.cities
WHERE plate_code = 66
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'AYDINCIK', true
FROM public.cities
WHERE plate_code = 66
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'BOĞAZLIYAN', true
FROM public.cities
WHERE plate_code = 66
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇANDIR', true
FROM public.cities
WHERE plate_code = 66
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇAYIRALAN', true
FROM public.cities
WHERE plate_code = 66
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇEKEREK', true
FROM public.cities
WHERE plate_code = 66
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KADIŞEHRİ', true
FROM public.cities
WHERE plate_code = 66
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 66
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SARAYKENT', true
FROM public.cities
WHERE plate_code = 66
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SARIKAYA', true
FROM public.cities
WHERE plate_code = 66
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'SORGUN', true
FROM public.cities
WHERE plate_code = 66
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ŞEFAATLİ', true
FROM public.cities
WHERE plate_code = 66
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YENİFAKILI', true
FROM public.cities
WHERE plate_code = 66
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'YERKÖY', true
FROM public.cities
WHERE plate_code = 66
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.cities (name, plate_code, is_active)
VALUES ('ZONGULDAK', 67, true)
ON CONFLICT (plate_code) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ALAPLI', true
FROM public.cities
WHERE plate_code = 67
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'ÇAYCUMA', true
FROM public.cities
WHERE plate_code = 67
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'DEVREK', true
FROM public.cities
WHERE plate_code = 67
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'EREĞLİ', true
FROM public.cities
WHERE plate_code = 67
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'GÖKÇEBEY', true
FROM public.cities
WHERE plate_code = 67
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KİLİMLİ', true
FROM public.cities
WHERE plate_code = 67
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'KOZLU', true
FROM public.cities
WHERE plate_code = 67
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

INSERT INTO public.districts (city_id, name, is_active)
SELECT id, 'MERKEZ', true
FROM public.cities
WHERE plate_code = 67
ON CONFLICT (city_id, name) DO UPDATE SET is_active = true;

