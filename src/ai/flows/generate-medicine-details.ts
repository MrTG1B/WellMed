
'use server';
/**
 * @fileOverview Generates detailed medicine information using AI.
 * It can generate all details from a search term or supplement existing
 * database information (name, composition, barcode) with AI-generated
 * usage, manufacturer, dosage, and side effects.
 *
 * - generateMedicineDetails - Main exported function to call the flow.
 * - GenerateMedicineDetailsInput - Input type for the flow.
 * - GenerateMedicineDetailsOutput - Output type for the flow.
 */

import {ai} from '@/ai/genkit';
import type { Language } from '@/types';
import { getTranslations } from '@/lib/translations';
import {z} from 'genkit';

const GenerateMedicineDetailsInputSchema = z.object({
  searchTermOrName: z.string().describe('The initial search term, or the medicine name if found in the database.'),
  language: z.enum(['en', 'hi', 'bn']).describe('The language for the generated details.'),
  contextName: z.string().optional().describe('The medicine name, if already known from the database. This might be an ID like "06".'),
  contextComposition: z.string().optional().describe('The medicine composition, if already known from the database. This is key for generating details.'),
  contextBarcode: z.string().optional().describe('The medicine barcode, if already known from the database.'),
});
export type GenerateMedicineDetailsInput = z.infer<typeof GenerateMedicineDetailsInputSchema>;

const GenerateMedicineDetailsOutputSchema = z.object({
  name: z.string().describe('The common name of the medicine.'),
  composition: z.string().describe('The typical composition/active ingredients of the medicine.'),
  usage: z.string().describe('Typical usage or indications for the medicine.'),
  manufacturer: z.string().describe('Common manufacturer(s) of the medicine. If multiple, list prominent ones.'),
  dosage: z.string().describe('General dosage guidelines for the medicine.'),
  sideEffects: z.string().describe('Common side effects associated with the medicine.'),
  barcode: z.string().optional().describe('The barcode of the medicine, if applicable or provided in context.'),
  source: z.enum(['database_ai_enhanced', 'ai_generated', 'database_only', 'ai_unavailable', 'ai_failed']).describe('Indicates if the primary details were from a database and enhanced by AI, or if all details were AI-generated, or if only database details are available due to AI failure/unavailability.'),
});
export type GenerateMedicineDetailsOutput = z.infer<typeof GenerateMedicineDetailsOutputSchema>;


export async function generateMedicineDetails(input: GenerateMedicineDetailsInput): Promise<GenerateMedicineDetailsOutput> {
  const languageToUse = input.language || 'en';
  const t_fallback = getTranslations(languageToUse);

  if (!input || (typeof input.searchTermOrName !== 'string' || input.searchTermOrName.trim() === '') && (!input.contextName || !input.contextComposition)) {
    console.warn(`[generateMedicineDetails wrapper] Invalid or empty input. Input: ${JSON.stringify(input)}`);
    return {
      name: input?.contextName || input?.searchTermOrName || t_fallback.infoNotAvailable,
      composition: input?.contextComposition || t_fallback.infoNotAvailable,
      usage: t_fallback.infoNotAvailable,
      manufacturer: t_fallback.infoNotAvailable,
      dosage: t_fallback.infoNotAvailable,
      sideEffects: t_fallback.infoNotAvailable,
      barcode: input?.contextBarcode,
      source: 'ai_failed', // Or 'database_only' if context existed but searchTerm was main issue.
    };
  }

  const nameForFallback = input.contextName || input.searchTermOrName || t_fallback.infoNotAvailable;

  try {
    const result = await generateMedicineDetailsFlow(input);

    if (result.source === 'ai_unavailable') {
        console.warn(`[generateMedicineDetails wrapper] Flow indicated AI is unavailable. Input: ${JSON.stringify(input)}`);
    }

    const validatedResult = {
        ...result,
        name: result.name || nameForFallback, // Ensure name is not lost
        composition: result.composition || input.contextComposition || t_fallback.infoNotAvailable, // Ensure composition is not lost
    };
    return validatedResult;

  } catch (error: unknown) {
    let rawErrorMessage = "Unknown AI error during flow execution in wrapper.";
    if (error instanceof Error) {
      rawErrorMessage = error.message;
    } else if (typeof error === 'string') {
      rawErrorMessage = error;
    }
    // More prominent logging for wrapper catch
    console.error(`!!!!!!!! ERROR IN generateMedicineDetails WRAPPER !!!!!!!!`);
    console.error(`Input: ${JSON.stringify(input)}`);
    console.error(`Message: ${rawErrorMessage}`);
    console.error(`Full Error Object:`, error);
    console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);


    const source: GenerateMedicineDetailsOutput['source'] = (input.contextName && input.contextComposition) ? 'database_only' : 'ai_failed';
     return {
      name: nameForFallback,
      composition: input.contextComposition || t_fallback.infoNotAvailable,
      usage: t_fallback.infoNotAvailable,
      manufacturer: t_fallback.infoNotAvailable,
      dosage: t_fallback.infoNotAvailable,
      sideEffects: t_fallback.infoNotAvailable,
      barcode: input.contextBarcode,
      source: source,
    };
  }
}

