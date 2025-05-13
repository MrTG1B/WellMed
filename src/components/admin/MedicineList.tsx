"use client";

import React, { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, RefreshCw, Pill } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface StoredMedicine {
  id: string; // This will be the document ID, which is also the medicineId/name
  composition?: string; 
  barcode?: string;
}

export default function MedicineList() {
  const [medicines, setMedicines] = useState<StoredMedicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMedicines = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!db) {
        setError("Firestore is not initialized. Cannot fetch medicines. Check Firebase configuration and ensure the database is created in the Firebase console.");
        toast({
          title: "Firestore Error",
          description: "Database not initialized. Check console and Firebase setup.",
          variant: "destructive",
          duration: 10000,
        });
        setIsLoading(false);
        return;
      }
      const medicinesCol = collection(db, "medicines");
      // Order by name (which is the document ID in our case) and limit for performance, e.g., to 100
      const q = query(medicinesCol, orderBy("__name__"), limit(100)); 
      const medicineSnapshot = await getDocs(q);
      const medicineList = medicineSnapshot.docs.map(doc => ({
        id: doc.id, // The document ID is the medicineId/name
        ...doc.data() as { composition?: string; barcode?: string }
      }));
      setMedicines(medicineList);
    } catch (err: any) {
      console.error("Error fetching medicines:", err);
      let detailedError = "Failed to fetch medicines. ";
      if (err.message?.includes("Missing or insufficient permissions")) {
        detailedError += "This might be due to Firestore security rules. Ensure you have read access to the 'medicines' collection. Example rule: `match /medicines/{docId} { allow read: if true; }` (for testing).";
      } else if (err.message?.includes("transport") || err.message?.includes("Failed to fetch")) {
        detailedError += "This often indicates a network issue or that the Firestore database hasn't been created in your Firebase project, or `.env.local` variables are incorrect (requiring a server restart after changes).";
      } else {
        detailedError += err.message;
      }
      setError(detailedError);
      toast({
        title: "Fetch Error",
        description: detailedError,
        variant: "destructive",
        duration: 15000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Loading medicines...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-2" />
        <p className="text-destructive font-semibold">Error loading medicines:</p>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchMedicines} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Displaying up to 100 medicines.
        </p>
        <Button onClick={fetchMedicines} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh List
        </Button>
      </div>
      {medicines.length === 0 ? (
        <p className="text-center text-muted-foreground py-4">No medicines found in the database.</p>
      ) : (
        <ScrollArea className="h-[400px] rounded-md border p-4 bg-muted/20">
          <ul className="space-y-3">
            {medicines.map((med) => (
              <li key={med.id} className="p-3 bg-card rounded-md shadow hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Pill className="mr-3 h-5 w-5 text-primary" />
                        <span className="font-medium text-foreground">{med.id}</span>
                    </div>
                    {med.barcode && <Badge variant="secondary">Barcode: {med.barcode}</Badge>}
                </div>
                {med.composition && (
                    <p className="text-xs text-muted-foreground mt-1 pl-8">
                        Composition: {med.composition.length > 60 ? med.composition.substring(0, 57) + "..." : med.composition}
                    </p>
                )}
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
