import { Button } from '../components/ui/index.jsx';
import { LogoMark } from '../components/layout/Logo.jsx';

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <LogoMark className="h-14 w-14 text-brand-300" />
      <p className="mt-8 font-display text-6xl text-brand-600">404</p>
      <h1 className="mt-3 text-3xl">Esta página no existe</h1>
      <p className="text-pretty mt-3 max-w-sm text-[15px] leading-relaxed text-ink-500">
        Puede que el enlace haya cambiado. Desde el inicio encuentras todo: servicios, ocasiones y la
        agenda en línea.
      </p>
      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <Button to="/">Volver al inicio</Button>
        <Button to="/reservar" variant="secondary">
          Reservar una cita
        </Button>
      </div>
    </div>
  );
}
