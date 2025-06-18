
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
import { ref, update, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MedicineDocForEdit {
  drugCode: string;
  drugName: string;
  saltName: string;
  drugCategory?: string;
  drugGroup?: string;
  drugType?: string;
  hsnCode?: string;
  searchKey?: string;
}

interface EditMedicineDialogProps {
  medicine: MedicineDocForEdit;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const formSchema = z.object({
  drugCode: z.string(), // Read-only
  drugName: z.string().trim().min(2, { message: "Drug Name must be at least 2 characters." }),
  saltName: z.string().trim().min(5, { message: "Salt Name (Composition) must be at least 5 characters." }),
  drugCategory: z.string().trim().optional(),
  drugGroup: z.string().trim().optional(),
  drugType: z.string().trim().optional(),
  hsnCode: z.string().trim().optional(),
  searchKey: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditMedicineDialog({ medicine, isOpen, onClose, onSuccess }: EditMedicineDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      drugCode: medicine.drugCode,
      drugName: medicine.drugName || "",
      saltName: medicine.saltName || "",
      drugCategory: medicine.drugCategory || "",
      drugGroup: medicine.drugGroup || "",
      drugType: medicine.drugType || "",
      hsnCode: medicine.hsnCode || "",
      searchKey: medicine.searchKey || "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    form.reset({
      drugCode: medicine.drugCode,
      drugName: medicine.drugName || "",
      saltName: medicine.saltName || "",
      drugCategory: medicine.drugCategory || "",
      drugGroup: medicine.drugGroup || "",
      drugType: medicine.drugType || "",
      hsnCode: medicine.hsnCode || "",
      searchKey: medicine.searchKey || "",
    });
  }, [medicine, form]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (!db) {
        toast({ title: "Database Error", description: "Firebase Realtime Database is not configured.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      
      const currentSaltName = data.saltName.trim().toLowerCase();
      const medicinesRef = ref(db, 'medicines');
      const allMedicinesSnapshot = await get(medicinesRef);
      if (allMedicinesSnapshot.exists()) {
          const allMedicines = allMedicinesSnapshot.val();
          for (const key in allMedicines) {
              if (key !== medicine.drugCode && allMedicines[key].saltName && allMedicines[key].saltName.toLowerCase() === currentSaltName) {
                   toast({
                      title: "Potential Duplicate Salt Name",
                      description: `Another medicine (Drug Code: ${key}) already has a similar Salt Name. Please verify to avoid duplicates.`,
                      variant: "default",
                      duration: 7000,
                  });
                  break; 
              }
          }
      }


      const medicineDataToUpdate: any = {
        drugName: data.drugName.trim(),
        saltName: data.saltName.trim(),
        drugCategory: data.drugCategory?.trim() || null,
        drugGroup: data.drugGroup?.trim() || null,
        drugType: data.drugType?.trim() || null,
        hsnCode: data.hsnCode?.trim() || null,
        searchKey: data.searchKey?.trim() || data.saltName.trim(),
        lastUpdated: new Date().toISOString(),
      };
      
      Object.keys(medicineDataToUpdate).forEach(key => {
        if (medicineDataToUpdate[key] === null || medicineDataToUpdate[key] === "") {
           delete medicineDataToUpdate[key];
        }
      });
      medicineDataToUpdate.lastUpdated = new Date().toISOString();


      const medicineDbRef = ref(db, `medicines/${medicine.drugCode}`);
      await update(medicineDbRef, medicineDataToUpdate);

      toast({ title: "Update Successful", description: `Medicine "${medicineDataToUpdate.drugName}" (Code: ${medicine.drugCode}) updated.` });
      onSuccess(); 
    } catch (error: any) {
      console.error("[EditMedicineDialog] Realtime Database update FAILED. Error:", error.message || error, error);
      toast({ title: "Update Failed", description: `Failed to update medicine. ${error.message || "An unexpected error occurred."}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Medicine: {medicine.drugName} ({medicine.drugCode})</DialogTitle>
          <DialogDescription>
            Make changes to the medicine details below. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <ScrollArea className="max-h-[60vh] pr-3">
            <div className="space-y-4">
            <FormField control={form.control} name="drugCode" render={({ field }) => (
                <FormItem><FormLabel>Drug Code (Read-only)</FormLabel><FormControl><Input {...field} readOnly disabled className="bg-muted/50" /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="drugName" render={({ field }) => (
                <FormItem><FormLabel>Drug Name</FormLabel><FormControl><Input placeholder="e.g., Paracetamol 500mg Tablets" {...field} /></FormControl><FormDescription>The display name.</FormDescription><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="saltName" render={({ field }) => (
                <FormItem><FormLabel>Salt Name (Composition)</FormLabel><FormControl><Textarea placeholder="e.g., Paracetamol 500mg" className="resize-none" {...field} /></FormControl><FormDescription>Active ingredients. Also default Search Key.</FormDescription><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="searchKey" render={({ field }) => (
                <FormItem><FormLabel>Search Key (Optional)</FormLabel><FormControl><Input placeholder="e.g., paracetamol fever headache" {...field} /></FormControl><FormDescription>Keywords for searching.</FormDescription><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="drugCategory" render={({ field }) => (
                <FormItem><FormLabel>Drug Category (Optional)</FormLabel><FormControl><Input placeholder="e.g., ACUTE, CHRONIC" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="drugGroup" render={({ field }) => (
                <FormItem><FormLabel>Drug Group (Optional)</FormLabel><FormControl><Input placeholder="e.g., Analgesic/Antipyretic" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="drugType" render={({ field }) => (
                <FormItem><FormLabel>Drug Type (Optional)</FormLabel><FormControl><Input placeholder="e.g., BPPI, OTC" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="hsnCode" render={({ field }) => (
                <FormItem><FormLabel>HSN Code (Optional)</FormLabel><FormControl><Input placeholder="e.g., 300490" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            </div>
            </ScrollArea>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting || !form.formState.isValid || !form.formState.isDirty}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
    
