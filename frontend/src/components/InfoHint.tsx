/* El detalle de una descripción, a un hover de distancia (08-oct-2026).
 *
 * Las cabeceras de sección llevan UNA línea a la vista; la letra pequeña
 * (de dónde sale el dato, sus límites) va aquí, en el tooltip nativo, en vez
 * de alargar el párrafo a tres líneas.
 *
 * Icono en SVG y no una «i» de texto (16-oct-2026, Iker): la «i» de Switzer a
 * 9px no se leía, y al ir en la línea base del texto caía por debajo de las
 * etiquetas en mayúsculas. `align-middle` lo centra en una frase; en una fila
 * flex lo centra `items-center` del padre. */
export default function InfoHint({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      role="note"
      tabIndex={0}
      className={`inline-flex shrink-0 ml-1 align-middle -mt-0.5 text-text-muted hover:text-accent focus:text-accent focus:outline-none cursor-help select-none ${className}`}
    >
      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <circle cx="8" cy="8" r="6.8" />
        <path d="M8 7.2v4.3" strokeLinecap="round" />
        <circle cx="8" cy="4.9" r="0.95" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}
