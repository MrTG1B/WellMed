
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
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  drugCode: z.string()
    .trim()
    .min(1, { message: "Drug Code must be at least 1 character."})
    .regex(/^[a-zA-Z0-9-_]+$/, { message: "Drug Code can only contain alphanumeric characters, hyphens, and underscores." }),
  drugName: z.string().trim().min(2, { message: "Drug Name must be at least 2 characters." }),
  saltName: z.string().trim().min(5, { message: "Salt Name (Composition) must be at least 5 characters." }),
  drugCategory: z.string().trim().optional(),
  drugGroup: z.string().trim().optional(),
  drugType: z.string().trim().optional(),
  hsnCode: z.string().trim().optional(),
  searchKey: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminUploadForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      drugCode: "",
      drugName: "",
      saltName: "",
      drugCategory: "",
      drugGroup: "",
      drugType: "",
      hsnCode: "",
      searchKey: "",
    },
    mode: "onChange",
  });

   const { watch, setValue, trigger } = form;

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'saltName' && value.saltName) {
         if (!form.getValues('drugName')) {
            setValue("drugName", value.saltName, { shouldValidate: true, shouldDirty: true });
         }
         if (!form.getValues('searchKey')) {
            setValue("searchKey", value.saltName, { shouldValidate: true, shouldDirty: true });
         }
      }
      if (name === 'drugName' && value.drugName) {
        if (!form.getValues('searchKey')) {
            setValue("searchKey", value.drugName, { shouldValidate: true, shouldDirty: true });
         }
      }
      trigger();
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, trigger, form]);


  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const newDrugCode = data.drugCode.trim();

    try {
      if (!db) {
        toast({ title: "Database Error", description: "Firebase Realtime Database is not configured.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      const medicineRef = ref(db, `medicines/${newDrugCode}`);
      const existingSnapshot = await get(medicineRef);
      if (existingSnapshot.exists()) {
        toast({ title: "Conflict", description: `Drug Code "${newDrugCode}" already exists. Please use a unique Drug Code.`, variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      
      // Check for duplicate saltName (case-insensitive)
      const medicinesRef = ref(db, 'medicines');
      const allMedicinesSnapshot = await get(medicinesRef);
      if (allMedicinesSnapshot.exists()) {
          const allMedicines = allMedicinesSnapshot.val();
          for (const key in allMedicines) {
              if (allMedicines[key].saltName && allMedicines[key].saltName.toLowerCase() === data.saltName.trim().toLowerCase()) {
                  toast({
                      title: "Potential Duplicate",
                      description: `A medicine with a similar Salt Name "${data.saltName.trim()}" (Drug Code: ${key}) already exists. Please verify.`,
                      variant: "default", // Warning, not destructive
                      duration: 7000,
                  });
                  // Not blocking submission for this, just warning.
                  break; 
              }
          }
      }


      const medicineDataToSave = {
        drugName: data.drugName.trim(),
        saltName: data.saltName.trim(),
        drugCategory: data.drugCategory?.trim() || null,
        drugGroup: data.drugGroup?.trim() || null,
        drugType: data.drugType?.trim() || null,
        hsnCode: data.hsnCode?.trim() || null,
        searchKey: data.searchKey?.trim() || data.saltName.trim(), // Default searchKey to saltName if empty
        lastUpdated: new Date().toISOString(),
      };
      
      // Remove null fields before saving
      Object.keys(medicineDataToSave).forEach(key => {
        if ((medicineDataToSave as any)[key] === null || (medicineDataToSave as any)[key] === "") {
          delete (medicineDataToSave as any)[key];
        }
      });
      medicineDataToSave.lastUpdated = new Date().toISOString(); // Ensure lastUpdated is always set


      await set(medicineRef, medicineDataToSave);

      toast({ title: "Upload Successful", description: `Medicine "${medicineDataToSave.drugName}" (Code: ${newDrugCode}) data saved.` });
      form.reset();

    } catch (error: any) {
      console.error("[AdminUploadForm] Realtime Database write FAILED. Error:", error.message || error, error);
      toast({ title: "Upload Failed", description: `Failed to upload medicine. ${error.message || "An unexpected error occurred."}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <ScrollArea className="h-[calc(100vh-280px)] sm:h-[calc(100vh-250px)] md:h-auto md:max-h-[calc(80vh-150px)] pr-3">
        <div className="space-y-4">
        <FormField
          control={form.control}
          name="drugCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Drug Code (Unique ID)</FormLabel>
              <FormControl><Input placeholder="e.g., 1 or MED001" {...field} /></FormControl>
              <FormDescription>Unique identifier for this medicine (Firebase key).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="drugName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Drug Name</FormLabel>
              <FormControl><Input placeholder="e.g., Paracetamol 500mg Tablets" {...field} /></FormControl>
              <FormDescription>The display name of the medicine.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="saltName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Salt Name (Composition)</FormLabel>
              <FormControl><Textarea placeholder="e.g., Paracetamol 500mg" className="resize-none" {...field} /></FormControl>
              <FormDescription>Active ingredients and strengths. Also used as default Search Key if not provided.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="searchKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Search Key (Optional)</FormLabel>
              <FormControl><Input placeholder="e.g., paracetamol fever headache" {...field} /></FormControl>
              <FormDescription>Keywords for searching. Defaults to Salt Name or Drug Name if left blank.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="drugCategory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Drug Category (Optional)</FormLabel>
              <FormControl><Input placeholder="e.g., ACUTE, CHRONIC" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="drugGroup"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Drug Group (Optional)</FormLabel>
              <FormControl><Input placeholder="e.g., Analgesic/Antipyretic" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="drugType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Drug Type (Optional)</FormLabel>
              <FormControl><Input placeholder="e.g., BPPI, OTC" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="hsnCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>HSN Code (Optional)</FormLabel>
              <FormControl><Input placeholder="e.g., 300490" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        </div>
        </ScrollArea>
        <Button type="submit" disabled={isSubmitting || !form.formState.isValid} className="w-full mt-4">
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : "Upload Medicine"}
        </Button>
      </form>
    </Form>
  );
}
    
