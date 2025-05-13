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
          title: "Critical Error: Firestore Not Initialized",
          description: "Firestore database (db) is not available. This means Firebase SDK failed to initialize properly. PLEASE VERIFY .env.local Firebase variables are correct and the server was RESTARTED. Also, check the browser console for 'Firebase Initialization Error' messages from 'src/lib/firebase.ts'.",
          variant: "destructive",
          duration: 20000,
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
      
      // The document ID will be the sanitizedMedicineId
      const medicineDocRef = doc(db, "medicines", sanitizedMedicineId);
      
      const dataToUpload: { composition: string; barcode?: string; name: string } = {
        composition: data.composition,
        // Store the medicineId as 'name' for consistency and potential direct lookups by name.
        // The document ID itself is the primary unique identifier.
        name: sanitizedMedicineId, 
      };
      if (data.barcode && data.barcode.trim() !== "") {
        dataToUpload.barcode = data.barcode.trim();
      }

      await setDoc(medicineDocRef, dataToUpload, { merge: true });

      toast({
        title: "Success!",
        description: `Medicine data for ID "${sanitizedMedicineId}" uploaded successfully.`,
      });
      form.reset(); 
    } catch (error: any) {
      console.error("Error uploading medicine data to Firestore:", error);
      
      let detailedMessage = `Failed to upload medicine data for ID "${data.medicineId}". The error "${error.message || 'Unknown error'}" (often "transport errored", "Failed to fetch", or "Could not reach Firestore backend") usually indicates a problem with Firebase project setup, Firestore database creation, or security rules.\n\n`;
      
      if (error.code) {
        detailedMessage += `Firebase Error Code: ${error.code}. `;
      }

      detailedMessage += "\n\n🚨🚨🚨 TROUBLESHOOTING 'TRANSPORT ERRORED' / CONNECTION ISSUES: 🚨🚨🚨\n\n" +
        "1. **FIREBASE CONSOLE: CREATE FIRESTORE DATABASE** (Most Common Issue):\n" +
        "   a. Go to your Firebase Project: https://console.firebase.google.com/\n" +
        "   b. Select your project.\n" +
        "   c. In the left navigation, click 'Build' -> '**Firestore Database**'.\n" +
        "   d. **IF YOU SEE A 'CREATE DATABASE' BUTTON, CLICK IT!** This is essential.\n" +
        "      - Choose 'Start in **production mode**' (recommended, adjust rules next) or 'Start in **test mode**' (open for 30 days - for quick testing).\n" +
        "      - Select a Cloud Firestore location (e.g., us-central1). This cannot be changed later.\n" +
        "   e. If Firestore is already created, ensure it's in **'Native Mode'**, NOT 'Datastore Mode'.\n\n" +
        "2. **FIRESTORE SECURITY RULES (Allow Writes)**:\n" +
        "   a. In Firebase Console -> Firestore Database -> '**Rules**' tab.\n" +
        "   b. **For testing, your rules MUST allow writes to the 'medicines' collection.** Example for testing (replace with secure rules for production):\n" +
        "      ```\n" +
        "      rules_version = '2';\n" +
        "      service cloud.firestore {\n" +
        "        match /databases/{database}/documents {\n" +
        "          // Allow read/write to the 'medicines' collection by ANYONE (for testing only!)\n" +
        "          match /medicines/{medicineId} {\n" +
        "            allow read, write: if true; \n" +
        "          }\n" +
        "          // To allow any user (even unauthenticated) to read any document:\n" +
        "          // match /{document=**} {\n" +
        "          //  allow read: if true;\n" +
        "          // }\n" +
        "        }\n" +
        "      }\n" +
        "      ```\n" +
        "   c. Click '**Publish**'. **Wait a few minutes** for rules to apply server-side.\n\n" +
        "3. **`.env.local` ENVIRONMENT VARIABLES ACCURACY**:\n" +
        "   a. Open your project's `.env.local` file.\n" +
        "   b. **VERY CAREFULLY CHECK** that `NEXT_PUBLIC_FIREBASE_PROJECT_ID` EXACTLY matches the Project ID in your Firebase Project settings (Gear icon ⚙️ -> Project settings -> General tab -> Project ID).\n" +
        "   c. **VERIFY ALL OTHER** `NEXT_PUBLIC_FIREBASE_...` variables (apiKey, authDomain, etc.) against your Firebase project's Web App configuration (Project settings -> General -> Your apps -> Select your Web app -> SDK setup and configuration -> Config section).\n" +
        "   d. **CRITICAL: YOU MUST RESTART your Next.js development server (`npm run dev`) AFTER ANY CHANGES to `.env.local`.**\n\n" +
        "4. **NETWORK & BROWSER CHECKS**:\n" +
        "   a. Ensure stable internet connection.\n" +
        "   b. Temporarily disable VPNs or strict browser privacy extensions/firewalls that might block connections to Google Cloud services.\n" +
        "   c. Check your browser's developer console (Network tab) for any failed requests to `firestore.googleapis.com`.\n\n" +
        "5. **BILLING (Less Common for Firestore initial setup but possible for other Firebase services or high usage later)**:\n" +
        "   a. Ensure your Firebase project is on a plan that supports Firestore (Spark plan is usually fine for development) and billing is active if on a paid plan and you've exceeded free quotas.\n\n" +
        "If the problem persists after thoroughly checking ALL these steps, review the Firebase console for any specific project alerts or issues, and double check for typos in variable names or values.";

      toast({
        title: "Firestore Upload Failed - Connection Issue",
        description: (
          <pre className="mt-2 w-full whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-slate-50">
            <code className="text-white">{detailedMessage}</code>
          </pre>
        ),
        variant: "destructive",
        duration: 120000, // Long duration for this critical, detailed message
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
                Unique ID for the medicine (used as Firestore document ID). Allowed: letters, numbers, hyphens, underscores, periods. This will also be stored as the 'name' field in Firestore.
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
