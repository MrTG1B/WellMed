
"use client";

import { useEffect, useState } from "react";
import { ref, onValue, type DataSnapshot, off } from "firebase/database"; // Changed from firestore
import { db } from "@/lib/firebase";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ListChecks, AlertCircle } from "lucide-react";

interface MedicineDoc {
  id: string;
  name: string;
  composition?: string;
  barcode?: string;
}

export default function MedicineList() {
  const [medicines, setMedicines] = useState<MedicineDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setError("Firebase Realtime Database is not available. Please check configuration.");
      setIsLoading(false);
      console.warn("MedicineList: Realtime Database db instance is not available!");
      return;
    }

    setIsLoading(true);
    console.log("MedicineList: Setting up Firebase Realtime Database listener for 'medicines' path.");
    const medicinesRef = ref(db, "medicines");
    
    const listener = onValue(medicinesRef, 
      (snapshot: DataSnapshot) => {
        const data = snapshot.val();
        if (data) {
          console.log("MedicineList: Received data snapshot from Realtime Database.");
          const medsList = Object.keys(data).map(key => {
            const medData = data[key];
            return {
              id: key, // The key in RTDB is the medicineId
              name: medData.name || "Unnamed Medicine",
              composition: medData.composition,
              barcode: medData.barcode,
            };
          });
          setMedicines(medsList);
          console.log("MedicineList: Medicines state updated.", medsList);
        } else {
          setMedicines([]); // No data at the path
          console.log("MedicineList: No medicines found in Realtime Database at 'medicines' path.");
        }
        setIsLoading(false);
        setError(null);
      }, 
      (err: Error) => { // Changed type to Error
        console.error("MedicineList: Error fetching medicines from Realtime Database:", err);
        setError(`Failed to load medicines: ${err.message}. Check console and Realtime Database security rules.`);
        setIsLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => {
      console.log("MedicineList: Unsubscribing from Realtime Database listener.");
      off(medicinesRef, 'value', listener); // Correct way to remove RTDB listener
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading medicines...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="shadow-md">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>Error Loading Medicines</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (medicines.length === 0) {
    return (
      <Alert className="shadow-sm">
        <ListChecks className="h-5 w-5" />
        <AlertTitle>No Medicines Found</AlertTitle>
        <AlertDescription>
          There are currently no medicines stored in the Realtime Database. Use the form to upload new medicine data.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <ScrollArea className="h-72 w-full rounded-md border bg-card shadow-inner">
      <div className="p-4">
        <h4 className="mb-4 text-lg font-semibold leading-none text-center text-primary">
          Available Medicines ({medicines.length})
        </h4>
        {medicines.map((medicine) => (
          <div key={medicine.id} className="text-sm p-3 mb-2 border-b last:border-b-0 hover:bg-muted/50 rounded-md transition-colors">
            <p className="font-semibold text-foreground">{medicine.name}</p>
            {medicine.composition && <p className="text-xs text-muted-foreground">Composition: {medicine.composition}</p>}
            {medicine.barcode && <p className="text-xs text-muted-foreground">Barcode: {medicine.barcode}</p>}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
