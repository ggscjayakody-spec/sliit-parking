import Link from "next/link";
import { ButtonLink, Card, Logo } from "@/components/ui";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-12">
      <Card className="w-full max-w-lg px-8 py-12 text-center">
        <div className="flex justify-center">
          <Logo size={72} />
        </div>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">SLIIT PARKING</h1>
        <p className="mx-auto mt-3 max-w-sm text-ink-soft">
          Register your vehicle, get a QR vehicle pass, and pay parking fees online.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <ButtonLink href="/login" variant="primary" className="min-w-32">
            Log in
          </ButtonLink>
          <ButtonLink href="/register" className="min-w-32">
            Register
          </ButtonLink>
        </div>
      </Card>

      <nav className="mt-8 flex gap-6 text-sm font-semibold text-ink-soft">
        <Link href="/enforcer/login" className="hover:text-ink">
          Enforcer portal
        </Link>
        <Link href="/admin/login" className="hover:text-ink">
          Admin portal
        </Link>
      </nav>
    </main>
  );
}
