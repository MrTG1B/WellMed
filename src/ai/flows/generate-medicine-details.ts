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
  console.log("🚀🚀🚀🚀🚀 ENTERING generateMedicineDetails WRAPPER 🚀🚀🚀🚀🚀");
  const languageToUse = input.language || 'en';
  const t_fallback = getTranslations(languageToUse);
  console.log("[generateMedicineDetails wrapper] Input received:", JSON.stringify(input, null, 2));

  if (!input || (typeof input.searchTermOrName !== 'string' || input.searchTermOrName.trim() === '') && (!input.contextName || !input.contextComposition)) {
    console.warn(`[generateMedicineDetails wrapper] DETECTED INVALID OR EMPTY INPUT. Input: ${JSON.stringify(input)}`);
    return {
      name: input?.contextName || input?.searchTermOrName || t_fallback.infoNotAvailable,
      composition: input?.contextComposition || t_fallback.infoNotAvailable,
      usage: t_fallback.infoNotAvailable,
      manufacturer: t_fallback.infoNotAvailable,
      dosage: t_fallback.infoNotAvailable,
      sideEffects: t_fallback.infoNotAvailable,
      barcode: input?.contextBarcode,
      source: 'ai_failed',
    };
  }

  const nameForFallback = input.contextName || input.searchTermOrName || t_fallback.infoNotAvailable;

  try {
    console.log("🚀🚀🚀🚀🚀 CALLING generateMedicineDetailsFlow FROM WRAPPER 🚀🚀🚀🚀🚀");
    const result = await generateMedicineDetailsFlow(input);
    console.log("🚀🚀🚀🚀🚀 RETURNED from generateMedicineDetailsFlow to WRAPPER. Result:", JSON.stringify(result, null, 2));

    if (result.source === 'ai_unavailable') {
        console.warn(`[generateMedicineDetails wrapper] Flow indicated AI is unavailable (model/key issue). Input: ${JSON.stringify(input)}`);
    }

    const validatedResult = {
        ...result,
        name: result.name || nameForFallback,
        composition: result.composition || input.contextComposition || t_fallback.infoNotAvailable,
    };
    console.log("🚀🚀🚀🚀🚀 EXITING generateMedicineDetails WRAPPER with validated result:", JSON.stringify(validatedResult, null, 2));
    return validatedResult;

  } catch (error: unknown) {
    let rawErrorMessage = "Unknown AI error during flow execution in wrapper.";
    let errorDetails = "";
    if (error instanceof Error) {
      rawErrorMessage = error.message;
      errorDetails = error.stack || String(error);
    } else if (typeof error === 'string') {
      rawErrorMessage = error;
      errorDetails = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      rawErrorMessage = String((error as any).message);
      errorDetails = JSON.stringify(error);
    }
    
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("!!!!!!!! CATCH IN generateMedicineDetails WRAPPER !!!!!!!");
    console.error(`Input: ${JSON.stringify(input)}`);
    console.error(`Message: ${rawErrorMessage}`);
    console.error(`Details: ${errorDetails}`);
    console.error(`Full Error Object:`, error);
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

    const source: GenerateMedicineDetailsOutput['source'] = (input.contextName && input.contextComposition) ? 'database_only' : 'ai_failed';
    const fallbackResult = {
      name: nameForFallback,
      composition: input.contextComposition || t_fallback.infoNotAvailable,
      usage: t_fallback.infoNotAvailable,
      manufacturer: t_fallback.infoNotAvailable,
      dosage: t_fallback.infoNotAvailable,
      sideEffects: t_fallback.infoNotAvailable,
      barcode: input.contextBarcode,
      source: source,
    };
    console.log("🚀🚀🚀🚀🚀 EXITING generateMedicineDetails WRAPPER with fallback due to CATCH:", JSON.stringify(fallbackResult, null, 2));
    return fallbackResult;
  }
}

