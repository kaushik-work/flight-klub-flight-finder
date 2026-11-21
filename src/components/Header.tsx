import Image from "next/image";
import Link from "next/link";
import HeaderActions from "@/components/HeaderActions";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
        <Link href="/" aria-label="Flight Klub home" className="shrink-0">
          <Image src="/flight-klub.svg" alt="Flight Klub" width={360} height={180} priority className="-my-1 h-12 w-auto sm:-my-3 sm:h-16 md:-my-4 md:h-20 lg:-my-6 lg:h-28" />
        </Link>
        <HeaderActions />
      </div>
    </header>
  );
}
