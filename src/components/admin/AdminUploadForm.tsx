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

      const sanitizedMedicineId = data.medicineId.replace(/\//g, '_'); 
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
      
      const dataToUpload: { composition: string; barcode?: string; name?: string } = {
        composition: data.composition,
        // Storing the medicineId as 'name' for easier querying/consistency if needed,
        // though the primary lookup is by ID. This matches the field used in mockApi for initial find.
        name: sanitizedMedicineId, 
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
      
      let detailedMessage = `Failed to upload medicine data for ID "${data.medicineId}". The error "transport errored" usually indicates a problem with Firebase project setup or security rules.\n\n`;
      
      if (error.code) {
        detailedMessage += `Firebase Error Code: ${error.code}. `;
      }
      if (error.message) {
        detailedMessage += `Message: ${error.message}. `;
      }

      detailedMessage += "\n\n🚨 CRITICAL CHECKS TO RESOLVE 'TRANSPORT ERRORED':\n\n" +
        "1. VERIFY FIREBASE CONSOLE SETUP:\n" +
        "   a. Go to your Firebase Project Console (console.firebase.google.com).\n" +
        "   b. Navigate to 'Firestore Database' (under Build).\n" +
        "   c. **IMPORTANT**: If you see a 'Create database' button, YOU MUST CLICK IT.\n" +
        "      - Choose 'Start in **production mode**' (you'll adjust rules next) or 'Start in **test mode**' (rules are open for 30 days - good for initial testing).\n" +
        "      - Select a Cloud Firestore location (e.g., us-central1). This cannot be changed later.\n" +
        "   d. If Firestore is already created, ensure it's in 'Native Mode', NOT 'Datastore Mode'.\n\n" +
        "2. CHECK FIRESTORE SECURITY RULES:\n" +
        "   a. In Firebase Console -> Firestore Database -> 'Rules' tab.\n" +
        "   b. **For testing, your rules MUST allow writes.** A common test setup is:\n" +
        "      ```\n" +
        "      rules_version = '2';\n" +
        "      service cloud.firestore {\n" +
        "        match /databases/{database}/documents {\n" +
        "          // Allow read/write access to all documents for testing\n" +
        "          //match /{document=**} { // Too broad for long term\n" +
        "          match /medicines/{medicineId} {\n" + // Be specific to your collection
        "            allow read, write: if true; \n" +
        "            // For actual deployment, use: allow read, write: if request.auth != null; (if using auth)\n" +
        "          }\n" +
        "        }\n" +
        "      }\n" +
        "      ```\n" +
        "   c. Click 'Publish'. **Wait a few minutes for rules to apply.**\n\n" +
        "3. VERIFY `.env.local` ENVIRONMENT VARIABLES:\n" +
        "   a. Ensure `NEXT_PUBLIC_FIREBASE_PROJECT_ID` in your `.env.local` file EXACTLY matches the Project ID shown in your Firebase Project settings (click the gear icon ⚙️ next to 'Project Overview').\n" +
        "   b. Double-check ALL other `NEXT_PUBLIC_FIREBASE_...` variables (apiKey, authDomain, etc.) are correctly copied from your Firebase project's Web App configuration (Project settings -> General -> Your apps -> Web app -> SDK setup and configuration -> Config).\n" +
        "   c. **CRITICAL: You MUST restart your Next.js development server (npm run dev) after any changes to `.env.local`.**\n\n" +
        "4. CHECK NETWORK & BROWSER:\n" +
        "   a. Ensure you have a stable internet connection.\n" +
        "   b. Try disabling VPNs or strict browser privacy extensions temporarily to rule them out.\n" +
        "   c. Check your browser's console for any other network-related errors (e.g., CORS issues, though less likely for 'transport errored').\n\n" +
        "If the problem persists after checking all these, review your Firebase project's usage and billing status.";


      toast({
        title: "Firestore Upload Failed - TRANSPORT ERROR",
        description: detailedMessage,
        variant: "destructive",
        duration: 60000, // Increased duration for this critical message
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
              <FormLabel>Medicine ID (e.g., Paracetamol500)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Paracetamol500, Amoxicillin_250mg, Crocin-Syrup" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormDescription>
                Unique ID for the medicine (used as Firestore document ID). Allowed: letters, numbers, hyphens, underscores, periods. This will also be used as the 'name' field in Firestore.
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
