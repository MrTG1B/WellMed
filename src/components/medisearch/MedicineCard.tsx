
"use client";

import type { Medicine } from "@/types";
import type { TranslationKeys } from "@/lib/translations";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Pill, Factory, AlertTriangle, ClipboardList, Stethoscope, Info, Hash, Tag, BookOpen, Type, PackageSearch, Fingerprint } from "lucide-react";

interface MedicineCardProps {
  medicine: Medicine;
  t: TranslationKeys;
}

export function MedicineCard({ medicine, t }: MedicineCardProps) {
  const detailItemClass = "text-sm font-medium text-foreground/80";
  const detailValueClass = "text-base text-foreground";
  const multiLineDetailValueClass = `${detailValueClass} whitespace-pre-line`;

  let sourceMessage = "";
  switch (medicine.source) {
    case 'database_ai_enhanced':
      sourceMessage = t.sourceDbAiMessage;
      break;
    case 'ai_generated':
      sourceMessage = t.sourceAiOnlyMessage;
      break;
    case 'database_only':
      sourceMessage = t.sourceDbOnlyMessage;
      break;
    case 'ai_unavailable':
      sourceMessage = t.sourceAiUnavailableForDetailsMessage(medicine.drugName);
      break;
    case 'ai_failed':
      sourceMessage = t.sourceAiFailedForDetailsMessage(medicine.drugName);
      break;
    default:
      if (medicine.drugName && medicine.saltName && medicine.usage === t.infoNotAvailable) {
        sourceMessage = t.sourceDbOnlyMessage;
      }
  }

  return (
    <Card className="w-full max-w-lg shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-primary flex items-center mb-1">
          <Pill className="mr-2 h-7 w-7 flex-shrink-0" />
          <span className="break-words">
            {medicine.drugName}
            {!medicine.drugCode.startsWith('ai-') && (
              <span className="text-sm font-normal text-muted-foreground ml-2">({t.drugCodeLabel}: {medicine.drugCode})</span>
            )}
          </span>
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {t.resultsTitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className={detailItemClass + " flex items-center"}>
             <ClipboardList className="mr-2 h-4 w-4 text-primary" /> {t.saltNameLabel}
          </h3>
          <p className={detailValueClass}>{medicine.saltName}</p>
        </div>

        {medicine.drugCategory && (
          <div>
            <h3 className={detailItemClass + " flex items-center"}>
              <Tag className="mr-2 h-4 w-4 text-primary" /> {t.drugCategoryLabel}
            </h3>
            <p className={detailValueClass}>{medicine.drugCategory}</p>
          </div>
        )}

        {medicine.drugGroup && (
          <div>
            <h3 className={detailItemClass + " flex items-center"}>
              <BookOpen className="mr-2 h-4 w-4 text-primary" /> {t.drugGroupLabel}
            </h3>
            <p className={detailValueClass}>{medicine.drugGroup}</p>
          </div>
        )}
        
        {medicine.drugType && (
          <div>
            <h3 className={detailItemClass + " flex items-center"}>
              <Type className="mr-2 h-4 w-4 text-primary" /> {t.drugTypeLabel}
            </h3>
            <p className={detailValueClass}>{medicine.drugType}</p>
          </div>
        )}

        {medicine.hsnCode && (
          <div>
            <h3 className={detailItemClass + " flex items-center"}>
              <Hash className="mr-2 h-4 w-4 text-primary" /> {t.hsnCodeLabel}
            </h3>
            <p className={detailValueClass}>{medicine.hsnCode}</p>
          </div>
        )}
        
        {medicine.searchKey && (
          <div>
            <h3 className={detailItemClass + " flex items-center"}>
              <PackageSearch className="mr-2 h-4 w-4 text-primary" /> {t.searchKeyLabel}
            </h3>
            <p className={detailValueClass}>{medicine.searchKey}</p>
          </div>
        )}

        <div>
          <h3 className={detailItemClass + " flex items-center"}>
            <Stethoscope className="mr-2 h-4 w-4 text-primary" /> {t.usageLabel}
          </h3>
          <p className={multiLineDetailValueClass}>{medicine.usage}</p>
        </div>
        <div>
          <h3 className={detailItemClass + " flex items-center"}>
            <Factory className="mr-2 h-4 w-4 text-primary" /> {t.manufacturerLabel}
          </h3>
          <p className={multiLineDetailValueClass}>{medicine.manufacturer}</p>
        </div>
        <div>
          <h3 className={detailItemClass + " flex items-center"}>
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-syringe mr-2 text-primary"><path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 15 4-4"/><path d="m5 19-3 3"/><path d="m12 12 4.5 4.5"/></svg>
            {t.dosageLabel}
          </h3>
          <p className={multiLineDetailValueClass}>{medicine.dosage}</p>
        </div>
        <div>
          <h3 className={detailItemClass + " flex items-center"}>
            <AlertTriangle className="mr-2 h-4 w-4 text-primary" /> {t.sideEffectsLabel}
          </h3>
          <p className={multiLineDetailValueClass}>{medicine.sideEffects}</p>
        </div>
        
      </CardContent>
      {sourceMessage && (
        <CardFooter className="text-xs text-muted-foreground italic pt-4 border-t">
          <Info className="mr-2 h-3 w-3" />
          {sourceMessage}
        </CardFooter>
      )}
    </Card>
  );
}

