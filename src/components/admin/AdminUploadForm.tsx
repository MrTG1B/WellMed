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
    console.log("AdminUploadForm: onSubmit triggered. Current isSubmitting state:", isSubmitting);
    if (isSubmitting) {
      console.warn("AdminUploadForm: Submission attempt while already submitting. Aborting.");
      return;
    }
    
    setIsSubmitting(true);
    console.log("AdminUploadForm: isSubmitting set to true.");

    const medicineId = data.medicineName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, '');
    if (!medicineId) {
        console.error("AdminUploadForm: Could not generate a valid medicine ID from name:", data.medicineName);
        toast({
            title: "Invalid Input",
            description: "Medicine name is invalid for ID generation.",
            variant: "destructive",
        });
        setIsSubmitting(false);
        console.log("AdminUploadForm: setIsSubmitting(false) due to invalid medicineId. New isSubmitting state: false");
        return;
    }
    console.log(`AdminUploadForm: Generated medicineId = ${medicineId}`);

    try {
      if (!db) {
        console.error("AdminUploadForm: Firestore db instance is not available! This is a critical issue. Check firebase.ts and console for Firebase initialization errors.");
        toast({
          title: "Database Configuration Error",
          description: "Firestore database is not properly configured or available. Cannot save data.",
          variant: "destructive",
        });
        setIsSubmitting(false); 
        console.log("AdminUploadForm: setIsSubmitting(false) due to no db instance. New isSubmitting state: false");
        return;
      }
      
      console.log("AdminUploadForm: Attempting setDoc for ID:", medicineId, "with data:", data);
      const medicineRef = doc(db, "medicines", medicineId);
      await setDoc(medicineRef, {
        name: data.medicineName.trim(),
        composition: data.composition.trim(),
        barcode: data.barcode?.trim() || null, 
        // Add a timestamp for easier debugging in Firestore console
        lastUpdated: new Date().toISOString(),
      }, { merge: true }); 
      
      console.log("AdminUploadForm: setDoc successful for ID:", medicineId);

      const successMessage = `Medicine "${data.medicineName.trim()}" uploaded/updated successfully.`;
      toast({
        title: "Upload Successful",
        description: successMessage,
      });
      form.reset(); // Reset form fields
      console.log("AdminUploadForm: Form reset. Form state isDirty:", formState.isDirty, "isValid:", formState.isValid);

    } catch (error: any) {
      console.error("AdminUploadForm: Error during Firestore setDoc operation:", error.message || error);
      let userMessage = "Failed to upload medicine. ";
      if (error.message && error.message.toLowerCase().includes("permission denied") || error.message.toLowerCase().includes("missing or insufficient permissions")) {
        userMessage += "This might be due to Firestore security rules. Please check your Firebase project console.";
      } else {
        userMessage += "Please check the console for more details and ensure your internet connection and Firebase setup are correct.";
      }
      toast({
        title: "Upload Failed",
        description: userMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      console.log("AdminUploadForm: setIsSubmitting(false) in finally block. New isSubmitting state: false");
    }
  };

  // Log current isSubmitting state before render (for debugging)
  // console.log("AdminUploadForm rendering, isSubmitting:", isSubmitting, "isDirty:", isDirty, "isValid:", isValid);

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