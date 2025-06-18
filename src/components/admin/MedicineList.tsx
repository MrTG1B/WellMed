
"use client";

import { useEffect, useState } from "react";
import { ref, onValue, type DataSnapshot, off, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, ListChecks, AlertCircle, Trash2, Edit, Hash, Tag, BookOpen, Type, PackageSearch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EditMedicineDialog from "./EditMedicineDialog"; 

interface MedicineDocForList {
  drugCode: string; // Firebase key
  drugName: string;
  saltName: string;
  drugCategory?: string;
  drugGroup?: string;
  drugType?: string;
  hsnCode?: string;
  searchKey?: string;
}

export default function MedicineList() {
  const [medicines, setMedicines] = useState<MedicineDocForList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [medicineToDelete, setMedicineToDelete] = useState<MedicineDocForList | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [medicineToEdit, setMedicineToEdit] = useState<MedicineDocForList | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (!db) {
      setError("Firebase Realtime Database is not available. Please check configuration.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const medicinesRef = ref(db, "medicines");

    const listener = onValue(medicinesRef,
      (snapshot: DataSnapshot) => {
        const data = snapshot.val();
        if (data) {
          const medsList: MedicineDocForList[] = Object.keys(data).map(key => {
            const medData = data[key];
            return {
              drugCode: key,
              drugName: medData.drugName || "Unnamed Medicine",
              saltName: medData.saltName || "N/A",
              drugCategory: medData.drugCategory,
              drugGroup: medData.drugGroup,
              drugType: medData.drugType,
              hsnCode: medData.hsnCode,
              searchKey: medData.searchKey,
            };
          });
          
          medsList.sort((a, b) => {
            // Attempt numeric sort for drugCode
            const numA = parseInt(a.drugCode, 10);
            const numB = parseInt(b.drugCode, 10);
            const aIsNum = !isNaN(numA);
            const bIsNum = !isNaN(numB);

            if (aIsNum && bIsNum) return numA - numB;
            if (aIsNum) return -1;
            if (bIsNum) return 1;
            return a.drugCode.localeCompare(b.drugCode); // Fallback to string sort
          });
          setMedicines(medsList);
        } else {
          setMedicines([]);
        }
        setIsLoading(false);
        setError(null);
      },
      (err: Error) => {
        console.error("MedicineList: Error fetching medicines:", err);
        setError(`Failed to load medicines: ${err.message}.`);
        setIsLoading(false);
      }
    );
    return () => { off(medicinesRef, 'value', listener); };
  }, []);

  const handleDeleteRequest = (medicine: MedicineDocForList) => {
    setMedicineToDelete(medicine);
    setShowDeleteConfirmDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!medicineToDelete) return;
    setIsDeleting(true);
    try {
      const medicineRef = ref(db, `medicines/${medicineToDelete.drugCode}`);
      await remove(medicineRef);
      toast({ title: "Medicine Deleted", description: `"${medicineToDelete.drugName}" has been successfully deleted.` });
      setMedicineToDelete(null);
      setShowDeleteConfirmDialog(false);
    } catch (deleteError: any) {
      toast({ title: "Deletion Failed", description: `Could not delete "${medicineToDelete.drugName}". ${deleteError.message}`, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditRequest = (medicine: MedicineDocForList) => {
    setMedicineToEdit(medicine);
    setShowEditDialog(true);
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    setMedicineToEdit(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-2 flex-grow">
        <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="text-muted-foreground">Loading medicines...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="shadow-md">
        <AlertCircle className="h-5 w-5" /><AlertTitle>Error Loading Medicines</AlertTitle><AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (medicines.length === 0) {
    return (
      <Alert className="shadow-sm">
        <ListChecks className="h-5 w-5" /><AlertTitle>No Medicines Found</AlertTitle>
        <AlertDescription>There are currently no medicines stored. Use the form to upload new data.</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <ScrollArea className="flex-grow h-auto max-h-[760px] w-full rounded-md border bg-card shadow-inner">
        <div className="p-4">
          <h4 className="mb-4 text-lg font-semibold leading-none text-center text-primary">Available Medicines ({medicines.length})</h4>
          {medicines.map((medicine) => (
            <div key={medicine.drugCode} className="relative group text-sm p-3 mb-2 border-b last:border-b-0 hover:bg-muted/50 rounded-md transition-colors">
              <p className="font-semibold text-foreground">{medicine.drugName} <span className="text-xs text-muted-foreground">(Code: {medicine.drugCode})</span></p>
              <p className="text-xs text-muted-foreground"><span className="font-medium">Salt:</span> {medicine.saltName}</p>
              {medicine.drugCategory && <p className="text-xs text-muted-foreground"><Tag className="inline h-3 w-3 mr-1"/>Category: {medicine.drugCategory}</p>}
              {medicine.drugGroup && <p className="text-xs text-muted-foreground"><BookOpen className="inline h-3 w-3 mr-1"/>Group: {medicine.drugGroup}</p>}
              {medicine.drugType && <p className="text-xs text-muted-foreground"><Type className="inline h-3 w-3 mr-1"/>Type: {medicine.drugType}</p>}
              {medicine.hsnCode && <p className="text-xs text-muted-foreground"><Hash className="inline h-3 w-3 mr-1"/>HSN: {medicine.hsnCode}</p>}
              {medicine.searchKey && <p className="text-xs text-muted-foreground"><PackageSearch className="inline h-3 w-3 mr-1"/>Search Key: {medicine.searchKey}</p>}
              <div className="absolute top-1/2 right-2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                <Button variant="ghost" size="icon" className="text-primary hover:text-primary-foreground hover:bg-primary/90 p-1 h-7 w-7" onClick={() => handleEditRequest(medicine)} aria-label={`Edit ${medicine.drugName}`}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90 p-1 h-7 w-7" onClick={() => handleDeleteRequest(medicine)} aria-label={`Delete ${medicine.drugName}`} disabled={isDeleting}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {medicineToDelete && (
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{medicineToDelete.drugName}" (Code: {medicineToDelete.drugCode})? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteConfirmDialog(false)} disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {medicineToEdit && showEditDialog && (
        <EditMedicineDialog
          medicine={medicineToEdit}
          isOpen={showEditDialog}
          onClose={() => { setShowEditDialog(false); setMedicineToEdit(null); }}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}
    