const medicineDetailsPrompt = ai.definePrompt({
  name: 'generateMedicineDetailsPrompt',
  model: 'googleai/gemini-1.5-flash-latest', // Updated model
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
    console.log("🔷🔷🔷🔷🔷 ENTERING generateMedicineDetailsFlow (ai.defineFlow) 🔷🔷🔷🔷🔷");
    console.log("[generateMedicineDetailsFlow] Input to flow:", JSON.stringify(input, null, 2));

    if (!process.env.GEMINI_API_KEY) {
      console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      console.error("CRITICAL ERROR: GEMINI_API_KEY is NOT SET or accessible in generateMedicineDetailsFlow environment!");
      console.error("This flow WILL FAIL to contact Google AI services.");
      console.error("Please ensure GEMINI_API_KEY is correctly set in your .env file and the server is restarted.");
      console.error("Also, check that src/ai/genkit.ts is correctly initializing the googleAI plugin.");
      console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      const t_api_key_fallback = getTranslations(input.language || 'en');
      return {
        name: input.contextName || input.searchTermOrName || t_api_key_fallback.infoNotAvailable,
        composition: input.contextComposition || t_api_key_fallback.infoNotAvailable,
        usage: t_api_key_fallback.infoNotAvailable,
        manufacturer: t_api_key_fallback.infoNotAvailable,
        dosage: t_api_key_fallback.infoNotAvailable,
        sideEffects: t_api_key_fallback.infoNotAvailable,
        barcode: input.contextBarcode,
        source: 'ai_unavailable', 
      };
    } else {
      console.log("[generateMedicineDetailsFlow] GEMINI_API_KEY appears to be set in the environment.");
    }


    let rawOutputFromAI: GenerateMedicineDetailsOutput | null = null;
    const t_flow_fallback = getTranslations(input.language || 'en');

    try {
      console.log("******************************************************************");
      console.log("[generateMedicineDetailsFlow] Attempting AI prompt call with medicineDetailsPrompt.");
      console.log("[generateMedicineDetailsFlow] Input being sent to AI prompt object:", JSON.stringify(input, null, 2));
      console.log("******************************************************************");

      const {output} = await medicineDetailsPrompt(input);
      rawOutputFromAI = output;

      console.log("******************************************************************");
      console.log("[generateMedicineDetailsFlow] AI Prompt Call Completed (or at least didn't throw an immediate error to this catch block).");
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
        finalName = input.contextName;
        finalComposition = input.contextComposition;

        if (rawOutputFromAI.source === 'database_ai_enhanced') {
          finalSource = 'database_ai_enhanced';
          finalUsage = (rawOutputFromAI.usage && rawOutputFromAI.usage.trim() !== '') ? rawOutputFromAI.usage.trim() : t_flow_fallback.infoNotAvailable;
          finalManufacturer = (rawOutputFromAI.manufacturer && rawOutputFromAI.manufacturer.trim() !== '') ? rawOutputFromAI.manufacturer.trim() : t_flow_fallback.infoNotAvailable;
          finalDosage = (rawOutputFromAI.dosage && rawOutputFromAI.dosage.trim() !== '') ? rawOutputFromAI.dosage.trim() : t_flow_fallback.infoNotAvailable;
          finalSideEffects = (rawOutputFromAI.sideEffects && rawOutputFromAI.sideEffects.trim() !== '') ? rawOutputFromAI.sideEffects.trim() : t_flow_fallback.infoNotAvailable;
          finalBarcode = rawOutputFromAI.barcode?.trim() || input.contextBarcode || undefined;

          const anyDetailEnhanced =
            (finalUsage !== t_flow_fallback.infoNotAvailable) ||
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
      console.log("🔷🔷🔷🔷🔷 EXITING generateMedicineDetailsFlow (ai.defineFlow) - SUCCESS PATH 🔷🔷🔷🔷🔷");
      return validatedOutput;

    } catch (flowError: any) {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("!!!!!!!!!!!!!!!!! CRITICAL ERROR IN generateMedicineDetailsFlow CATCH BLOCK !!!!!!!!!!!!!!!!!!");
        console.error(`Input that caused error: ${JSON.stringify(input)}`);
        
        let errorToLog = flowError;
        if (flowError && flowError.cause instanceof Error) {
          console.error("Original Cause of Error:", flowError.cause.message, flowError.cause.stack);
          errorToLog = flowError.cause; 
        }

        console.error(`Error Type: ${errorToLog.name || 'Unknown type'}`);
        console.error(`Error Message: ${errorToLog.message || 'No message available'}`);
        console.error(`Error Stack: ${errorToLog.stack || 'No stack trace available'}`);

        if (errorToLog.response && errorToLog.response.data) console.error("Error Response Data (from original error):", errorToLog.response.data);
        
        console.error(`Full Error Object (potentially wrapped):`, JSON.stringify(flowError, Object.getOwnPropertyNames(flowError), 2));
        console.error(`Raw AI Output (if available from before error): ${rawOutputFromAI === null ? "NULL_VALUE" : rawOutputFromAI === undefined ? "UNDEFINED_VALUE" : JSON.stringify(rawOutputFromAI, null, 2)}`);
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");


        let sourceForError: GenerateMedicineDetailsOutput['source'] = (input.contextName && input.contextComposition) ? 'database_only' : 'ai_failed';

        if (errorToLog.message) {
            const lowerMessage = errorToLog.message.toLowerCase();
            if (lowerMessage.includes('api key not valid') || lowerMessage.includes('user location is not supported') || lowerMessage.includes('api_key_invalid') || lowerMessage.includes('api key is invalid') || lowerMessage.includes('permission') || lowerMessage.includes('denied')) {
              console.error(`[generateMedicineDetailsFlow] Categorized Error: Probable API key, permission, or configuration issue: ${errorToLog.message}`);
              sourceForError = 'ai_unavailable';
            } else if (lowerMessage.includes('model not found') || lowerMessage.includes('could not find model') || lowerMessage.includes('404 not found')) {
              console.error(`[generateMedicineDetailsFlow] Categorized Error: AI model not found or configured: ${errorToLog.message}`);
              sourceForError = 'ai_unavailable';
            } else if (lowerMessage.includes('billing account not found') || lowerMessage.includes('billing issues')) {
                 console.error(`[generateMedicineDetailsFlow] Categorized Error: Billing issue: ${errorToLog.message}`);
                 sourceForError = 'ai_unavailable';
            } else if (lowerMessage.includes("failed to fetch") || lowerMessage.includes("network error")) {
                console.error(`[generateMedicineDetailsFlow] Categorized Error: Network issue or AI service unreachable: ${errorToLog.message}`);
                sourceForError = 'ai_failed'; 
            } else if (errorToLog.name === 'ZodError') { 
                console.error(`[generateMedicineDetailsFlow] Categorized Error: Zod validation error on AI output: ${errorToLog.message}. Details:`, (errorToLog as any).errors);
                sourceForError = 'ai_failed';
            }
        }
        
        const errorFallbackResult = {
            name: input.contextName || input.searchTermOrName || t_flow_fallback.infoNotAvailable,
            composition: input.contextComposition || t_flow_fallback.infoNotAvailable,
            usage: t_flow_fallback.infoNotAvailable,
            manufacturer: t_flow_fallback.infoNotAvailable,
            dosage: t_flow_fallback.infoNotAvailable,
            sideEffects: t_flow_fallback.infoNotAvailable,
            barcode: input.contextBarcode,
            source: sourceForError,
        };
        console.log("🔷🔷🔷🔷🔷 EXITING generateMedicineDetailsFlow (ai.defineFlow) - CATCH PATH 🔷🔷🔷🔷🔷", JSON.stringify(errorFallbackResult, null, 2));
        return errorFallbackResult;
    }
  }
);

