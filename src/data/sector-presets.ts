export interface SectorPreset {
  id: string;
  label: string;
  searchTerm: string;
}

export interface SectorCategoryGroup {
  groupName: string;
  presets: SectorPreset[];
}

export const SECTOR_PRESETS: SectorCategoryGroup[] = [
  {
    groupName: "Sağlık & Medikal",
    presets: [
      { id: "dental", label: "Diş Klinikleri & Diş Hekimleri", searchTerm: "Diş Kliniği" },
      { id: "clinic", label: "Özel Muayenehane & Doktorlar", searchTerm: "Klinik" },
      { id: "plastic_surgery", label: "Estetik & Plastik Cerrahi", searchTerm: "Estetik Cerrah" },
      { id: "eye_clinic", label: "Göz Hastalıkları & Lazer", searchTerm: "Göz Kliniği" },
      { id: "physiotherapy", label: "Fizyoterapi & Manuel Terapi", searchTerm: "Fizyoterapi Merkezi" },
      { id: "psychology", label: "Psikolog & Psikoterapi", searchTerm: "Psikolog Ofisi" },
      { id: "dietitian", label: "Diyetisyen & Beslenme Danışmanlığı", searchTerm: "Diyetisyen" },
      { id: "veterinary", label: "Veteriner Klinikleri", searchTerm: "Veteriner Kliniği" },
    ],
  },
  {
    groupName: "Hukuk, Finans & Kurumsal",
    presets: [
      { id: "lawyer", label: "Hukuk & Avukatlık Büroları", searchTerm: "Avukatlık Bürosu" },
      { id: "accounting", label: "Mali Müşavirler & Muhasebe", searchTerm: "Mali Müşavir" },
      { id: "insurance", label: "Sigorta Acenteleri", searchTerm: "Sigorta Acentesi" },
      { id: "translation", label: "Yeminli Tercüme Büroları", searchTerm: "Tercüme Bürosu" },
      { id: "customs", label: "Gümrük Müşavirliği", searchTerm: "Gümrük Müşavirliği" },
    ],
  },
  {
    groupName: "Mimarlık, İnşaat & Gayrimenkul",
    presets: [
      { id: "architecture", label: "Mimarlık & İç Mimarlık Ofisleri", searchTerm: "Mimarlık Ofisi" },
      { id: "engineering", label: "Mühendislik & Proje Ofisleri", searchTerm: "Mühendislik Ofisi" },
      { id: "construction", label: "İnşaat & Taahhüt Firmaları", searchTerm: "İnşaat Firması" },
      { id: "real_estate", label: "Gayrimenkul Danışmanlığı & Emlak", searchTerm: "Gayrimenkul Danışmanlığı" },
      { id: "landscape", label: "Peyzaj & Bahçe Tasarımı", searchTerm: "Peyzaj Mimarlığı" },
    ],
  },
  {
    groupName: "Güzellik & Kişisel Bakım",
    presets: [
      { id: "beauty_center", label: "Güzellik Merkezleri & Epilasyon", searchTerm: "Güzellik Merkezi" },
      { id: "hairdresser", label: "Kuaför & Saç Tasarım", searchTerm: "Kuaför" },
      { id: "spa_massage", label: "Spa & Masaj Merkezleri", searchTerm: "Spa Merkezi" },
      { id: "tattoo", label: "Dövme & Piercing Stüdyoları", searchTerm: "Dövme Stüdyosu" },
    ],
  },
  {
    groupName: "Otomotiv & Sanayi",
    presets: [
      { id: "car_service", label: "Oto Servis & Mekanik Bakım", searchTerm: "Oto Servis" },
      { id: "car_expertise", label: "Oto Ekspertiz Merkezleri", searchTerm: "Oto Ekspertiz" },
      { id: "car_detailing", label: "Oto Detailing & Pasta Cila", searchTerm: "Oto Detailing" },
      { id: "rent_a_car", label: "Araç Kiralama (Rent a Car)", searchTerm: "Rent a Car" },
      { id: "towing", label: "Çekici & Yol Yardım", searchTerm: "Oto Çekici" },
    ],
  },
  {
    groupName: "Yeme, İçme & Hizmet",
    presets: [
      { id: "restaurant", label: "Restoran & Lokantalar", searchTerm: "Restoran" },
      { id: "cafe", label: "Cafe & Kahve Dükkanları", searchTerm: "Cafe" },
      { id: "bakery", label: "Pastane & Fırınlar", searchTerm: "Pastane" },
      { id: "catering", label: "Catering & Toplu Yemek", searchTerm: "Catering Firması" },
    ],
  },
  {
    groupName: "Eğitim & Kurslar",
    presets: [
      { id: "private_course", label: "Özel Kurslar & Etüt Merkezleri", searchTerm: "Özel Kurs" },
      { id: "driving_school", label: "Sürücü Kursları", searchTerm: "Sürücü Kursu" },
      { id: "language_school", label: "Yabancı Dil Kursları", searchTerm: "Yabancı Dil Kursu" },
      { id: "music_dance", label: "Dans & Müzik Kursları", searchTerm: "Müzik Kursu" },
      { id: "kindergarten", label: "Özel Anaokulu & Kreşler", searchTerm: "Özel Anaokulu" },
    ],
  },
  {
    groupName: "Teknik Servis & Ev Hizmetleri",
    presets: [
      { id: "hvac", label: "Kombi & Klima Servisleri", searchTerm: "Kombi Klima Servisi" },
      { id: "electrician", label: "Elektrik & Aydınlatma", searchTerm: "Elektrikçi" },
      { id: "plumber", label: "Tesisat & Su Tesisatı", searchTerm: "Su Tesisatçısı" },
      { id: "moving", label: "Evden Eve Nakliyat", searchTerm: "Evden Eve Nakliyat" },
      { id: "cleaning", label: "Temizlik Şirketleri", searchTerm: "Temizlik Şirketi" },
    ],
  },
];
