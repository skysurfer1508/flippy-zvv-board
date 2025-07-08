
import { SupportedLanguage } from "@/types/zvv";

export interface Translations {
  // Headers
  appTitle: string;
  appSubtitle: string;
  
  // Station Count
  stationCountTitle: string;
  stationCountSubtitle: string;
  stationCountDesc: string;
  
  // Station Selection
  stationSelectionTitle: string;
  stationSelectionSubtitle: string;
  stationLabel: string;
  stationSearchPlaceholder: string;
  nextToCustomization: string;
  backToStationCount: string;
  
  // Customization
  customizationTitle: string;
  customizationStationOf: string;
  displayNameLabel: string;
  lineColorsLabel: string;
  loadingLines: string;
  noLinesAvailable: string;
  previousStation: string;
  nextStation: string;
  finished: string;
  backToStationSelection: string;
  
  // Monitoring
  platform: string;
  now: string;
  noDataAvailable: string;
  loadingDepartures: string;
  errorLoadingDepartures: string;
  tryAgain: string;
  
  // Settings Menu
  settings: string;
  language: string;
  german: string;
  english: string;
  french: string;
  italian: string;
  swissGerman: string;
  editColors: string;
  reconfigureStations: string;
  
  // Footer
  dataFrom: string;
}

const de: Translations = {
  // Headers
  appTitle: "ZVV ABFAHRTSZEITEN",
  appSubtitle: "Live-Anzeige für mehrere Stationen",
  
  // Station Count
  stationCountTitle: "STATIONSANZAHL WÄHLEN",
  stationCountSubtitle: "Wie viele Stationen möchtest du anzeigen?",
  stationCountDesc: "Wähle die Anzahl der Stationen aus, die du gleichzeitig auf der Anzeigetafel sehen möchtest.",
  
  // Station Selection
  stationSelectionTitle: "STATIONEN AUSWÄHLEN",
  stationSelectionSubtitle: (count: number) => `Wähle ${count} Station${count > 1 ? 'en' : ''} für die Abfahrtszeiten-Anzeige`,
  stationLabel: (index: number) => `Station ${index}`,
  stationSearchPlaceholder: (index: number) => `Station ${index} suchen...`,
  nextToCustomization: "WEITER ZUR ANPASSUNG",
  backToStationCount: "ZURÜCK ZUR STATIONSANZAHL",
  
  // Customization
  customizationTitle: "STATION ANPASSEN",
  customizationStationOf: (index: number, total: number, name: string) => `Station ${index} von ${total}: ${name}`,
  displayNameLabel: "ANZEIGENAME FÜR STATION",
  lineColorsLabel: "LINIENFARBEN ANPASSEN",
  loadingLines: "Lade verfügbare Linien...",
  noLinesAvailable: "Keine Linien verfügbar oder Daten konnten nicht geladen werden.",
  previousStation: "VORHERIGE STATION",
  nextStation: "NÄCHSTE STATION",
  finished: "FERTIG",
  backToStationSelection: "ZURÜCK ZUR STATIONSAUSWAHL",
  
  // Monitoring
  platform: "Gl.",
  now: "Jetzt",
  noDataAvailable: "Keine Abfahrten verfügbar",
  loadingDepartures: "Lade Abfahrtszeiten...",
  errorLoadingDepartures: "Fehler beim Laden der Abfahrtszeiten",
  tryAgain: "Nochmals versuchen",
  
  // Settings Menu
  settings: "Einstellungen",
  language: "Sprache",
  german: "Deutsch",
  english: "Englisch",
  french: "Französisch",
  italian: "Italienisch",
  swissGerman: "Schweizerdeutsch",
  editColors: "Farben anpassen",
  reconfigureStations: "Stationen neu konfigurieren",
  
  // Footer
  dataFrom: "DATEN VON TRANSPORT.OPENDATA.CH",
};

const en: Translations = {
  // Headers
  appTitle: "ZVV DEPARTURE TIMES",
  appSubtitle: "Live display for multiple stations",
  
  // Station Count
  stationCountTitle: "SELECT NUMBER OF STATIONS",
  stationCountSubtitle: "How many stations would you like to display?",
  stationCountDesc: "Choose the number of stations you want to see simultaneously on the display board.",
  
  // Station Selection
  stationSelectionTitle: "SELECT STATIONS",
  stationSelectionSubtitle: (count: number) => `Select ${count} station${count > 1 ? 's' : ''} for the departure time display`,
  stationLabel: (index: number) => `Station ${index}`,
  stationSearchPlaceholder: (index: number) => `Search station ${index}...`,
  nextToCustomization: "CONTINUE TO CUSTOMIZATION",
  backToStationCount: "BACK TO STATION COUNT",
  
  // Customization
  customizationTitle: "CUSTOMIZE STATION",
  customizationStationOf: (index: number, total: number, name: string) => `Station ${index} of ${total}: ${name}`,
  displayNameLabel: "DISPLAY NAME FOR STATION",
  lineColorsLabel: "CUSTOMIZE LINE COLORS",
  loadingLines: "Loading available lines...",
  noLinesAvailable: "No lines available or data could not be loaded.",
  previousStation: "PREVIOUS STATION",
  nextStation: "NEXT STATION",
  finished: "FINISH",
  backToStationSelection: "BACK TO STATION SELECTION",
  
  // Monitoring
  platform: "Pl.",
  now: "Now",
  noDataAvailable: "No departures available",
  loadingDepartures: "Loading departure times...",
  errorLoadingDepartures: "Error loading departure times",
  tryAgain: "Try again",
  
  // Settings Menu
  settings: "Settings",
  language: "Language",
  german: "German",
  english: "English",
  french: "French",
  italian: "Italian",
  swissGerman: "Swiss German",
  editColors: "Edit colors",
  reconfigureStations: "Reconfigure stations",
  
  // Footer
  dataFrom: "DATA FROM TRANSPORT.OPENDATA.CH",
};

