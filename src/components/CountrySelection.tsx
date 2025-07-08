import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Globe } from "lucide-react";
import { useTranslations } from "@/utils/translations";
import { SupportedLanguage } from "@/types/zvv";

interface CountrySelectionProps {
  selectedCountry: string;
  language: SupportedLanguage;
  onCountrySelect: (country: string) => void;
}

interface Country {
  id: string;
  name: string;
  flag: string;
  supported: boolean;
  description: string;
}

export function CountrySelection({ selectedCountry, language, onCountrySelect }: CountrySelectionProps) {
  const { t } = useTranslations(language);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  const countries: Country[] = [
    {
      id: 'switzerland',
      name: t.countrySwitzerlandName || 'Schweiz',
      flag: '🇨🇭',
      supported: true,
      description: t.countrySwitzerlandDesc || 'Vollständig unterstützt mit ZVV API'
    },
    {
      id: 'canada',
      name: t.countryCanadaName || 'Canada (Kelowna)',
      flag: '🇨🇦',
      supported: true,
      description: t.countryCanadaDesc || 'BC Transit with live data'
    },
    {
      id: 'germany',
      name: t.countryGermanyName || 'Deutschland',
      flag: '🇩🇪',
      supported: false,
      description: t.countryGermanyDesc || 'Kommt bald'
    },
    {
      id: 'austria',
      name: t.countryAustriaName || 'Österreich',
      flag: '🇦🇹',
      supported: false,
      description: t.countryAustriaDesc || 'Kommt bald'
    },
    {
      id: 'france',
      name: t.countryFranceName || 'Frankreich',
      flag: '🇫🇷',
      supported: false,
      description: t.countryFranceDesc || 'Kommt bald'
    },
    {
      id: 'italy',
      name: t.countryItalyName || 'Italien',
      flag: '🇮🇹',
      supported: false,
      description: t.countryItalyDesc || 'Kommt bald'
    }
  ];

  const handleCountrySelect = (countryId: string) => {
    const country = countries.find(c => c.id === countryId);
    if (country?.supported) {
      onCountrySelect(countryId);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Globe className="h-12 w-12 text-primary mr-4" />
          <h2 className="text-4xl font-bold text-primary font-mono">
            {t.selectCountry || 'LAND AUSWÄHLEN'}
          </h2>
        </div>
        <p className="text-muted-foreground font-mono text-lg">
          {t.selectCountrySubtitle || 'Wählen Sie Ihr Land für die Fahrplan-Anzeige'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {countries.map((country) => (
          <Card
            key={country.id}
            className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
              selectedCountry === country.id
                ? 'ring-2 ring-primary border-primary shadow-lg'
                : country.supported
                ? 'hover:border-primary hover:shadow-md'
                : 'opacity-60 cursor-not-allowed'
            } ${!country.supported ? 'grayscale' : ''}`}
            onClick={() => handleCountrySelect(country.id)}
            onMouseEnter={() => setHoveredCountry(country.id)}
            onMouseLeave={() => setHoveredCountry(null)}
          >
            <CardHeader className="text-center pb-2">
              <div className="text-6xl mb-4 transition-transform duration-300">
                {country.flag}
              </div>
              <CardTitle className="font-mono text-xl">
                {country.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="font-mono text-sm mb-4">
                {country.description}
              </CardDescription>
              
              {country.supported ? (
                <div className="flex items-center justify-center">
                  <Button
                    variant={selectedCountry === country.id ? "default" : "outline"}
                    className="font-mono w-full"
                    disabled={!country.supported}
                  >
                    {selectedCountry === country.id ? (
                      <>
                        {t.selected || 'Ausgewählt'}
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </>
                    ) : (
                      t.selectCountryButton || 'Auswählen'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-muted-foreground font-mono text-sm">
                    {t.comingSoon || 'Kommt bald'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {(selectedCountry === 'switzerland' || selectedCountry === 'canada') && (
        <div className="text-center">
          <Button
            onClick={() => onCountrySelect(selectedCountry)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 border-2 border-primary shadow-lg font-bold px-12 py-6 text-xl font-mono rounded-lg transition-all duration-200 hover:scale-105"
          >
            {t.continue || 'WEITER'}
            <ChevronRight className="h-6 w-6 ml-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
