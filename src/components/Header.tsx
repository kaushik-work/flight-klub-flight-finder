import Image from "next/image";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
        <a href="/" aria-label="Flight Klub home">
          <Image src="/flight-klub.svg" alt="Flight Klub" width={160} height={80} priority className="h-10 w-auto" />
        </a>
        <nav className="font-label flex items-center gap-5 text-sm font-medium text-muted-foreground">
          <a href="#fares" className="hover:text-primary">Flights</a>
          <a href="#months" className="hover:text-primary">Months</a>
          <a href="https://wa.me/" className="rounded-full bg-primary px-4 py-2 text-primary-foreground hover:opacity-90">WhatsApp</a>
        </nav>
      </div>
    </header>
  );
}
