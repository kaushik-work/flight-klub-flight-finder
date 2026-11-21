import Image from "next/image";
import Link from "next/link";
import HeaderActions from "@/components/HeaderActions";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
        <Link href="/" aria-label="Flight Klub home" className="shrink-0">
          <Image src="/flight-klub.svg" alt="Flight Klub" width={360} height={180} priority className="-my-1 h-[2.7rem] w-auto sm:-my-3 sm:h-[3.6rem] md:-my-4 md:h-[4.5rem] lg:-my-6 lg:h-[6.3rem]" />
        </Link>
        <HeaderActions />
      </div>
    </header>
  );
}
