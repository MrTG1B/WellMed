"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

const medicineFormSchema = z.object({
  medicineId: z.string().min(1, { message: "Medicine ID is required." })
    .regex(/^[a-zA-Z0-9_.-]+$/, { message: "Medicine ID can only contain letters, numbers, hyphens, underscores, and periods." }),
  composition: z.string().min(1, { message: "Composition is required." }),
  barcode: z.string().optional(),
});

type MedicineFormData = z.infer<typeof medicineFormSchema>;

export default function AdminUploadForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MedicineFormData>({
    resolver: zodResolver(medicineFormSchema),
    defaultValues: {
      medicineId: "",
      composition: "",
      barcode: "",
    },
  });

  async function onSubmit(data: MedicineFormData) {
    setIsSubmitting(true);
    try {
      if (!db) {
        toast({
          title: "Error: Firestore Not Initialized",
          description: "Firestore database (db) is not available. This usually means there's an issue with the Firebase SDK initialization. Please check the browser console for detailed error messages from 'src/lib/firebase.ts'. Ensure all NEXT_PUBLIC_FIREBASE_... environment variables are correctly set in .env.local and the server was restarted.",
          variant: "destructive",
          duration: 15000,
        });
        setIsSubmitting(false);
        return;
      }

      // Use the medicineId directly as the document ID.
      // It's crucial that medicineId is a string that is valid for Firestore document IDs.
      // Firestore document IDs must not be empty, must not be longer than 1,500 bytes, 
      // must not contain / (forward slash), and must not be solely . or ...
      const sanitizedMedicineId = data.medicineId.replace(/\//g, '_'); // Replace slashes just in case, though regex should prevent it.
      if (!sanitizedMedicineId || sanitizedMedicineId === "." || sanitizedMedicineId === "..") {
        toast({
          title: "Invalid Medicine ID",
          description: "Medicine ID cannot be empty or just '.' or '..'. Please provide a valid ID.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      const medicineDocRef = doc(db, "medicines", sanitizedMedicineId);
      
      const dataToUpload: { composition: string; barcode?: string } = {
        composition: data.composition,
      };
      if (data.barcode && data.barcode.trim() !== "") {
        dataToUpload.barcode = data.barcode.trim();
      }

      await setDoc(medicineDocRef, dataToUpload, { merge: true });

      toast({
        title: "Success",
        description: `Medicine data for ID "${sanitizedMedicineId}" uploaded successfully.`,
      });
      form.reset(); 
    } catch (error: any) {
      console.error("Error uploading medicine data to Firestore:", error);
      
      let detailedMessage = `Failed to upload medicine data for ID "${data.medicineId}". `;
      if (error.code) {
        detailedMessage += `Error Code: ${error.code}. `;
      }
      if (error.message) {
        detailedMessage += `Message: ${error.message}. `;
      }

      detailedMessage += "\n\nCommon issues & checks:\n" +
        "1. Firestore Security Rules: Ensure your rules allow 'write' operations on the 'medicines' collection. For testing, you might use:\n" +
        "   rules_version = '2';\n" +
        "   service cloud.firestore {\n" +
        "     match /databases/{database}/documents {\n" +
        "       match /medicines/{medicineId} {\n" +
        "         allow read, write: if true; // CAUTION: Open access for testing\n" +
        "       }\n" +
        "     }\n" +
        "   }\n" +
        "2. Firebase Project Setup: Verify that Firestore is enabled in your Firebase project console (Databases -> Create database, ensure it's in Native mode).\n" +
        "3. Environment Variables: Double-check that all NEXT_PUBLIC_FIREBASE_... variables in your .env.local file are correct and that you've restarted your Next.js development server after any changes.\n" +
        "4. Network Issues: Check your internet connection and any browser console network errors related to Firestore.\n" +
        "5. Valid Document ID: Ensure the Medicine ID ('${data.medicineId}') is a valid Firestore document ID (not empty, no slashes, not just '.' or '..').";


      toast({
        title: "Firestore Upload Failed",
        description: detailedMessage,
        variant: "destructive",
        duration: 20000, 
      });
    } finally {
      setIsSubmitting(false);
    }
  }

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
                <Input placeholder="e.g., Paracetamol500, Amoxicillin_250mg, Crocin-Syrup" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormDescription>
                Unique ID for the medicine (used as Firestore document ID). Allowed: letters, numbers, hyphens, underscores, periods.
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
                  placeholder="Enter medicine composition (e.g., Paracetamol 500mg, Amoxicillin 250mg)"
                  className="resize-y"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
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
                <Input placeholder="Enter barcode (e.g., 1234567890123)" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Upload Data"
          )}
        </Button>
      </form>
    </Form>
  );
}
