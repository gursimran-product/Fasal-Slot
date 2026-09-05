"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

export default function LandingPage() {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    if (user.role === "farmer") router.replace("/home");
    else if (user.role === "agent") router.replace("/agent");
    else router.replace("/govt");
  }, [status, user, router]);

  // Authenticated visitors are redirected above; skip the flash of landing content.
  if (status === "authenticated") return null;

  return (
    <main className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-6 sm:px-10">
        <span className="text-2xl font-bold text-green-800">Fasal Slot</span>
        <Link href="/staff/login" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
          Staff login
        </Link>
      </header>

      <section className="grid gap-10 px-6 py-8 sm:px-10 lg:grid-cols-2 lg:items-center lg:py-16">
        <div>
          <h1 className="mb-4 text-4xl font-bold leading-tight text-neutral-900 sm:text-5xl">
            Know when to bring your crop. Every time.
          </h1>
          <p className="mb-8 text-lg text-neutral-700">
            Fasal Slot gives farmers, agents, and procurement centres a shared, live view of
            arrival slots, queue position, and sale status for MSP crop procurement.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/login"
              className="flex min-h-[56px] items-center rounded-xl bg-green-700 px-8 text-lg font-semibold text-white transition hover:bg-green-800"
            >
              Book a slot
            </Link>
            <Link
              href="/staff/login"
              className="flex min-h-[56px] items-center rounded-xl border-2 border-neutral-400 px-8 text-lg font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Agent / Government login
            </Link>
          </div>
        </div>

        <div className="relative h-64 overflow-hidden rounded-2xl sm:h-80 lg:h-[480px]">
          <Image
            src="/farmer-field.jpg"
            alt="A farmer walking through a mustard field at sunrise"
            fill
            priority
            className="object-cover"
          />
        </div>
      </section>

      <section className="grid gap-8 border-t border-neutral-200 px-6 py-12 sm:px-10 sm:grid-cols-3">
        <div>
          <h2 className="mb-2 text-lg font-bold text-neutral-900">Farmers</h2>
          <p className="text-neutral-700">
            Book a slot by phone call, SMS, or the web, and know your queue position before you
            leave home.
          </p>
        </div>
        <div>
          <h2 className="mb-2 text-lg font-bold text-neutral-900">Agents</h2>
          <p className="text-neutral-700">
            Manage every farmer you represent and batch-book slots for all of them at once.
          </p>
        </div>
        <div>
          <h2 className="mb-2 text-lg font-bold text-neutral-900">Government</h2>
          <p className="text-neutral-700">
            See live centre queues and cross-centre backlog risk before it becomes a crisis.
          </p>
        </div>
      </section>
    </main>
  );
}
