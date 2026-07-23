import Link from "next/link";

const STEPS = [
  {
    title: "Upload",
    body: "Drop in any photo or artwork. We check the resolution so it prints crisp.",
  },
  { title: "Customise", body: "Pick a size, material, and frame. See the price update live." },
  { title: "We print & frame", body: "Printed and framed in-house, quality-checked by hand." },
  { title: "Delivered", body: "Tracked from our studio to your wall." },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="flex flex-col items-center gap-6 py-20 text-center sm:py-28">
        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
          Printed &amp; framed in-house
        </span>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Your photos, framed like they belong in a gallery.
        </h1>
        <p className="max-w-xl text-lg text-muted">
          Upload an image, choose your size and frame, and we&apos;ll print, frame, and deliver
          it. Museum-quality materials, quality-checked by hand.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/create"
            className="rounded-full bg-accent px-6 py-3 font-medium text-accent-fg transition hover:opacity-90"
          >
            Start creating
          </Link>
          <Link
            href="/wall"
            className="rounded-full border border-border px-6 py-3 font-medium transition hover:bg-border/40"
          >
            Browse the Wall
          </Link>
        </div>
      </section>

      <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <div key={step.title} className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 grid h-8 w-8 place-items-center rounded-full bg-accent/10 font-mono text-sm text-accent">
              {i + 1}
            </div>
            <h3 className="mb-1 font-semibold">{step.title}</h3>
            <p className="text-sm text-muted">{step.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