const fr: Translations = {
  // Headers
  appTitle: "HORAIRES DE DÉPART ZVV",
  appSubtitle: "Affichage en direct pour plusieurs stations",
  
  // Station Count
  stationCountTitle: "CHOISIR LE NOMBRE DE STATIONS",
  stationCountSubtitle: "Combien de stations souhaitez-vous afficher ?",
  stationCountDesc: "Choisissez le nombre de stations que vous souhaitez voir simultanément sur le tableau d'affichage.",
  
  // Station Selection
  stationSelectionTitle: "SÉLECTIONNER LES STATIONS",
  stationSelectionSubtitle: (count: number) => `Sélectionnez ${count} station${count > 1 ? 's' : ''} pour l'affichage des horaires de départ`,
  stationLabel: (index: number) => `Station ${index}`,
  stationSearchPlaceholder: (index: number) => `Rechercher la station ${index}...`,
  nextToCustomization: "CONTINUER À LA PERSONNALISATION",
  backToStationCount: "RETOUR AU NOMBRE DE STATIONS",
  
  // Customization
  customizationTitle: "PERSONNALISER LA STATION",
  customizationStationOf: (index: number, total: number, name: string) => `Station ${index} sur ${total}: ${name}`,
  displayNameLabel: "NOM D'AFFICHAGE POUR LA STATION",
  lineColorsLabel: "PERSONNALISER LES COULEURS DES LIGNES",
  loadingLines: "Chargement des lignes disponibles...",
  noLinesAvailable: "Aucune ligne disponible ou les données n'ont pas pu être chargées.",
  previousStation: "STATION PRÉCÉDENTE",
  nextStation: "STATION SUIVANTE",
  finished: "TERMINER",
  backToStationSelection: "RETOUR À LA SÉLECTION DES STATIONS",
  
  // Monitoring
  platform: "Quai",
  now: "Maint.",
  noDataAvailable: "Aucun départ disponible",
  loadingDepartures: "Chargement des heures de départ...",
  errorLoadingDepartures: "Erreur lors du chargement des heures de départ",
  tryAgain: "Réessayer",
  
  // Settings Menu
  settings: "Paramètres",
  language: "Langue",
  german: "Allemand",
  english: "Anglais",
  french: "Français",
  italian: "Italien",
  swissGerman: "Suisse allemand",
  editColors: "Modifier les couleurs",
  reconfigureStations: "Reconfigurer les stations",
  
  // Footer
  dataFrom: "DONNÉES DE TRANSPORT.OPENDATA.CH",
};

const it: Translations = {
  // Headers
  appTitle: "ORARI DI PARTENZA ZVV",
  appSubtitle: "Visualizzazione in tempo reale per più stazioni",
  
  // Station Count
  stationCountTitle: "SELEZIONA NUMERO DI STAZIONI",
  stationCountSubtitle: "Quante stazioni vorresti visualizzare?",
  stationCountDesc: "Scegli il numero di stazioni che vuoi vedere simultaneamente sul tabellone.",
  
  // Station Selection
  stationSelectionTitle: "SELEZIONA STAZIONI",
  stationSelectionSubtitle: (count: number) => `Seleziona ${count} stazion${count > 1 ? 'i' : 'e'} per la visualizzazione degli orari di partenza`,
  stationLabel: (index: number) => `Stazione ${index}`,
  stationSearchPlaceholder: (index: number) => `Cerca stazione ${index}...`,
  nextToCustomization: "CONTINUA ALLA PERSONALIZZAZIONE",
  backToStationCount: "TORNA AL NUMERO DI STAZIONI",
  
  // Customization
  customizationTitle: "PERSONALIZZA STAZIONE",
  customizationStationOf: (index: number, total: number, name: string) => `Stazione ${index} di ${total}: ${name}`,
  displayNameLabel: "NOME VISUALIZZATO PER LA STAZIONE",
  lineColorsLabel: "PERSONALIZZA COLORI DELLE LINEE",
  loadingLines: "Caricamento linee disponibili...",
  noLinesAvailable: "Nessuna linea disponibile o impossibile caricare i dati.",
  previousStation: "STAZIONE PRECEDENTE",
  nextStation: "STAZIONE SUCCESSIVA",
  finished: "FINE",
  backToStationSelection: "TORNA ALLA SELEZIONE DELLE STAZIONI",
  
  // Monitoring
  platform: "Bin.",
  now: "Ora",
  noDataAvailable: "Nessuna partenza disponibile",
  loadingDepartures: "Caricamento orari di partenza...",
  errorLoadingDepartures: "Errore durante il caricamento degli orari di partenza",
  tryAgain: "Riprova",
  
  // Settings Menu
  settings: "Impostazioni",
  language: "Lingua",
  german: "Tedesco",
  english: "Inglese",
  french: "Francese",
  italian: "Italiano",
  swissGerman: "Svizzero tedesco",
  editColors: "Modifica colori",
  reconfigureStations: "Riconfigura stazioni",
  
  // Footer
  dataFrom: "DATI DA TRANSPORT.OPENDATA.CH",
};