const medicineDetailsPrompt = ai.definePrompt({
  name: 'generateMedicineDetailsPrompt',
  model: 'googleai/gemini-pro',
  input: {schema: GenerateMedicineDetailsInputSchema},
  output: {schema: GenerateMedicineDetailsOutputSchema},
  prompt: `You are a highly knowledgeable pharmaceutical AI assistant. Your goal is to provide comprehensive and accurate medicine details in the specified language: {{language}}.

{{#if contextComposition}}
The user has provided context for a medicine:
Identifier (Name/ID): "{{contextName}}"
Composition: "{{contextComposition}}"
{{#if contextBarcode}}Barcode: "{{contextBarcode}}"{{/if}}

Your primary task is to use the provided 'Composition: "{{contextComposition}}"' to generate the following details for the medicine (identified as "{{contextName}}") in {{language}}:
- usage: Typical usage or indications for a medicine with this composition.
- manufacturer: Common manufacturer(s) of medicines with this composition. If multiple, list prominent ones.
- dosage: General dosage guidelines for a medicine with this composition.
- sideEffects: Common side effects associated with this composition.

CRITICALLY, the output 'source' field MUST be "database_ai_enhanced".
The output 'name' field MUST be "{{contextName}}".
The output 'composition' field MUST be "{{contextComposition}}".
{{#if contextBarcode}}The output 'barcode' field SHOULD be "{{contextBarcode}}".{{else}}If a common barcode is known for a medicine with this composition, provide it; otherwise, you can omit the 'barcode' field or leave it empty.{{/if}}

If you cannot find specific information for any of the generated fields (usage, manufacturer, dosage, sideEffects) based on the composition, PROVIDE AN EMPTY STRING for that field. Do NOT use phrases like 'Information not available' or 'Not found' yourself in these fields. The system will handle fallbacks for empty strings.

Example for contextName="Paracetamol 500mg", contextComposition="Paracetamol 500mg", language="en":
  name: "Paracetamol 500mg"
  composition: "Paracetamol 500mg"
  usage: "Used to treat pain and fever, such as headaches, muscle aches, arthritis, backache, toothaches, colds, and fevers."
  manufacturer: "Various (e.g., GSK, Mallinckrodt, Aurobindo)"
  dosage: "For adults, 1 to 2 tablets (500mg to 1000mg) every 4 to 6 hours as needed. Do not exceed 4000mg in 24 hours."
  sideEffects: "Generally well-tolerated. Rare side effects may include allergic reactions, skin rash, or liver damage with overdose."
  barcode: "123456789012"
  source: "database_ai_enhanced"

{{else}}
The user is searching for information related to: "{{searchTermOrName}}".
This term could be a medicine name, a partial name, a composition, or a barcode.

First, try to identify the most likely specific medicine based on "{{searchTermOrName}}".
Then, provide the following details for that identified medicine in {{language}}:
- Common name (this should be your identified medicine name).
- Typical composition/active ingredients.
- Typical usage or indications.
- Common manufacturer(s) (if multiple, list prominent ones).
- General dosage guidelines.
- Common side effects.
- Barcode (if identifiable and applicable, otherwise omit or leave empty).

If "{{searchTermOrName}}" is a barcode, try to identify the medicine and its details.
If "{{searchTermOrName}}" seems to be a composition, describe a common medicine with that composition.
If you cannot confidently identify a specific medicine from "{{searchTermOrName}}", use "{{searchTermOrName}}" as the name if it seems like a product, or a generic phrase like "Medicine based on '{{searchTermOrName}}'" for the name field, and use the original "{{searchTermOrName}}" or its key components for the composition field.
The output 'source' field MUST be "ai_generated".
PROVIDE AN EMPTY STRING for any detail field if information cannot be found. Do NOT use phrases like 'Information not available' or 'Not found' yourself in these fields.

Example for searchTermOrName="Amoxicillin", language="en":
  name: "Amoxicillin"
  composition: "Amoxicillin Trihydrate (e.g., 250mg or 500mg capsules)"
  usage: "Used to treat a wide variety of bacterial infections including those of the ear, nose, throat, skin, and urinary tract."
  manufacturer: "Various generic manufacturers (e.g., Sandoz, Teva, Hikma)"
  dosage: "Typically 250mg to 500mg three times a day for adults, or as prescribed by a doctor. Dosage for children varies by weight."
  sideEffects: "Common: Nausea, diarrhea, rash. Less common: Vomiting, headache. Seek medical attention for severe allergic reactions."
  barcode: ""
  source: "ai_generated"
{{/if}}

Ensure all textual output (name, composition, usage, manufacturer, dosage, sideEffects) is in {{language}}.
The 'source' field must be one of: 'database_ai_enhanced', 'ai_generated', as specified above. Do not use 'database_only', 'ai_unavailable', or 'ai_failed' in the direct AI response.
`,
});

