
"use client";

import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { ref, set, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  medicineId: z.string().min(2, {
    message: "Medicine ID must be at least 2 characters.",
  }).max(50, {
    message: "Medicine ID must be at most 50 characters."
  }).regex(/^[a-zA-Z0-9-_]+$/, {
    message: "Medicine ID can only contain alphanumeric characters, hyphens, and underscores."
  }),
  medicineName: z.string()
    .trim()
    .refine(val => val === '' || val.length >= 2, {
      message: "Medicine Display Name, if provided, must be at least 2 characters after trimming.",
    })
    .optional(),
  composition: z.string().min(5, {
    message: "Composition must be at least 5 characters.",
  }),
  barcode: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminUploadForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    setCurrentTimestamp(new Date().toISOString());
  }, []);


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      medicineId: "",
      medicineName: "",
      composition: "",
      barcode: "",
    },
    mode: "onChange",
  });

  const { isDirty, isValid } = form.formState;


  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    console.log("[AdminUploadForm] onSubmit triggered. Initial isSubmitting:", isSubmitting);
    if (isSubmitting) {
      console.warn("[AdminUploadForm] Submission attempt while already submitting. Aborting.");
      return;
    }
    
    setIsSubmitting(true);
    console.log("[AdminUploadForm] isSubmitting set to true.");

    const newMedicineId = data.medicineId.trim();
    const trimmedMedicineName = data.medicineName?.trim();
    
    const finalMedicineName = trimmedMedicineName && trimmedMedicineName.length > 0 
                            ? trimmedMedicineName 
                            : newMedicineId; // Use medicineId if name is undefined, empty, or just whitespace

    const newComposition = data.composition.trim().toLowerCase(); // For conflict checking
    const originalComposition = data.composition.trim(); // For storing
    const newBarcode = data.barcode?.trim();

    try {
      if (!db) {
        console.error("[AdminUploadForm] Firebase Realtime Database db instance is NOT available. Critical configuration issue.");
        toast({
          title: "Database Error",
          description: "Firebase Realtime Database is not configured. Cannot save data.",
          variant: "destructive",
        });
        setIsSubmitting(false); 
        console.log("[AdminUploadForm] isSubmitting set to false (no db instance).");
        return;
      }

      // Check for existing data
      const medicinesRef = ref(db, 'medicines');
      const snapshot = await get(medicinesRef);
      let idConflict = false;
      let compositionConflict = false;
      let barcodeConflict = false;

      if (snapshot.exists()) {
        const medicinesData = snapshot.val();
        for (const existingKey in medicinesData) {
          if (existingKey === newMedicineId) {
            idConflict = true;
          }
          const existingMedicine = medicinesData[existingKey];
          if (existingMedicine.composition && existingMedicine.composition.toLowerCase() === newComposition) {
            compositionConflict = true;
          }
          if (newBarcode && existingMedicine.barcode && existingMedicine.barcode === newBarcode) {
            barcodeConflict = true;
          }
        }
      }

      const warningMessages: string[] = [];
      if (idConflict) {
        warningMessages.push(`Medicine ID "${newMedicineId}" already exists.`);
      }
      if (compositionConflict) {
        warningMessages.push(`A medicine with composition "${originalComposition}" already exists.`);
      }
      if (barcodeConflict && newBarcode) {
        warningMessages.push(`A medicine with barcode "${newBarcode}" already exists.`);
      }

      if (warningMessages.length > 0) {
        toast({
          title: "Data Conflict",
          description: warningMessages.join(" "),
          variant: "destructive",
        });
        setIsSubmitting(false);
        console.log("[AdminUploadForm] isSubmitting set to false due to data conflict.");
        return;
      }
      
      const medicineDataToSave = {
        name: finalMedicineName,
        composition: originalComposition, 
        barcode: newBarcode || null, 
        lastUpdated: new Date().toISOString(),
      };

      console.log("[AdminUploadForm] Attempting to write to Firebase Realtime Database. Path:", `medicines/${newMedicineId}`, "Data:", medicineDataToSave);
      const medicineRef = ref(db, `medicines/${newMedicineId}`);
      
      await set(medicineRef, medicineDataToSave);
      
      console.log("[AdminUploadForm] Realtime Database write successful for ID:", newMedicineId);

      toast({
        title: "Upload Successful",
        description: `Medicine "${finalMedicineName}" (ID: ${newMedicineId}) data saved to Realtime Database.`,
      });
      form.reset(); 
      setCurrentTimestamp(new Date().toISOString());
      console.log("[AdminUploadForm] Form reset successfully.");

    } catch (error: any) {
      console.error("[AdminUploadForm] Realtime Database write FAILED. Error:", error.message || error, error);
      let userMessage = "Failed to upload medicine to Realtime Database. ";
      if (error.message?.toLowerCase().includes("permission_denied") || error.message?.toLowerCase().includes("permission denied")) {
        userMessage += "This is likely a Realtime Database security rules issue. Please check your Firebase project console (Realtime Database -> Rules).";
      } else if (error.message?.toLowerCase().includes("network error") || error.message?.toLowerCase().includes("disconnected")) {
        userMessage += "Network or connection error with database. Please check your internet connection and Firebase setup.";
      }
       else {
        userMessage += "An unexpected error occurred. Check console for details and Firebase setup.";
      }
      toast({
        title: "Upload Failed",
        description: userMessage,
        variant: "destructive",
      });
    } finally {
      console.log("[AdminUploadForm] Entering finally block.");
      setIsSubmitting(false);
      console.log("[AdminUploadForm] isSubmitting set to false in finally block.");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="medicineId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Medicine ID</FormLabel>
              <FormControl>
                <Input placeholder="e.g., paracetamol-500" {...field} />
              </FormControl>
              <FormDescription>
                Enter a unique ID for the medicine (e.g., lowercase, hyphens). This will be its key in the database.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="medicineName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Medicine Display Name (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Paracetamol 500mg Tablets" {...field} />
              </FormControl>
              <FormDescription>
                The user-friendly name of the medicine (Optional, uses Medicine ID if blank).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="composition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Composition</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., Paracetamol 500mg, Caffeine 30mg"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The active ingredients and their strengths.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="barcode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Barcode (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 1234567890123" {...field} />
              </FormControl>
              <FormDescription>
                The EAN or UPC barcode number.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting || !isDirty || !isValid } className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Upload Medicine"
          )}
        </Button>
      </form>
    </Form>
  );
}

