
import AdminUploadForm from "@/components/admin/AdminUploadForm";
import MedicineList from "@/components/admin/MedicineList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { ArrowLeft, List } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col items-center min-h-screen p-4 pt-8 sm:p-6 md:p-8 bg-background text-foreground">
      <header className="w-full max-w-4xl mb-8 flex justify-between items-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-primary">
          Admin Dashboard
        </h1>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to MediSearch
          </Link>
        </Button>
      </header>

      <main className="w-full max-w-4xl grid gap-8 md:grid-cols-2">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-center">
              Upload New Medicine Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdminUploadForm />
          </CardContent>
        </Card>

        <Card className="shadow-xl">
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
        <p>&copy; {new Date().getFullYear()} MediSearch Admin. All rights reserved.</p>
      </footer>
    </div>
  );
}
