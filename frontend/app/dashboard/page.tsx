'use client'
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"



export default function dashboard() {
  const [message, setMessage] = useState("");
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/message`);
        const data = await res.json();
        setMessage(data.message);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };

    fetchMessage();
  }, []);



  return (


    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  {/* <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink> */}
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex p-4 justify-center">
          <img src="g7logo.png" alt="G7 Aerospace Logo" className="h-16 w-auto" />
        </div>
        <div>
          <h1 className="mt-4 text-center text-2xl font-bold">Welcome to the G7 Aerospace Dashboard</h1>
          <h1>{message}</h1>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
