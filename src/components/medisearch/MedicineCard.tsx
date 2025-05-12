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
import { Barcode } from "lucide-react";

interface MedicineCardProps {
  medicine: Medicine;
  t: TranslationKeys;
}

export function MedicineCard({ medicine, t }: MedicineCardProps) {
  return (
    <Card className="w-full max-w-lg shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-primary">
          {medicine.name}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {t.resultsTitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-foreground/80">
            {t.compositionLabel}
          </h3>
          <p className="text-base text-foreground">{medicine.composition}</p>
        </div>
        {medicine.barcode && (
          <div>
            <h3 className="text-sm font-medium text-foreground/80">
              {t.barcodeLabel}
            </h3>
            <div className="flex items-center space-x-2">
              <Barcode className="h-5 w-5 text-primary" />
              <Badge variant="secondary" className="text-base font-mono">
                {medicine.barcode}
              </Badge>
            </div>
          </div>
        )}
        {!medicine.barcode && (
           <div>
            <h3 className="text-sm font-medium text-foreground/80">
              {t.barcodeLabel}
            </h3>
             <p className="text-sm text-muted-foreground italic">Not available</p>
           </div>
        )}
      </CardContent>
    </Card>
  );
}
