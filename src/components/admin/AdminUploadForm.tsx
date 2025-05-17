
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
  medicineId: z.string()
    .trim()
    .min(2, {
      message: "Medicine ID must be at least 2 characters after trimming.",
    }).max(50, {
      message: "Medicine ID must be at most 50 characters after trimming."
    }).regex(/^[a-zA-Z0-9-_]+$/, {
      message: "Medicine ID can only contain alphanumeric characters, hyphens, and underscores (after trimming)."
    }),
  composition: z.string()
    .trim()
    .min(5, {
    message: "Composition must be at least 5 characters after trimming.",
  }),
  medicineName: z.string()
    .trim()
    .refine(val => val === '' || val.length >= 2, {
      message: "Medicine Display Name, if provided, must be at least 2 characters after trimming.",
    })
    .optional(),
  barcode: z.string().trim().optional(),
  mrp: z.string().trim().optional(),
  uom: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminUploadForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      medicineId: "",
      composition: "",
      medicineName: "",
      barcode: "",
      mrp: "",
      uom: "",
    },
    mode: "onChange", 
  });

  const { formState: { isValid }, watch, setValue, getValues, formState, trigger } = form;
  const watchedComposition = watch("composition");

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'composition') {
        setValue("medicineName", value.composition || "", { shouldValidate: true, shouldDirty: true });
      }
      // Trigger validation for all fields to update isValid state
      trigger();
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, trigger]);


  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    console.log("AdminUploadForm: onSubmit triggered. Initial isSubmitting:", form.formState.isSubmitting);
    console.log("AdminUploadForm: isSubmitting set to true.");

    const newMedicineId = data.medicineId.trim();
    const finalMedicineName = data.medicineName && data.medicineName.trim().length > 0
                            ? data.medicineName.trim()
                            : data.composition.trim(); 
    const newComposition = data.composition.trim();
    const newBarcode = data.barcode?.trim();
    const newMrp = data.mrp?.trim();
    const newUom = data.uom?.trim();

    console.log("AdminUploadForm: Generated medicineId =", newMedicineId);

    try {
      if (!db) {
        console.error("[AdminUploadForm] Firebase Realtime Database db instance is NOT available.");
        toast({
          title: "Database Error",
          description: "Firebase Realtime Database is not configured. Cannot save data.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

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
          if (existingMedicine.composition && existingMedicine.composition.toLowerCase() === newComposition.toLowerCase()) {
            compositionConflict = true;
          }
          if (newBarcode && newBarcode.length > 0 && existingMedicine.barcode && existingMedicine.barcode === newBarcode) {
            barcodeConflict = true;
          }
        }
      }

      const warningMessages: string[] = [];
      if (idConflict) {
        warningMessages.push(`Medicine ID "${newMedicineId}" already exists.`);
      }
      if (compositionConflict) {
        warningMessages.push(`A medicine with composition "${newComposition}" already exists.`);
      }
      if (barcodeConflict && newBarcode && newBarcode.length > 0) {
        warningMessages.push(`A medicine with barcode "${newBarcode}" already exists.`);
      }

      if (warningMessages.length > 0) {
        toast({
          title: "Data Conflict",
          description: warningMessages.join(" "),
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      const medicineDataToSave = {
        name: finalMedicineName,
        composition: newComposition,
        barcode: (newBarcode && newBarcode.length > 0) ? newBarcode : null,
        mrp: (newMrp && newMrp.length > 0) ? newMrp : null,
        uom: (newUom && newUom.length > 0) ? newUom : null,
        lastUpdated: new Date().toISOString(),
      };
      console.log("AdminUploadForm: Attempting set for ID:", newMedicineId, "Data:", medicineDataToSave);

      const medicineRef = ref(db, `medicines/${newMedicineId}`);
      await set(medicineRef, medicineDataToSave);
      
      toast({
        title: "Upload Successful",
        description: `Medicine "${finalMedicineName}" (ID: ${newMedicineId}) data saved.`,
      });
      form.reset(); 

    } catch (error: any) {
      console.error("[AdminUploadForm] Realtime Database write FAILED. Error:", error.message || error, error);
      let userMessage = "Failed to upload medicine. ";
      if (error.message?.toLowerCase().includes("permission_denied")) {
        userMessage += "Database permission denied. Check security rules.";
      } else if (error.message?.toLowerCase().includes("network error")) {
        userMessage += "Network error. Check connection and Firebase setup.";
      } else {
        userMessage += "An unexpected error occurred. Check console.";
      }
      toast({
        title: "Upload Failed",
        description: userMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      console.log("AdminUploadForm: isSubmitting set to false in finally block.");
    }
  };
  
  // Debugging logs
  console.log("AdminUploadForm RENDER: isSubmitting =", isSubmitting, "isValid =", isValid);
  // console.log("AdminUploadForm RENDER: Form values:", getValues());
  // console.log("AdminUploadForm RENDER: Form errors:", formState.errors);


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
                Unique ID for the medicine (alphanumeric, hyphens, underscores). Min 2 chars. Max 50 chars.
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
                Active ingredients and strengths. Used as default display name. Min 5 chars.
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
                <Input placeholder="Defaults to composition if left blank" {...field} />
              </FormControl>
              <FormDescription>
                User-friendly name. Defaults to composition if blank. If provided, min 2 chars.
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
        <FormField
          control={form.control}
          name="mrp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>MRP (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 150.75" {...field} type="text" />
              </FormControl>
              <FormDescription>
                Maximum Retail Price (INR).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="uom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit of Measure (UOM) (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Strip of 10 tablets, 100ml bottle" {...field} />
              </FormControl>
              <FormDescription>
                The packaging unit.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting || !isValid } className="w-full">
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

    