const generateMedicineDetailsFlow = ai.defineFlow(
  {
    name: 'generateMedicineDetailsFlow',
    inputSchema: GenerateMedicineDetailsInputSchema,
    outputSchema: GenerateMedicineDetailsOutputSchema,
  },
  async (input: GenerateMedicineDetailsInput): Promise<GenerateMedicineDetailsOutput> => {
    let rawOutputFromAI: GenerateMedicineDetailsOutput | null = null;
    const t_flow_fallback = getTranslations(input.language || 'en');

    try {
      console.log("******************************************************************");
      console.log("[generateMedicineDetailsFlow] Attempting AI prompt call.");
      console.log("[generateMedicineDetailsFlow] Input to AI prompt:", JSON.stringify(input, null, 2));
      console.log("******************************************************************");

      const {output} = await medicineDetailsPrompt(input); // Call to AI
      rawOutputFromAI = output;

      console.log("******************************************************************");
      console.log("[generateMedicineDetailsFlow] AI Prompt Call Completed.");
      console.log("[generateMedicineDetailsFlow] Value of rawOutputFromAI immediately after assignment:", 
        rawOutputFromAI === null ? "NULL_VALUE" : 
        rawOutputFromAI === undefined ? "UNDEFINED_VALUE" : 
        JSON.stringify(rawOutputFromAI, null, 2)
      );
      console.log("******************************************************************");


      if (!rawOutputFromAI || typeof rawOutputFromAI.name !== 'string' || typeof rawOutputFromAI.composition !== 'string') {
        console.warn(
          "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
          "\n[generateMedicineDetailsFlow] CRITICAL ISSUE: AI returned invalid basic structure (e.g., null, undefined, or missing essential name/composition string fields).",
          "\nInput:", JSON.stringify(input, null, 2),
          "\nRaw Output as received:", rawOutputFromAI === null ? "NULL_VALUE" : rawOutputFromAI === undefined ? "UNDEFINED_VALUE" : JSON.stringify(rawOutputFromAI, null, 2),
          "\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
        );

        const sourceForFailure: GenerateMedicineDetailsOutput['source'] = input.contextName ? 'database_only' : 'ai_failed';
        return {
            name: input.contextName || input.searchTermOrName || t_flow_fallback.infoNotAvailable,
            composition: input.contextComposition || t_flow_fallback.infoNotAvailable,
            usage: t_flow_fallback.infoNotAvailable,
            manufacturer: t_flow_fallback.infoNotAvailable,
            dosage: t_flow_fallback.infoNotAvailable,
            sideEffects: t_flow_fallback.infoNotAvailable,
            barcode: input.contextBarcode,
            source: sourceForFailure,
        };
      }

      // If we reach here, rawOutputFromAI is not null/undefined and has at least name/composition strings.
      console.log("[generateMedicineDetailsFlow] Raw AI Output (BEFORE further validation):", JSON.stringify(rawOutputFromAI, null, 2));

      let finalSource: GenerateMedicineDetailsOutput['source'];
      let finalName: string;
      let finalComposition: string;
      let finalUsage: string;
      let finalManufacturer: string;
      let finalDosage: string;
      let finalSideEffects: string;
      let finalBarcode: string | undefined;

      if (input.contextName && input.contextComposition) {
        // DB Context Path
        finalName = input.contextName; // Must use DB context name
        finalComposition = input.contextComposition; // Must use DB context composition

        if (rawOutputFromAI.source === 'database_ai_enhanced') {
          finalSource = 'database_ai_enhanced';
          // Use AI's version of details if provided (non-empty string), else fallback
          finalUsage = (rawOutputFromAI.usage && rawOutputFromAI.usage.trim() !== '') ? rawOutputFromAI.usage.trim() : t_flow_fallback.infoNotAvailable;
          finalManufacturer = (rawOutputFromAI.manufacturer && rawOutputFromAI.manufacturer.trim() !== '') ? rawOutputFromAI.manufacturer.trim() : t_flow_fallback.infoNotAvailable;
          finalDosage = (rawOutputFromAI.dosage && rawOutputFromAI.dosage.trim() !== '') ? rawOutputFromAI.dosage.trim() : t_flow_fallback.infoNotAvailable;
          finalSideEffects = (rawOutputFromAI.sideEffects && rawOutputFromAI.sideEffects.trim() !== '') ? rawOutputFromAI.sideEffects.trim() : t_flow_fallback.infoNotAvailable;
          finalBarcode = rawOutputFromAI.barcode?.trim() || input.contextBarcode || undefined; // Prefer AI barcode if new, else DB, else undefined

          // Check if any actual enhancement occurred beyond just name/composition/barcode from context
          const anyDetailEnhanced = 
            (finalUsage !== t_flow_fallback.infoNotAvailable && (input.contextComposition ? !input.contextComposition.includes(finalUsage) : true)) || // Example check: usage is new
            (finalManufacturer !== t_flow_fallback.infoNotAvailable) ||
            (finalDosage !== t_flow_fallback.infoNotAvailable) ||
            (finalSideEffects !== t_flow_fallback.infoNotAvailable) ||
            (finalBarcode && finalBarcode !== input.contextBarcode);


          if (!anyDetailEnhanced && finalUsage === t_flow_fallback.infoNotAvailable && finalManufacturer === t_flow_fallback.infoNotAvailable && finalDosage === t_flow_fallback.infoNotAvailable && finalSideEffects === t_flow_fallback.infoNotAvailable ) {
            console.log("[generateMedicineDetailsFlow] AI reported 'database_ai_enhanced' but provided no new textual details beyond context or fallbacks for usage, manufacturer, dosage, sideEffects. Downgrading to 'database_only'.");
            finalSource = 'database_only';
          }

        } else {
          console.warn(`[generateMedicineDetailsFlow] In DB context path, AI returned source '${rawOutputFromAI.source}' instead of expected 'database_ai_enhanced'. Raw AI output: ${JSON.stringify(rawOutputFromAI)}. Falling back to database_only.`);
          finalSource = 'database_only';
          finalUsage = t_flow_fallback.infoNotAvailable;
          finalManufacturer = t_flow_fallback.infoNotAvailable;
          finalDosage = t_flow_fallback.infoNotAvailable;
          finalSideEffects = t_flow_fallback.infoNotAvailable;
          finalBarcode = input.contextBarcode;
        }
      } else {
        // AI Generated Path (no DB context for name/composition)
        // Name and composition MUST come from AI here if it's 'ai_generated'
        if (rawOutputFromAI.source === 'ai_generated' && rawOutputFromAI.name.trim() !== '' && rawOutputFromAI.composition.trim() !== '') {
          finalSource = 'ai_generated';
          finalName = rawOutputFromAI.name.trim();
          finalComposition = rawOutputFromAI.composition.trim();
          finalUsage = (rawOutputFromAI.usage && rawOutputFromAI.usage.trim() !== '') ? rawOutputFromAI.usage.trim() : t_flow_fallback.infoNotAvailable;
          finalManufacturer = (rawOutputFromAI.manufacturer && rawOutputFromAI.manufacturer.trim() !== '') ? rawOutputFromAI.manufacturer.trim() : t_flow_fallback.infoNotAvailable;
          finalDosage = (rawOutputFromAI.dosage && rawOutputFromAI.dosage.trim() !== '') ? rawOutputFromAI.dosage.trim() : t_flow_fallback.infoNotAvailable;
          finalSideEffects = (rawOutputFromAI.sideEffects && rawOutputFromAI.sideEffects.trim() !== '') ? rawOutputFromAI.sideEffects.trim() : t_flow_fallback.infoNotAvailable;
          finalBarcode = rawOutputFromAI.barcode?.trim() || undefined;
        } else {
          console.warn(`[generateMedicineDetailsFlow] In AI-only path, AI returned source '${rawOutputFromAI.source}' or missing name/composition. Expected 'ai_generated' with non-empty name/composition. Raw AI output: ${JSON.stringify(rawOutputFromAI)}. Falling back to ai_failed.`);
          finalSource = 'ai_failed';
          finalName = input.searchTermOrName || t_flow_fallback.infoNotAvailable;
          // If AI gave a name despite other issues, try to use it.
          if (rawOutputFromAI.name && rawOutputFromAI.name.trim() !== '') finalName = rawOutputFromAI.name.trim();
          finalComposition = (rawOutputFromAI.composition && rawOutputFromAI.composition.trim() !== '') ? rawOutputFromAI.composition.trim() : t_flow_fallback.infoNotAvailable;
          
          finalUsage = t_flow_fallback.infoNotAvailable;
          finalManufacturer = t_flow_fallback.infoNotAvailable;
          finalDosage = t_flow_fallback.infoNotAvailable;
          finalSideEffects = t_flow_fallback.infoNotAvailable;
          finalBarcode = undefined;
        }
      }

      const validatedOutput: GenerateMedicineDetailsOutput = {
        name: finalName,
        composition: finalComposition,
        usage: finalUsage,
        manufacturer: finalManufacturer,
        dosage: finalDosage,
        sideEffects: finalSideEffects,
        barcode: finalBarcode,
        source: finalSource,
      };

      console.log("[generateMedicineDetailsFlow] Validated Output to be returned:", JSON.stringify(validatedOutput, null, 2));
      return validatedOutput;

    } catch (flowError: any) {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("!!!!!!!!!!!!!!!!! CRITICAL ERROR IN generateMedicineDetailsFlow CATCH BLOCK !!!!!!!!!!!!!!!!!!");
        console.error(`Input that caused error: ${JSON.stringify(input)}`);
        console.error(`Error Type: ${flowError.name || 'Unknown type'}`);
        console.error(`Error Message: ${flowError.message || 'No message available'}`);
        console.error(`Error Stack: ${flowError.stack || 'No stack trace available'}`);
        if (flowError.cause) console.error("Error Cause:", flowError.cause);
        console.error(`Full Error Object:`, flowError);
        console.error(`Raw AI Output (if available from before error): ${rawOutputFromAI === null ? "NULL_VALUE" : rawOutputFromAI === undefined ? "UNDEFINED_VALUE" : JSON.stringify(rawOutputFromAI, null, 2)}`);
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");


        let sourceForError: GenerateMedicineDetailsOutput['source'] = (input.contextName && input.contextComposition) ? 'database_only' : 'ai_failed';

        if (flowError.message) {
            if (flowError.message.includes('API key not valid') || flowError.message.includes('User location is not supported') || flowError.message.includes('API_KEY_INVALID') || flowError.message.includes('API key is invalid')) {
              console.error(`[generateMedicineDetailsFlow] Categorized Error: Probable API key or configuration issue: ${flowError.message}`);
              sourceForError = 'ai_unavailable';
            } else if (flowError.message.includes('model not found') || flowError.message.includes('Could not find model')) {
              console.error(`[generateMedicineDetailsFlow] Categorized Error: AI model not found or configured: ${flowError.message}`);
              sourceForError = 'ai_unavailable';
            } else if (flowError.message.includes('Billing account not found') || flowError.message.includes('billing issues')) {
                 console.error(`[generateMedicineDetailsFlow] Categorized Error: Billing issue: ${flowError.message}`);
                 sourceForError = 'ai_unavailable';
            } else if (flowError.message.toLowerCase().includes("failed to fetch")) {
                console.error(`[generateMedicineDetailsFlow] Categorized Error: Network issue or AI service unreachable: ${flowError.message}`);
                sourceForError = 'ai_failed'; // Or 'ai_unavailable' if it implies service is down
            } else if (flowError.name === 'ZodError') {
                console.error(`[generateMedicineDetailsFlow] Categorized Error: Zod validation error on AI output: ${flowError.message}. Details:`, flowError.errors);
                sourceForError = 'ai_failed';
            }
        }
        
        return {
            name: input.contextName || input.searchTermOrName || t_flow_fallback.infoNotAvailable,
            composition: input.contextComposition || t_flow_fallback.infoNotAvailable,
            usage: t_flow_fallback.infoNotAvailable,
            manufacturer: t_flow_fallback.infoNotAvailable,
            dosage: t_flow_fallback.infoNotAvailable,
            sideEffects: t_flow_fallback.infoNotAvailable,
            barcode: input.contextBarcode,
            source: sourceForError,
        };
    }
  }
);

    