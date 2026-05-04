import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <main className="flex-1 max-w-[1400px] w-full mx-auto pb-10">{children}</main>
      <SiteFooter />
    </>
  );
}
