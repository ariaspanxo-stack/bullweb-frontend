import { useState, useEffect } from 'react';

/** Hook que expone el prompt de instalación PWA y el handler de instalación. */
export function useInstallPWA() {
  const [prompt, setPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setPrompt(null);
  };

  return { canInstall: !!prompt, handleInstall };
}

/** Componente vacío — el banner flotante fue eliminado.
 *  El botón de instalación se muestra en el Header. */
export function InstallPWA() {
  return null;
}
