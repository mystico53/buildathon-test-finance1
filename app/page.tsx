import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ConnectionTest } from "@/components/connection-test";
import { CreateWorkspaceButton } from "@/components/create-workspace-button";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href={"/"}>Next.js Supabase Starter</Link>
              <div className="flex items-center gap-2">
                <DeployButton />
              </div>
            </div>
            {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
          </div>
        </nav>
        <div className="flex-1 flex flex-col items-center justify-center p-5 space-y-8">
          <ConnectionTest />
          
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">Personal Finance Tracker</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Upload bank statements and get AI-powered spending insights
              </p>
              <Link 
                href="/finance"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                Launch Finance Tracker
              </Link>
            </div>
            
            <div className="text-center">
              <h2 className="text-xl font-semibold">Try Collaborative Workspaces</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Create a shared workspace - no sign-up required
              </p>
              <div className="mt-4">
                <CreateWorkspaceButton />
              </div>
            </div>
          </div>
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <p>
            Powered by{" "}
            <a
              href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Supabase
            </a>
          </p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
