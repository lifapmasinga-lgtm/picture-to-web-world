import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trestle — AI Workplace Productivity Assistant" },
      { name: "description", content: "Your work, supported. Done faster. Trestle helps with emails, meeting notes, planning, research and chat." },
      { property: "og:title", content: "Trestle — AI Workplace Productivity Assistant" },
      { property: "og:description", content: "Your work, supported. Done faster. Trestle helps with emails, meeting notes, planning, research and chat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

// The dashboard itself is 3 plain files: public/app/index.html, style.css, script.js
function Index() {
  return (
    <iframe
      src="/app/index.html"
      title="Trestle — AI Workplace Productivity Assistant"
      className="block h-screen w-full border-0"
    />
  );
}
