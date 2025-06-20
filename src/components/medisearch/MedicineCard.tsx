
"use client";

import type { Medicine } from "@/types";
import type { TranslationKeys } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Pill, Factory, AlertTriangle, ClipboardList, Stethoscope, Info, Hash, Tag, BookOpen, Type, PackageSearch, Fingerprint, IndianRupee, Box, Copy } from "lucide-react";

interface MedicineCardProps {
  medicine: Medicine;
  t: TranslationKeys;
}

export function MedicineCard({ medicine, t }: MedicineCardProps) {
  const { toast } = useToast();
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
        sourceMessage = t.sourceDbOnlyMessage; // Fallback if source isn't explicitly set but seems like DB only
      }
  }
  
  const showDatabaseSpecificFields = medicine.source === 'database_ai_enhanced' || medicine.source === 'database_only';

  const handleCopy = async (text: string | undefined, fieldName: string) => {
    if (!text || text === t.infoNotAvailable) return;
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: t.copiedToClipboardTitle,
        description: t.copiedToClipboardDescription(fieldName, text),
      });
    } catch (err) {
      console.error("Failed to copy: ", err);
      toast({
        title: t.copyFailedTitle,
        description: t.copyFailedDescription,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-lg shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-primary flex items-center mb-1">
          <Pill className="mr-2 h-7 w-7 flex-shrink-0" />
          <span className="break-words">
            {medicine.drugName}
          </span>
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {t.resultsTitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-0.5">
            <h3 className={detailItemClass + " flex items-center"}>
               <ClipboardList className="mr-2 h-4 w-4 text-primary" /> {t.saltNameLabel}
            </h3>
            {medicine.saltName && medicine.saltName !== t.infoNotAvailable && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={() => handleCopy(medicine.saltName, t.saltNameLabel)}
                aria-label={`Copy ${t.saltNameLabel}`}
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className={detailValueClass}>{medicine.saltName || t.infoNotAvailable}</p>
        </div>

        {showDatabaseSpecificFields && medicine.drugCode && !medicine.drugCode.startsWith('ai-gen-') && (
          <div>
            <div className="flex justify-between items-center mb-0.5">
              <h3 className={detailItemClass + " flex items-center"}>
                <Fingerprint className="mr-2 h-4 w-4 text-primary" /> {t.drugCodeLabel}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={() => handleCopy(medicine.drugCode, t.drugCodeLabel)}
                aria-label={`Copy ${t.drugCodeLabel}`}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className={detailValueClass}>{medicine.drugCode}</p>
          </div>
        )}
        
        {showDatabaseSpecificFields && medicine.mrp && (
          <div>
            <h3 className={detailItemClass + " flex items-center"}>
              <IndianRupee className="mr-2 h-4 w-4 text-primary" /> {t.mrpLabel}
            </h3>
            <p className={detailValueClass}>{medicine.mrp}</p>
          </div>
        )}

        {showDatabaseSpecificFields && medicine.uom && (
          <div>
            <h3 className={detailItemClass + " flex items-center"}>
              <Box className="mr-2 h-4 w-4 text-primary" /> {t.uomLabel}
            </h3>
            <p className={detailValueClass}>{medicine.uom}</p>
          </div>
        )}

        {showDatabaseSpecificFields && medicine.drugCategory && (
          <div>
            <h3 className={detailItemClass + " flex items-center"}>
              <Tag className="mr-2 h-4 w-4 text-primary" /> {t.drugCategoryLabel}
            </h3>
            <p className={detailValueClass}>{medicine.drugCategory}</p>
          </div>
        )}

        {showDatabaseSpecificFields && medicine.drugGroup && (
          <div>
            <h3 className={detailItemClass + " flex items-center"}>
              <BookOpen className="mr-2 h-4 w-4 text-primary" /> {t.drugGroupLabel}
            </h3>
            <p className={detailValueClass}>{medicine.drugGroup}</p>
          </div>
        )}
        
        {showDatabaseSpecificFields && medicine.drugType && (
          <div>
            <h3 className={detailItemClass + " flex items-center"}>
              <Type className="mr-2 h-4 w-4 text-primary" /> {t.drugTypeLabel}
            </h3>
            <p className={detailValueClass}>{medicine.drugType}</p>
          </div>
        )}

        {showDatabaseSpecificFields && medicine.hsnCode && (
          <div>
             <div className="flex justify-between items-center mb-0.5">
              <h3 className={detailItemClass + " flex items-center"}>
                <Hash className="mr-2 h-4 w-4 text-primary" /> {t.hsnCodeLabel}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={() => handleCopy(medicine.hsnCode, t.hsnCodeLabel)}
                aria-label={`Copy ${t.hsnCodeLabel}`}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className={detailValueClass}>{medicine.hsnCode}</p>
          </div>
        )}
        
        {showDatabaseSpecificFields && medicine.searchKey && (
          <div>
            <div className="flex justify-between items-center mb-0.5">
              <h3 className={detailItemClass + " flex items-center"}>
                <PackageSearch className="mr-2 h-4 w-4 text-primary" /> {t.searchKeyLabel}
              </h3>
               <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={() => handleCopy(medicine.searchKey, t.searchKeyLabel)}
                aria-label={`Copy ${t.searchKeyLabel}`}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className={detailValueClass}>{medicine.searchKey}</p>
          </div>
        )}

        <div>
          <h3 className={detailItemClass + " flex items-center"}>
            <Stethoscope className="mr-2 h-4 w-4 text-primary" /> {t.usageLabel}
          </h3>
          <p className={multiLineDetailValueClass}>{medicine.usage || t.infoNotAvailable}</p>
        </div>
        <div>
          <h3 className={detailItemClass + " flex items-center"}>
            <Factory className="mr-2 h-4 w-4 text-primary" /> {t.manufacturerLabel}
          </h3>
          <p className={multiLineDetailValueClass}>{medicine.manufacturer || t.infoNotAvailable}</p>
        </div>
        <div>
          <h3 className={detailItemClass + " flex items-center"}>
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-syringe mr-2 text-primary"><path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 15 4-4"/><path d="m5 19-3 3"/><path d="m12 12 4.5 4.5"/></svg>
            {t.dosageLabel}
          </h3>
          <p className={multiLineDetailValueClass}>{medicine.dosage || t.infoNotAvailable}</p>
        </div>
        <div>
          <h3 className={detailItemClass + " flex items-center"}>
            <AlertTriangle className="mr-2 h-4 w-4 text-primary" /> {t.sideEffectsLabel}
          </h3>
          <p className={multiLineDetailValueClass}>{medicine.sideEffects || t.infoNotAvailable}</p>
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
