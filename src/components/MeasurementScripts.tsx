import { PIXEL_ID, GA4_ID, measurementActive } from '../lib/measurement';

/**
 * #237 — FASE B: scripts de Meta Pixel + GA4 para la app.
 * Réplica del patrón MeasurementScripts del landing (#228): renderiza los
 * <script> SOLO si los IDs están definidos (≠ 'PENDING'). Montado en
 * main.tsx: hoy queda INYECTADO-INACTIVO (null) hasta que lleguen los
 * IDs reales — ver runbook de activación en el ADN #237.
 */
export default function MeasurementScripts() {
  if (!measurementActive) return null;

  return (
    <>
      {GA4_ID !== 'PENDING' && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4_ID}');`,
            }}
          />
        </>
      )}
      {PIXEL_ID !== 'PENDING' && (
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL_ID}');fbq('track','PageView');`,
          }}
        />
      )}
    </>
  );
}
