import Link from "next/link";

import {
  ArrowRight,
  Bot,
  Gauge,
  Orbit,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const personas = [
  { name: "Anxious First Timer", trust: "0.19", conflict: "0.49" },
  { name: "Conflict Stress Test", trust: "0.60", conflict: "0.58" },
  { name: "Power User", trust: "0.35", conflict: "0.45" },
];

const features = [
  {
    icon: Gauge,
    title: "Quantified Friction",
    desc: "Visualize where confusion forms and identify high-conflict moments before launch.",
  },
  {
    icon: Orbit,
    title: "Trust Trajectory",
    desc: "Track confidence movement through journey checkpoints and decision branches.",
  },
  {
    icon: ShieldCheck,
    title: "Operationalized Decisions",
    desc: "Turn behavioral traces into concrete recommendations and release priorities.",
  },
];

const partners = ["FullStory", "Figma", "Mixpanel", "Jira", "DemoForge"];

export default function Home() {
  return (
    <div className="min-h-screen px-4 pb-16 pt-6 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex items-center justify-between rounded-2xl border border-white/10 bg-[#0f1528]/70 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-[#061826]">
              <Sparkles className="size-4" />
            </span>
            <span className="font-mono text-lg font-semibold tracking-wide text-white">CRUCIBLE</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
            <a href="#platform" className="hover:text-white">
              Platform
            </a>
            <a href="#solutions" className="hover:text-white">
              Solutions
            </a>
            <a href="#pricing" className="hover:text-white">
              Pricing
            </a>
            <Link href="/login" className={cn(buttonVariants(), "h-9 rounded-xl px-4")}>
              Book a Demo
            </Link>
          </nav>
          <Link href="/login" className={cn(buttonVariants(), "h-9 rounded-xl px-4 md:hidden")}>
            Login
          </Link>
        </header>

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a1124]/65 px-6 py-14 text-center shadow-2xl backdrop-blur-xl md:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(79,202,206,0.2),transparent_45%),radial-gradient(circle_at_10%_70%,rgba(97,121,255,0.2),transparent_45%),radial-gradient(circle_at_90%_75%,rgba(145,97,255,0.15),transparent_40%)]" />
          <div className="relative">
            <h1 className="mx-auto max-w-4xl text-balance font-mono text-4xl font-semibold tracking-tight text-white md:text-6xl">
              ANTICIPATE HUMAN BEHAVIOR.
              <br />
              SIMULATE FRICTION. BUILD TRUST.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-pretty text-lg text-white/75">
              Crucible empowers product teams to model realistic personas, run autonomous simulations,
              and turn behavioral traces into actionable insight before shipping broadly.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className={cn(buttonVariants(), "h-11 rounded-2xl px-6 text-base shadow-[0_0_0_1px_rgba(138,100,255,0.4),0_0_30px_rgba(74,217,206,0.35)]")}
              >
                Explore the Behavioral Sandbox
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-3">
              {personas.map((p) => (
                <Card key={p.name} className="border-cyan-300/20 bg-[#0f1730]/75 text-left">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-white">{p.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-white/70">
                    <div className="flex items-center justify-between">
                      <span>Trust</span>
                      <span className="font-mono text-cyan-200">{p.trust}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-2 rounded-full bg-gradient-to-r from-cyan-300 to-blue-400" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Conflict</span>
                      <span className="font-mono text-indigo-200">{p.conflict}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-2 w-2/3 rounded-full bg-gradient-to-r from-indigo-300 to-purple-400" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="platform" className="mt-10 grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="border-white/12 bg-[#0f1730]/75">
              <CardHeader>
                <div className="mb-2 inline-flex size-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                  <f.icon className="size-5" />
                </div>
                <CardTitle className="text-white">{f.title}</CardTitle>
                <CardDescription className="text-white/70">{f.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section id="solutions" className="mt-10 rounded-2xl border border-white/10 bg-[#0f1528]/70 px-6 py-5 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-center gap-7 text-sm text-white/65">
            {partners.map((p) => (
              <div key={p} className="flex items-center gap-2">
                {p === "DemoForge" ? <Bot className="size-4 text-cyan-300" /> : <Users className="size-4 text-white/45" />}
                <span>{p}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
