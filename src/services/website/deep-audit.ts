import { DeepAuditData, WebsiteScanResult } from "@/types/website";
import { scanWebsite } from "./scanner";

export interface DeepAuditResult {
  scan: WebsiteScanResult;
  deepData: DeepAuditData;
}

/**
 * Executes a practical sales-focused audit for a business website.
 * Translates real technical flaws into actionable cold-calling talking points.
 */
export async function performDeepWebsiteAudit(url: string): Promise<DeepAuditResult> {
  const scan = await scanWebsite(url);

  if (scan.status !== "success" || !scan.rawHtml) {
    const isTimeout = scan.status === "timeout";
    const isSsl = scan.status === "ssl_error";

    const reason = isTimeout
      ? "Web sitesi 5 saniye içinde yanıt vermiyor (Zaman aşımı)."
      : isSsl
      ? "Güvenlik sertifikası geçersiz veya çökmüş."
      : "Web sitesi yayında değil veya sunucu çökmüş.";

    const salesPitch =
      "Hocam merhaba, Google Haritalar profilinizdeki web sitesi bağlantınız şu an açılmıyor, sayfa hata veriyor. Sizi arayan ve incelemek isteyen müşteriler doğrudan boş sayfayla karşılaşıyor. Bu kaybı durdurmak için sitenizi hemen ayağa kaldıralım.";

    return {
      scan,
      deepData: {
        hasWhatsApp: false,
        hasCallButton: false,
        isMobileResponsive: false,
        speedLabel: "Erişilemiyor",
        salesPitch,
        problems: [reason, "Ziyaretçiler işletmeye ulaşamadan rakip firmalara gidiyor."],
      },
    };
  }

  const problems: string[] = [];

  // 1. Mobile & Responsiveness
  const isMobileResponsive = scan.hasViewport;
  if (!isMobileResponsive) {
    problems.push(
      "Mobil Uyumsuz: Sayfa cep telefonlarına göre ölçeklenmiyor. Ziyaretçiler yazıları okumak için yakınlaştırmak zorunda kalıyor."
    );
  }

  // 2. Direct Lead Actions (WhatsApp & Click-to-Call)
  const hasWhatsApp = scan.hasWhatsApp;
  if (!hasWhatsApp) {
    problems.push(
      "Hızlı WhatsApp Butonu Yok: Sayfaya giren sıcak müşteri tek tıkla mesaj atıp soru soramıyor veya randevu alamıyor."
    );
  }

  const hasCallButton = scan.hasCallButton;
  if (!hasCallButton) {
    problems.push(
      "Tek Tıkla Arama Yok: Telefon numarası tıklanabilir değil; mobildeki kullanıcı numarayı ezberlemek veya kopyalamak zorunda kalıyor."
    );
  }

  // 3. Load Speed
  let speedLabel = "Hızlı (< 800 ms)";
  if (scan.responseTimeMs > 1500) {
    speedLabel = `Çok Yavaş (${scan.responseTimeMs} ms)`;
    problems.push(
      `Yavaş Yükleme (${scan.responseTimeMs} ms): Mobil kullanıcıların %50'si 3 saniyeden uzun süren siteleri açılmadan terk ediyor.`
    );
  } else if (scan.responseTimeMs > 800) {
    speedLabel = `Orta (${scan.responseTimeMs} ms)`;
  }

  // 4. SSL Security Warning
  if (!scan.isHttps) {
    problems.push(
      "Güvenlik Uyarısı (HTTP): Chrome ve Safari ziyaretçilere 'Güvenli Değil' uyarısı gösteriyor, kurumsal güveni zedeliyor."
    );
  }

  // 5. CMS / Framework Bottlenecks
  if (scan.technologies.includes("Wix") || scan.technologies.includes("Squarespace")) {
    problems.push(
      `Hazır Şablon Sınırlaması (${scan.technologies.join(", ")}): Standart şablonlar yavaş çalışır ve özelleştirmeye kapalıdır.`
    );
  } else if (scan.technologies.includes("WordPress") && scan.responseTimeMs > 1000) {
    problems.push("Ağır WordPress Altyapısı: Eklenti fazlalığı veya eski tema yükü siteyi hantallaştırıyor.");
  }

  // Build tailor-made cold-call pitch
  let salesPitch = "";
  if (!isMobileResponsive && !hasWhatsApp) {
    salesPitch =
      "Hocam merhaba, web sitenizi cep telefonundan inceledim; sayfa mobilde kayma yapıyor ve doğrudan tek tıkla WhatsApp randevu butonu bulunmuyor. Google'dan gelen müşterilerin %80'i mobilden ulaşıyor. Sayfanızı telefonlara tam oturan, modern ve tek tıkla WhatsApp'tan randevu yazdıran bir yapıya kavuşturalım.";
  } else if (!isMobileResponsive) {
    salesPitch =
      "Hocam merhaba, web siteniz masaüstünde fena görünmüyor ancak telefonda açıldığında mobil uyumu olmadığı için yazılar küçücük kalıyor. Sizi Google'dan arayanların neredeyse tamamı telefonda. Sitenizi modern, mobil öncelikli hızlı bir yapıya geçirelim.";
  } else if (!scan.isHttps) {
    salesPitch =
      "Hocam merhaba, sitenize girildiğinde tarayıcı doğrudan kırmızı 'Güvenli Değil' uyarısı veriyor. Bu durum potansiyel müşterilerde ciddi güvensizlik yaratıyor. Güvenli, şifreli ve modern yeni bir altyapıya geçelim.";
  } else if (!hasWhatsApp) {
    salesPitch =
      "Hocam merhaba, web siteniz aktif ancak ziyaretçiyi anında sıcak kontağa çevirecek bir WhatsApp veya hızlı teklif/randevu aksiyonu yok. Müşteriler girip sadece bakıp çıkıyor. Sayfanıza anında dönüşüm getirecek modern bir düzenleme yapalım.";
  } else if (scan.responseTimeMs > 1500) {
    salesPitch =
      `Hocam merhaba, web siteniz şu an ortalama ${scan.responseTimeMs} milisaniyede açılıyor. Cep telefonundan giren kullanıcılar site açılana kadar beklemeyip geri tuşuna basıyor. Sayfanızı saniyenin altında açılan ışık hızında yeni nesil bir web sitesine dönüştürelim.`;
  } else {
    salesPitch =
      "Hocam merhaba, web sitenizi inceledim. Temel yapınız çalışıyor ancak günümüzün modern tasarım ve dönüşüm standartlarının gerisinde kalmış görünüyor. Markanızı Google'da rakiplerinizin önüne geçirecek prestijli ve yeni nesil bir tasarımla yenileyelim.";
  }

  const deepData: DeepAuditData = {
    hasWhatsApp,
    hasCallButton,
    isMobileResponsive,
    speedLabel,
    salesPitch,
    problems,
  };

  return {
    scan,
    deepData,
  };
}
