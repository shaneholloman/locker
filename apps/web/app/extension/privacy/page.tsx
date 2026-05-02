import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/assets/logo";

export const metadata: Metadata = {
  title: "Locker Extension — Privacy Policy",
  description: "What the Locker browser extension does with your data and why.",
};

const LAST_UPDATED = "May 2, 2026";

export default function ExtensionPrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <Logo className="size-5 text-primary" />
          <span className="font-semibold tracking-tight">Locker</span>
        </Link>

        <header className="mt-10 mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Locker Extension — Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated {LAST_UPDATED}
          </p>
        </header>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <p>
            The Locker browser extension lets you pick files from your Locker
            workspace, your computer, or generate new ones with AI, then drop
            them into any file input on the web. This page describes what data
            the extension touches and where it goes. It applies only to the
            extension itself; the rest of Locker is governed by the main{" "}
            <Link href="/privacy" className="text-primary underline">
              Locker privacy policy
            </Link>
            .
          </p>

          <h2>Data the extension handles</h2>
          <ul>
            <li>
              <strong>Your Locker session.</strong> The extension authenticates
              by riding the same browser cookie your Locker tabs use. Sign-in is
              performed in a normal Locker tab; the extension never sees,
              stores, or transmits your password.
            </li>
            <li>
              <strong>Workspace metadata.</strong> When the file picker is open,
              the extension calls the Locker API to list folders and files in
              the workspace you have selected. Nothing is fetched when the
              picker is closed.
            </li>
            <li>
              <strong>File contents.</strong> A file is only downloaded when you
              explicitly pick it — at that moment the bytes are placed directly
              into the page's file input. Locker doesn't keep a copy outside
              your workspace.
            </li>
            <li>
              <strong>AI generation inputs.</strong> When you use{" "}
              <em>Generate with AI</em>, your prompt and any files you attach
              (from your computer or your workspace) are sent to the Locker
              server, which forwards them to the AI provider that generates the
              file. The provider's privacy practices apply to that step; Locker
              does not retain a copy of the generated file unless you choose to
              save it back into your workspace.
            </li>
            <li>
              <strong>Local extension state.</strong> The extension stores a
              boolean "signed in" flag and the slug of your last-active
              workspace in <code>chrome.storage.local</code>. Both stay on your
              device.
            </li>
          </ul>

          <h2>Data the extension does not handle</h2>
          <ul>
            <li>
              We do not read page content, scrape forms, or transmit any
              information about the sites you visit.
            </li>
            <li>
              We do not modify any DOM element other than the file input you
              click on. The picker dialog renders inside an isolated shadow DOM
              and unmounts when you close it.
            </li>
            <li>
              We do not run analytics, tracking pixels, or telemetry from the
              extension. There is no third-party SDK shipped with the extension
              code.
            </li>
            <li>
              We do not share data with advertisers, brokers, or affiliates.
            </li>
          </ul>

          <h2>Why the extension requests broad permissions</h2>
          <ul>
            <li>
              <code>host_permissions: &lt;all_urls&gt;</code> — the file-input
              intercept content script must be allowed to run on any site so it
              can replace the OS file picker the moment you click an upload
              button. The script does nothing visible until you click such an
              input.
            </li>
            <li>
              <code>tabs</code> — used only to open the Locker sign-in tab and
              this privacy page in new tabs.
            </li>
            <li>
              <code>scripting</code> — required by Manifest V3 to register the
              intercept content script.
            </li>
            <li>
              <code>storage</code> — used for the local "signed in" flag and
              last-active workspace slug described above.
            </li>
            <li>
              <code>activeTab</code> — used so the popup can read the active
              tab's URL when you sign in, scoping the auth bounce to your
              current tab.
            </li>
          </ul>

          <h2>Data retention</h2>
          <p>
            Data the extension stores locally (the sign-in flag and active
            workspace slug) lives in your browser's extension storage and is
            removed when you uninstall the extension or sign out. File bytes
            picked from Locker are kept only in memory long enough to inject
            them into the target page's file input and are not persisted by the
            extension. Files generated by AI exist in memory while the preview
            is on screen and are discarded if you start over or close the dialog
            without using them.
          </p>

          <h2>Children's privacy</h2>
          <p>
            The Locker extension is intended for users 13 years of age or older.
          </p>

          <h2>Changes</h2>
          <p>
            If we materially change how the extension handles data, we'll update
            this page and bump the &ldquo;Last updated&rdquo; date above.
            Continued use of the extension after such a change constitutes
            acceptance of the revised policy.
          </p>

          <h2>Contact</h2>
          <p>
            Questions or requests about extension data can be sent to{" "}
            <a
              href="mailto:privacy@locker.dev"
              className="text-primary underline"
            >
              privacy@locker.dev
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
