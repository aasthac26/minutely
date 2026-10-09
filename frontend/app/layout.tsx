import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { ToastProvider } from "@/components/Toast";
import CommandPalette from "@/components/CommandPalette";
const font = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Minutely · Meeting notes & transcripts",
  description: "Browse meetings, read transcripts, and get summaries and action items.",
};

const themeScript = `try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={font.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="bg-bg text-ink antialiased">
        <ToastProvider>
          <div className="flex h-screen"><CommandPalette />
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar />
              <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}