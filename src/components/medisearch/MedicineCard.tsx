"use client";

import type { Medicine } from "@/types";
import type { TranslationKeys } from "@/lib/translations";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Barcode, Pill, Factory, AlertTriangle, ClipboardList, Stethoscope } from "lucide-react";

interface MedicineCardProps {
  medicine: Medicine;
  t: TranslationKeys;
}

export function MedicineCard({ medicine, t }: MedicineCardProps) {
  const detailItemClass = "text-sm font-medium text-foreground/80";
  const detailValueClass = "text-base text-foreground";

  return (
    <Card className="w-full max-w-lg shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-primary flex items-center">
          <Pill className="mr-2 h-7 w-7" />
          {medicine.name}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {t.resultsTitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className={detailItemClass + " flex items-center"}>
             <ClipboardList className="mr-2 h-4 w-4 text-primary" /> {t.compositionLabel}
          </h3>
          <p className={detailValueClass}>{medicine.composition}</p>
        </div>
        <div>
          <h3 className={detailItemClass + " flex items-center"}>
            <Stethoscope className="mr-2 h-4 w-4 text-primary" /> {t.usageLabel}
          </h3>
          <p className={detailValueClass}>{medicine.usage}</p>
        </div>
        <div>
          <h3 className={detailItemClass + " flex items-center"}>
            <Factory className="mr-2 h-4 w-4 text-primary" /> {t.manufacturerLabel}
          </h3>
          <p className={detailValueClass}>{medicine.manufacturer}</p>
        </div>
        <div>
          <h3 className={detailItemClass + " flex items-center"}>
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-syringe mr-2 text-primary"><path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 15 4-4"/><path d="m5 19-3 3"/><path d="m12 12 4.5 4.5"/></svg>
            {t.dosageLabel}
          </h3>
          <p className={detailValueClass}>{medicine.dosage}</p>
        </div>
        <div>
          <h3 className={detailItemClass + " flex items-center"}>
            <AlertTriangle className="mr-2 h-4 w-4 text-primary" /> {t.sideEffectsLabel}
          </h3>
          <p className={detailValueClass}>{medicine.sideEffects}</p>
        </div>
        {medicine.barcode && (
          <div>
            <h3 className={detailItemClass + " flex items-center"}>
              <Barcode className="mr-2 h-4 w-4 text-primary" /> {t.barcodeLabel}
            </h3>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-base font-mono">
                {medicine.barcode}
              </Badge>
            </div>
          </div>
        )}
        {!medicine.barcode && (
           <div>
            <h3 className={detailItemClass + " flex items-center"}>
             <Barcode className="mr-2 h-4 w-4 text-primary" /> {t.barcodeLabel}
            </h3>
             <p className="text-sm text-muted-foreground italic">Not available</p>
           </div>
        )}
      </CardContent>
    </Card>
  );
}
