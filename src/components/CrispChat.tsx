import { useEffect } from 'react'

declare global {
  interface Window {
    $crisp: any[]
    CRISP_WEBSITE_ID: string
  }
}

interface CrispChatProps {
  userName?: string
  userEmail?: string
}

export default function CrispChat({ userName, userEmail }: CrispChatProps) {
  useEffect(() => {
    // Evitar duplicar el script si ya existe
    if (document.getElementById('crisp-script')) return

    window.$crisp = []
    window.CRISP_WEBSITE_ID = 'fed96cdf-2f4b-4b39-88f9-136934183a20'

    const script = document.createElement('script')
    script.id = 'crisp-script'
    script.src = 'https://client.crisp.chat/l.js'
    script.async = true
    document.head.appendChild(script)

    script.onload = () => {
      // Ocultar el widget flotante al cargar
      window.$crisp.push(['do', 'chat:hide'])

      if (userName) window.$crisp.push(['set', 'user:nickname', [userName]])
      if (userEmail) window.$crisp.push(['set', 'user:email', [userEmail]])

      // Re-ocultar el widget cada vez que el usuario cierra el chat
      window.$crisp.push(['on', 'chat:closed', () => {
        window.$crisp.push(['do', 'chat:hide'])
      }])
    }
  }, [userName, userEmail])

  return null
}
