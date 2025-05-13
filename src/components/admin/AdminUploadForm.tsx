
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
import { Textarea } from "@/components/ui/textarea"; // Using Textarea for potentially longer composition string
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

const medicineFormSchema = z.object({
  medicineId: z.string().min(1, { message: "Medicine ID is required." })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: "Medicine ID can only contain letters, numbers, hyphens, and underscores." }),
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
      const medicineDocRef = doc(db, "medicines", data.medicineId);
      
      const dataToUpload: { composition: string; barcode?: string } = {
        composition: data.composition,
      };
      if (data.barcode && data.barcode.trim() !== "") {
        dataToUpload.barcode = data.barcode.trim();
      }

      await setDoc(medicineDocRef, dataToUpload, { merge: true });

      toast({
        title: "Success",
        description: `Medicine data for ID "${data.medicineId}" uploaded successfully.`,
      });
      form.reset(); // Reset form after successful submission
    } catch (error) {
      console.error("Error uploading medicine data:", error);
      toast({
        title: "Error",
        description: "Failed to upload medicine data. Please try again.",
        variant: "destructive",
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
                <Input placeholder="Enter medicine ID (e.g., 1, 2, ParacetamolID)" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormDescription>
                This ID links to the medicine in the system. It should match an existing ID or be a new unique ID.
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