const gsw: Translations = {
  // Headers
  appTitle: "ZVV ABFAHRTSZYTE",
  appSubtitle: "Live-Aazäig für mehreri Statione",
  
  // Station Count
  stationCountTitle: "STATIONSAZAHL USWÄHLE",
  stationCountSubtitle: "Wie vieli Statione wetsch aazäige?",
  stationCountDesc: "Wähl d'Azahl vo Statione us, wo du glyzytig uf de Azäigtafele gseh wetsch.",
  
  // Station Selection
  stationSelectionTitle: "STATIONE USWÄHLE",
  stationSelectionSubtitle: (count: number) => `Wähl ${count} Station${count > 1 ? 'e' : ''} für d'Abfahrtszyte-Aazäig`,
  stationLabel: (index: number) => `Station ${index}`,
  stationSearchPlaceholder: (index: number) => `Station ${index} sueche...`,
  nextToCustomization: "WYTER ZUR AAPASSIG",
  backToStationCount: "ZRUGG ZUR STATIONSAZAHL",
  
  // Customization
  customizationTitle: "STATION AAPASSÄ",
  customizationStationOf: (index: number, total: number, name: string) => `Station ${index} vo ${total}: ${name}`,
  displayNameLabel: "AAZÄIGNAME FÜR D'STATION",
  lineColorsLabel: "LINIEFARBÄ AAPASSÄ",
  loadingLines: "Lade verfüegbari Linie...",
  noLinesAvailable: "Kei Linie verfüegbar oder Date chönted nöd glade werde.",
  previousStation: "VORIGI STATION",
  nextStation: "NÖCHSTI STATION",
  finished: "FERTIG",
  backToStationSelection: "ZRUGG ZUR STATIONSUSWAL",
  
  // Monitoring
  platform: "Gl.",
  now: "Jetzt",
  noDataAvailable: "Kei Abfahrte verfüegbar",
  loadingDepartures: "Lade Abfahrtszyte...",
  errorLoadingDepartures: "Fehler bim Lade vo de Abfahrtszyte",
  tryAgain: "Nomal probiere",
  
  // Settings Menu
  settings: "Istellige",
  language: "Sprach",
  german: "Düütsch",
  english: "Änglisch",
  french: "Französisch",
  italian: "Italienisch",
  swissGerman: "Schwiizerdüütsch",
  editColors: "Farbä aapassä",
  reconfigureStations: "Statione neu konfiguriere",
  
  // Footer
  dataFrom: "DATE VO TRANSPORT.OPENDATA.CH",
};

export const translations: Record<SupportedLanguage, Translations> = {
  de,
  en,
  fr,
  it,
  gsw
};

// Helper hook for translations
export const useTranslations = (language: SupportedLanguage) => {
  return {
    t: translations[language],
    formatStationSubtitle: (count: number) => {
      return typeof translations[language].stationSelectionSubtitle === 'function'
        ? translations[language].stationSelectionSubtitle(count)
        : translations[language].stationSelectionSubtitle;
    },
    formatStationLabel: (index: number) => {
      return typeof translations[language].stationLabel === 'function'
        ? translations[language].stationLabel(index + 1)
        : `${translations[language].stationLabel} ${index + 1}`;
    },
    formatStationSearchPlaceholder: (index: number) => {
      return typeof translations[language].stationSearchPlaceholder === 'function'
        ? translations[language].stationSearchPlaceholder(index + 1)
        : `${translations[language].stationSearchPlaceholder} ${index + 1}`;
    },
    formatCustomizationStationOf: (index: number, total: number, name: string) => {
      return typeof translations[language].customizationStationOf === 'function'
        ? translations[language].customizationStationOf(index + 1, total, name)
        : `${translations[language].customizationStationOf} ${index + 1} ${total}: ${name}`;
    }
  };
};
