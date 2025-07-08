
import { useState } from "react";
import { Settings } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SupportedLanguage } from "@/types/zvv";
import { useTranslations } from "@/utils/translations";

interface SettingsMenuProps {
  language: SupportedLanguage;
  onLanguageChange: (language: SupportedLanguage) => void;
  onReconfigureStations: () => void;
  onEditColors: () => void;
}

export function SettingsMenu({
  language,
  onLanguageChange,
  onReconfigureStations,
  onEditColors
}: SettingsMenuProps) {
  const { t } = useTranslations(language);
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="secondary" 
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg hover:scale-105 transition-transform"
            aria-label={t.settings}
          >
            <Settings className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 font-mono" align="end">
          <DropdownMenuLabel>{t.settings}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 text-xs font-normal text-muted-foreground">
              {t.language}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={language} onValueChange={(value) => onLanguageChange(value as SupportedLanguage)}>
              <DropdownMenuRadioItem value="de">{t.german}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="en">{t.english}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="fr">{t.french}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="it">{t.italian}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="gsw">{t.swissGerman}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            className="cursor-pointer font-mono" 
            onClick={onEditColors}
          >
            {t.editColors}
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            className="cursor-pointer font-mono" 
            onClick={onReconfigureStations}
          >
            {t.reconfigureStations}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
