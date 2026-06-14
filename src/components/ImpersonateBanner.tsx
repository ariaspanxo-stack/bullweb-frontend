import { useState, useEffect } from 'react';
import { Eye, X } from 'lucide-react';

interface ImpersonateTenant {
  id: string;
  name: string;
  slug: string;
}

export function ImpersonateBanner() {
  const [tenant, setTenant] = useState<ImpersonateTenant | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('impersonate_tenant');
    if (raw) {
      try { setTenant(JSON.parse(raw)); } catch { /* noop */ }
    }
  }, []);

  if (!tenant) return null;

  function handleExit() {
    // Restaurar todos los backups
    const backupBullweb    = localStorage.getItem('bullweb_token_backup');
    const backupAuthStore  = localStorage.getItem('auth-storage-backup');
    const backupSAToken    = localStorage.getItem('superadmin_token_backup');

    if (backupBullweb !== null)   localStorage.setItem('bullweb_token', backupBullweb);
    else                          localStorage.removeItem('bullweb_token');

    if (backupAuthStore !== null) localStorage.setItem('auth-storage', backupAuthStore);
    else                          localStorage.removeItem('auth-storage');

    if (backupSAToken)            localStorage.setItem('superadmin_token', backupSAToken);

    // Limpiar estado de impersonación
    localStorage.removeItem('impersonate_tenant');
    localStorage.removeItem('bullweb_token_backup');
    localStorage.removeItem('auth-storage-backup');
    localStorage.removeItem('superadmin_token_backup');

    // Volver al panel SA
    window.location.href = 'https://app.bullwebchile.com/superadmin';
  }

  return (
    <div
      style={{
        position:       'fixed',
        top:            0,
        left:           0,
        right:          0,
        zIndex:         9999,
        background:     '#dc2626',
        color:          'white',
        padding:        '8px 16px',
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        fontSize:       '14px',
        fontWeight:     500,
        boxShadow:      '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Eye size={16} />
        Modo SuperAdmin — viendo como: <strong style={{ marginLeft: 4 }}>{tenant.name}</strong>
      </span>
      <button
        onClick={handleExit}
        style={{
          background:   'white',
          color:        '#dc2626',
          border:       'none',
          padding:      '4px 14px',
          borderRadius: '4px',
          cursor:       'pointer',
          fontWeight:   700,
          display:      'flex',
          alignItems:   'center',
          gap:          '6px',
          fontSize:     '13px',
        }}
      >
        <X size={13} />
        Volver al panel SA
      </button>
    </div>
  );
}
