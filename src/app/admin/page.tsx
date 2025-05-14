
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AdminUploadForm from "@/components/admin/AdminUploadForm";
import MedicineList from "@/components/admin/MedicineList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, List, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!auth) {
      console.error("Firebase Auth is not initialized. Cannot check auth state.");
      toast({
        title: "Authentication Error",
        description: "Firebase Auth not available. Please check configuration.",
        variant: "destructive",
      });
      router.push("/admin/login"); // Redirect to login if auth is not available
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
        router.push("/admin/login");
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router, toast]);

  const handleLogout = async () => {
    if (!auth) {
      toast({
        title: "Logout Error",
        description: "Firebase Auth not available.",
        variant: "destructive",
      });
      return;
    }
    try {
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push("/admin/login");
    } catch (error) {
      console.error("Error logging out: ", error);
      toast({
        title: "Logout Failed",
        description: "An error occurred while logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Admin Dashboard...</p>
      </div>
    );
  }

  if (!user) {
    // This case should ideally be handled by the redirect in onAuthStateChanged,
    // but as a fallback or if redirection is slow.
    return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-4 pt-8 sm:p-6 md:p-8 bg-background text-foreground">
      <header className="w-full max-w-5xl mb-8 flex justify-between items-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-primary">
          Admin Dashboard
        </h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to WellMeds
            </Link>
          </Button>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="w-full max-w-5xl grid gap-8 md:grid-cols-3">
        <Card className="shadow-xl md:col-span-1">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-center">
              Upload New Medicine Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdminUploadForm />
          </CardContent>
        </Card>

        <Card className="shadow-xl md:col-span-2">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-center flex items-center justify-center">
              <List className="mr-2 h-6 w-6" />
              Stored Medicines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MedicineList />
          </CardContent>
        </Card>
      </main>

      <footer className="mt-auto pt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} WellMeds Admin. All rights reserved.</p>
      </footer>
    </div>
  );
}
