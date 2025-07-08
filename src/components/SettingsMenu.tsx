
import { useState, useEffect } from "react";
import { Settings, Maximize, Minimize, Globe } from "lucide-react";
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SupportedLanguage, Theme } from "@/types/zvv";
import { useTranslations } from "@/utils/translations";
import { useIsMobile } from "@/hooks/use-mobile";

interface SettingsMenuProps {
  language: SupportedLanguage;
  theme: Theme;
  isFullscreen: boolean;
  onLanguageChange: (language: SupportedLanguage) => void;
  onThemeChange: (theme: Theme) => void;
  onFullscreenToggle: () => void;
  onReconfigureStations: () => void;
  onEditColors: () => void;
  onChangeCountry: () => void;
}

export function SettingsMenu({
  language,
  theme,
  isFullscreen,
  onLanguageChange,
  onThemeChange,
  onFullscreenToggle,
  onReconfigureStations,
  onEditColors,
  onChangeCountry
}: SettingsMenuProps) {
  const { t } = useTranslations(language);
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const useMobileLayout = isMobile || isFullscreen;

  const buttonClassName = `fixed z-50 h-12 w-12 rounded-full shadow-lg hover:scale-105 transition-transform ${
    isFullscreen 
      ? 'bottom-4 right-4' 
      : 'bottom-6 right-6'
  }`;

  const SettingsContent = () => (
    <div className="space-y-4 p-4">
      <button 
        className="w-full flex items-center justify-start p-2 hover:bg-muted rounded-md transition-colors text-sm font-mono min-h-[44px]" 
        onClick={() => {
          onFullscreenToggle();
          setOpen(false);
        }}
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
      </button>
      
      <Separator />
      
      <div className="space-y-3">
        <div className="text-sm font-medium text-muted-foreground">
          {t.language}
        </div>
        <div className="space-y-1">
          {[
            { value: 'de', label: t.german },
            { value: 'en', label: t.english },
            { value: 'fr', label: t.french },
            { value: 'it', label: t.italian },
            { value: 'gsw', label: t.swissGerman }
          ].map((lang) => (
            <button
              key={lang.value}
              className={`w-full text-left p-2 rounded-md transition-colors text-sm font-mono min-h-[44px] ${
                language === lang.value 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted'
              }`}
              onClick={() => {
                onLanguageChange(lang.value as SupportedLanguage);
                if (useMobileLayout) setOpen(false);
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
      
      <Separator />
      
      <div className="space-y-3">
        <div className="text-sm font-medium text-muted-foreground">
          {t.theme}
        </div>
        <div className="space-y-1">
          {[
            { value: 'default', label: t.themeDefault },
            { value: 'led', label: t.themeLed },
            { value: 'blackwhite', label: t.themeBlackWhite },
            { value: 'modern', label: t.themeModern },
            { value: 'classic', label: t.themeClassic }
          ].map((themeOption) => (
            <button
              key={themeOption.value}
              className={`w-full text-left p-2 rounded-md transition-colors text-sm font-mono min-h-[44px] ${
                theme === themeOption.value 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted'
              }`}
              onClick={() => {
                onThemeChange(themeOption.value as Theme);
                if (useMobileLayout) setOpen(false);
              }}
            >
              {themeOption.label}
            </button>
          ))}
        </div>
      </div>
      
      <Separator />
      
      <button 
        className="w-full flex items-center justify-start p-2 hover:bg-muted rounded-md transition-colors text-sm font-mono min-h-[44px]" 
        onClick={() => {
          onEditColors();
          setOpen(false);
        }}
      >
        {t.editColors}
      </button>
      
      <button 
        className="w-full flex items-center justify-start p-2 hover:bg-muted rounded-md transition-colors text-sm font-mono min-h-[44px]" 
        onClick={() => {
          onReconfigureStations();
          setOpen(false);
        }}
      >
        {t.reconfigureStations}
      </button>

      <Separator />
      
      <button 
        className="w-full flex items-center justify-start p-2 hover:bg-muted rounded-md transition-colors text-sm font-mono min-h-[44px] text-destructive hover:text-destructive" 
        onClick={() => {
          onChangeCountry();
          setOpen(false);
        }}
      >
        <Globe className="h-4 w-4 mr-2" />
        {t.changeCountry || 'Land ändern'}
      </button>
    </div>
  );

  if (useMobileLayout) {
    return (
      <div className={buttonClassName}>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button 
              variant="secondary" 
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg hover:scale-105 transition-transform"
              aria-label={t.settings}
            >
              <Settings className="h-6 w-6" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[80vh]">
            <DrawerHeader>
              <DrawerTitle className="font-mono">{t.settings}</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto">
              <SettingsContent />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  return (
    <div className={buttonClassName}>
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

          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            className="cursor-pointer font-mono text-destructive focus:text-destructive" 
            onClick={onChangeCountry}
          >
            <Globe className="h-4 w-4 mr-2" />
            {t.changeCountry || 'Land ändern'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
