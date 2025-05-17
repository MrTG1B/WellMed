
"use client";

import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
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
import { ref, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

interface MedicineDoc {
  id: string;
  name: string;
  composition?: string;
  barcode?: string;
  mrp?: string; // Added MRP
  uom?: string;  // Added UOM
}

interface EditMedicineDialogProps {
  medicine: MedicineDoc;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const formSchema = z.object({
  medicineId: z.string(), // Will be read-only
  composition: z.string().trim().min(5, {
    message: "Composition must be at least 5 characters after trimming.",
  }),
  medicineName: z.string()
    .trim()
    .refine(val => val === '' || val.length >= 2, {
      message: "Medicine Display Name, if provided, must be at least 2 characters after trimming.",
    })
    .optional(),
  barcode: z.string().trim().optional(),
  mrp: z.string().trim().optional(), // Added MRP
  uom: z.string().trim().optional(), // Added UOM
});

type FormValues = z.infer<typeof formSchema>;

export default function EditMedicineDialog({ medicine, isOpen, onClose, onSuccess }: EditMedicineDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      medicineId: medicine.id,
      composition: medicine.composition || "",
      medicineName: medicine.name || "",
      barcode: medicine.barcode || "",
      mrp: medicine.mrp || "", // Default MRP
      uom: medicine.uom || "", // Default UOM
    },
    mode: "onChange",
  });

  useEffect(() => {
    form.reset({
      medicineId: medicine.id,
      composition: medicine.composition || "",
      medicineName: medicine.name || "",
      barcode: medicine.barcode || "",
      mrp: medicine.mrp || "", // Reset MRP
      uom: medicine.uom || "", // Reset UOM
    });
  }, [medicine, form]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const finalMedicineName = data.medicineName && data.medicineName.trim().length > 0
                            ? data.medicineName.trim()
                            : data.composition.trim();
    const updatedComposition = data.composition.trim();
    const updatedBarcode = data.barcode?.trim();
    const updatedMrp = data.mrp?.trim(); // Get MRP
    const updatedUom = data.uom?.trim(); // Get UOM

    try {
      if (!db) {
        toast({
          title: "Database Error",
          description: "Firebase Realtime Database is not configured.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const medicineDataToUpdate: any = {
        name: finalMedicineName,
        composition: updatedComposition,
        barcode: (updatedBarcode && updatedBarcode.length > 0) ? updatedBarcode : null,
        mrp: (updatedMrp && updatedMrp.length > 0) ? updatedMrp : null, // Update MRP
        uom: (updatedUom && updatedUom.length > 0) ? updatedUom : null, // Update UOM
        lastUpdated: new Date().toISOString(),
      };
      
      Object.keys(medicineDataToUpdate).forEach(key => {
        if (medicineDataToUpdate[key] === null) {
          // For RTDB, setting a field to null deletes it.
          // If you want to ensure fields are explicitly removed if empty, this is correct.
          // If you want to keep empty strings, remove this deletion logic and ensure nulls are handled as empty strings before this.
        }
      });

      const medicineRef = ref(db, `medicines/${medicine.id}`);
      await update(medicineRef, medicineDataToUpdate);

      toast({
        title: "Update Successful",
        description: `Medicine "${finalMedicineName}" (ID: ${medicine.id}) updated.`,
      });
      onSuccess(); 
    } catch (error: any) {
      console.error("[EditMedicineDialog] Realtime Database update FAILED. Error:", error.message || error, error);
      toast({
        title: "Update Failed",
        description: `Failed to update medicine. ${error.message || "An unexpected error occurred."}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Medicine: {medicine.name} ({medicine.id})</DialogTitle>
          <DialogDescription>
            Make changes to the medicine details below. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="medicineId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medicine ID (Read-only)</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly disabled className="bg-muted/50" />
                  </FormControl>
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
                      placeholder="e.g., Paracetamol 500mg"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Active ingredients and strengths. Min 5 chars.
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
                    <Input placeholder="e.g., 150.75" {...field} type="text"/>
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
                    <Input placeholder="e.g., Strip of 10 tablets" {...field} />
                  </FormControl>
                  <FormDescription>
                    The packaging unit.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || !form.formState.isValid || !form.formState.isDirty}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
    