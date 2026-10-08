/* El detalle de una descripción, a un hover de distancia (08-oct-2026).
 *
 * Las cabeceras de sección llevan UNA línea a la vista; la letra pequeña
 * (de dónde sale el dato, sus límites) va aquí, en el tooltip nativo, en vez
 * de alargar el párrafo a tres líneas. */
export default function InfoHint({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      role="note"
      tabIndex={0}
      className={`inline-grid place-items-center w-3.5 h-3.5 ml-1 align-[-2px] rounded-full border border-current text-[9px] font-semibold leading-none text-text-muted hover:text-accent focus:text-accent cursor-help select-none ${className}`}
    >
      i
    </span>
  );
}
