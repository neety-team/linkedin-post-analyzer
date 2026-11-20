import { Link } from 'react-router-dom';

/**
 * LinkedIn / Newsletter (2026-11-20): los dos canales de contenido, cada uno en
 * su página. Va en la cabecera de /semana y de /newsletter; la newsletter no
 * tiene enlace en la barra de navegación.
 */
export default function CanalSelector({ actual }: { actual: 'linkedin' | 'newsletter' }) {
  const opcion = (to: string, canal: 'linkedin' | 'newsletter', texto: string) => {
    const activo = canal === actual;
    return (
      <Link
        to={to}
        aria-current={activo ? 'page' : undefined}
        className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors whitespace-nowrap ${
          activo ? 'bg-text-primary text-bg-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
        }`}
      >
        {texto}
      </Link>
    );
  };
  return (
    <nav aria-label="Canal" className="inline-flex gap-0.5 p-1 rounded-full bg-bg-card border border-border shadow-sm">
      {opcion('/semana', 'linkedin', 'LinkedIn')}
      {opcion('/newsletter', 'newsletter', 'Newsletter')}
    </nav>
  );
}
