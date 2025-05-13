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
import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  medicineName: z.string().min(2, {
    message: "Medicine name must be at least 2 characters.",
  }),
  composition: z.string().min(5, {
    message: "Composition must be at least 5 characters.",
  }),
  barcode: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminUploadForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      medicineName: "",
      composition: "",
      barcode: "",
    },
  });

  const { isDirty, isValid, formState } = form;


  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    console.log("[AdminUploadForm] onSubmit triggered. Data:", data, "Current isSubmitting:", isSubmitting);
    if (isSubmitting) {
      console.warn("[AdminUploadForm] Submission attempt while already submitting. Aborting.");
      return;
    }
    
    setIsSubmitting(true);
    console.log("[AdminUploadForm] isSubmitting set to true.");

    const medicineId = data.medicineName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, '');
    
    if (!medicineId) {
        console.error("[AdminUploadForm] Invalid Medicine ID generated from name:", data.medicineName);
        toast({
            title: "Invalid Input",
            description: "Medicine name is invalid for ID generation. Please use alphanumeric characters.",
            variant: "destructive",
        });
        setIsSubmitting(false);
        console.log("[AdminUploadForm] isSubmitting set to false due to invalid medicineId.");
        return;
    }
    console.log(`[AdminUploadForm] Generated medicineId: ${medicineId}`);

    try {
      if (!db) {
        console.error("[AdminUploadForm] Firestore db instance is NOT available. Critical configuration issue.");
        toast({
          title: "Database Error",
          description: "Firestore database is not configured. Cannot save data.",
          variant: "destructive",
        });
        setIsSubmitting(false); 
        console.log("[AdminUploadForm] isSubmitting set to false (no db instance).");
        return;
      }
      
      const medicineDataToSave = {
        name: data.medicineName.trim(),
        composition: data.composition.trim(),
        barcode: data.barcode?.trim() || null, 
        lastUpdated: new Date().toISOString(),
      };

      console.log("[AdminUploadForm] Attempting to write to Firestore. Path:", `medicines/${medicineId}`, "Data:", medicineDataToSave);
      const medicineRef = doc(db, "medicines", medicineId);
      
      await setDoc(medicineRef, medicineDataToSave, { merge: true }); 
      
      console.log("[AdminUploadForm] Firestore write successful for ID:", medicineId);

      toast({
        title: "Upload Successful",
        description: `Medicine "${data.medicineName.trim()}" data saved.`,
      });
      form.reset(); 
      console.log("[AdminUploadForm] Form reset successfully.");

    } catch (error: any) {
      console.error("[AdminUploadForm] Firestore write FAILED. Error:", error.message || error, error);
      let userMessage = "Failed to upload medicine. ";
      if (error.message?.toLowerCase().includes("permission denied") || error.message?.toLowerCase().includes("missing or insufficient permissions")) {
        userMessage += "This is likely a Firestore security rules issue. Please check your Firebase project console.";
      } else if (error.message?.toLowerCase().includes("offline") || error.message?.toLowerCase().includes("network error") || error.message?.toLowerCase().includes("transport errored")) {
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
          name="medicineName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Medicine Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Paracetamol 500" {...field} />
              </FormControl>
              <FormDescription>
                The official name of the medicine. This will be used to generate its ID.
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
