
import { useState } from "react";
import { Settings, Maximize, Minimize } from "lucide-react";
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
import { Slider } from "@/components/ui/slider";
import { SupportedLanguage, Theme } from "@/types/zvv";
import { useTranslations } from "@/utils/translations";

interface SettingsMenuProps {
  language: SupportedLanguage;
  theme: Theme;
  fontSize: number;
  isFullscreen: boolean;
  onLanguageChange: (language: SupportedLanguage) => void;
  onThemeChange: (theme: Theme) => void;
  onFontSizeChange: (fontSize: number) => void;
  onFullscreenToggle: () => void;
  onReconfigureStations: () => void;
  onEditColors: () => void;
}

export function SettingsMenu({
  language,
  theme,
  fontSize,
  isFullscreen,
  onLanguageChange,
  onThemeChange,
  onFontSizeChange,
  onFullscreenToggle,
  onReconfigureStations,
  onEditColors
}: SettingsMenuProps) {
  const { t } = useTranslations(language);
  const [open, setOpen] = useState(false);

  return (
    <div className={`fixed z-50 ${isFullscreen ? 'bottom-4 right-4' : 'bottom-6 right-6'}`}>
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
        <DropdownMenuContent className="w-64 font-mono" align="end">
          <DropdownMenuLabel>{t.settings}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 text-xs font-normal text-muted-foreground">
              {t.fontSize}
            </DropdownMenuLabel>
            <div className="px-3 py-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs">50%</span>
                <Slider
                  value={[fontSize]}
                  onValueChange={(value) => onFontSizeChange(value[0])}
                  max={200}
                  min={50}
                  step={10}
                  className="flex-1"
                />
                <span className="text-xs">200%</span>
              </div>
              <div className="text-center text-xs text-muted-foreground mt-1">
                {fontSize}%
              </div>
            </div>
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            className="cursor-pointer font-mono" 
            onClick={onFullscreenToggle}
          >
            {isFullscreen ? (
              <>
                <Minimize className="h-4 w-4 mr-2" />
                {t.exitFullscreen}
              </>
            ) : (
              <>
                <Maximize className="h-4 w-4 mr-2" />
                {t.fullscreen}
              </>
            )}
          </DropdownMenuItem>
          
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
          
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 text-xs font-normal text-muted-foreground">
              {t.theme}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme} onValueChange={(value) => onThemeChange(value as Theme)}>
              <DropdownMenuRadioItem value="default">{t.themeDefault}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="led">{t.themeLed}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="blackwhite">{t.themeBlackWhite}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="modern">{t.themeModern}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="classic">{t.themeClassic}</DropdownMenuRadioItem>
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

