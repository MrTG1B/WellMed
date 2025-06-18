
'use server';
/**
 * @fileOverview Generates detailed medicine information using AI.
 * It can generate usage, manufacturer, dosage, and side effects,
 * supplementing existing database information (drugName, saltName, etc.).
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
  searchTermOrName: z.string().describe('The initial search term, or the drug name if found in the database.'),
  language: z.enum(['en', 'hi', 'bn']).describe('The language for the generated details.'),
  contextDrugCode: z.string().optional().describe('The drug code (Firebase key), if known from the database.'),
  contextDrugName: z.string().optional().describe('The drug name, if already known from the database.'),
  contextSaltName: z.string().optional().describe('The salt name (composition), if already known from the database. This is key for generating details.'),
  contextDrugCategory: z.string().optional().describe('The drug category, if known from the database.'),
  contextDrugGroup: z.string().optional().describe('The drug group, if known from the database.'),
  contextDrugType: z.string().optional().describe('The drug type, if known from the database.'),
  contextHsnCode: z.string().optional().describe('The HSN code, if known from the database.'),
  contextSearchKey: z.string().optional().describe('The search key, if known from the database.'),
});
export type GenerateMedicineDetailsInput = z.infer<typeof GenerateMedicineDetailsInputSchema>;

const GenerateMedicineDetailsOutputSchema = z.object({
  drugCode: z.string().describe('The drug code (Firebase key).'),
  drugName: z.string().describe('The common name of the medicine.'),
  saltName: z.string().describe('The salt name/active ingredients of the medicine.'),
  drugCategory: z.string().optional().describe('The drug category (from database if available).'),
  drugGroup: z.string().optional().describe('The drug group (from database if available).'),
  drugType: z.string().optional().describe('The drug type (from database if available).'),
  hsnCode: z.string().optional().describe('The HSN code (from database if available).'),
  searchKey: z.string().optional().describe('The search key (from database if available).'),
  usage: z.string().describe("Typical usage or indications for the medicine. Each point MUST start with '• ' (a bullet character followed by a space) and be on its own new line. For example:\n• For pain relief\n• Reduces fever"),
  manufacturer: z.string().describe("List a few common manufacturers of the medicine, specifically in India. Each point MUST start with '• ' and be on its own new line. For example:\n• Cipla\n• Sun Pharma"),
  dosage: z.string().describe("General dosage guidelines for the medicine. Each distinct guideline MUST be a separate bullet point on a new line, starting with '• '. For example:\n• Adults: 1 tablet\n• Children: Half tablet"),
  sideEffects: z.string().describe("Common side effects associated with the medicine. Each point MUST start with '• ' (a bullet character followed by a space) and be on its own new line. For example:\n• Nausea\n• Headache"),
  source: z.enum(['database_ai_enhanced', 'ai_generated', 'database_only', 'ai_unavailable', 'ai_failed']).describe('Indicates if the primary details were from a database and enhanced by AI, or if all details were AI-generated, or if only database details are available due to AI failure/unavailability.'),
});
export type GenerateMedicineDetailsOutput = z.infer<typeof GenerateMedicineDetailsOutputSchema>;


export async function generateMedicineDetails(input: GenerateMedicineDetailsInput): Promise<GenerateMedicineDetailsOutput> {
  const languageToUse = input.language || 'en';
  const t_fallback = getTranslations(languageToUse);
  const defaultDrugCode = input.contextDrugCode || `ai-gen-${Date.now()}`;

  if (!input || (typeof input.searchTermOrName !== 'string' || input.searchTermOrName.trim() === '') && (!input.contextDrugName || !input.contextSaltName)) {
    console.warn(`[generateMedicineDetails wrapper] DETECTED INVALID OR EMPTY INPUT. Input: ${JSON.stringify(input)}`);
    return {
      drugCode: defaultDrugCode,
      drugName: input?.contextDrugName || input?.searchTermOrName || t_fallback.infoNotAvailable,
      saltName: input?.contextSaltName || t_fallback.infoNotAvailable,
      drugCategory: input?.contextDrugCategory,
      drugGroup: input?.contextDrugGroup,
      drugType: input?.contextDrugType,
      hsnCode: input?.contextHsnCode,
      searchKey: input?.contextSearchKey,
      usage: t_fallback.infoNotAvailable,
      manufacturer: t_fallback.infoNotAvailable,
      dosage: t_fallback.infoNotAvailable,
      sideEffects: t_fallback.infoNotAvailable,
      source: 'ai_failed',
    };
  }

  const nameForFallback = input.contextDrugName || input.searchTermOrName || t_fallback.infoNotAvailable;
  const saltNameForFallback = input.contextSaltName || t_fallback.infoNotAvailable;


  try {
    const result = await generateMedicineDetailsFlow(input);

    if (result.source === 'ai_unavailable') {
        console.warn(`[generateMedicineDetails wrapper] Flow indicated AI is unavailable (model/key issue). Input: ${JSON.stringify(input)}`);
    }
    
    const validatedResult: GenerateMedicineDetailsOutput = {
        drugCode: result.drugCode || defaultDrugCode,
        drugName: result.drugName || nameForFallback,
        saltName: result.saltName || saltNameForFallback,
        drugCategory: result.drugCategory || input.contextDrugCategory,
        drugGroup: result.drugGroup || input.contextDrugGroup,
        drugType: result.drugType || input.contextDrugType,
        hsnCode: result.hsnCode || input.contextHsnCode,
        searchKey: result.searchKey || input.contextSearchKey,
        usage: result.usage || t_fallback.infoNotAvailable,
        manufacturer: result.manufacturer || t_fallback.infoNotAvailable,
        dosage: result.dosage || t_fallback.infoNotAvailable,
        sideEffects: result.sideEffects || t_fallback.infoNotAvailable,
        source: result.source,
    };
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
    console.error(`Critical error in generateMedicineDetails wrapper. Input: ${JSON.stringify(input)} Message: ${rawErrorMessage} Details: ${errorDetails}`, error);

    const source: GenerateMedicineDetailsOutput['source'] = (input.contextDrugName && input.contextSaltName) ? 'database_only' : 'ai_failed';
    const fallbackResult: GenerateMedicineDetailsOutput = {
      drugCode: defaultDrugCode,
      drugName: nameForFallback,
      saltName: saltNameForFallback,
      drugCategory: input.contextDrugCategory,
      drugGroup: input.contextDrugGroup,
      drugType: input.contextDrugType,
      hsnCode: input.contextHsnCode,
      searchKey: input.contextSearchKey,
      usage: t_fallback.infoNotAvailable,
      manufacturer: t_fallback.infoNotAvailable,
      dosage: t_fallback.infoNotAvailable,
      sideEffects: t_fallback.infoNotAvailable,
      source: source,
    };
    return fallbackResult;
  }
}

const medicineDetailsPrompt = ai.definePrompt({
  name: 'generateMedicineDetailsPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: GenerateMedicineDetailsInputSchema},
  output: {schema: GenerateMedicineDetailsOutputSchema},
  prompt: `You are a highly knowledgeable pharmaceutical AI assistant. Your goal is to provide AI-generated medicine details (usage, manufacturer, dosage, sideEffects) in the specified language: {{language}}.
Format all lists (usage, manufacturer, dosage, sideEffects) with each item on a NEW LINE, starting with '• ' (a bullet character followed by a space).
The fields drugCode, drugName, saltName, drugCategory, drugGroup, drugType, hsnCode, and searchKey MUST be taken directly from the provided context if available. DO NOT generate or alter these fields if context for them is provided.

{{#if contextDrugName}}
The user has provided context for a medicine from the database:
Drug Code: "{{contextDrugCode}}"
Drug Name: "{{contextDrugName}}"
Salt Name (Composition): "{{contextSaltName}}"
{{#if contextDrugCategory}}Category: "{{contextDrugCategory}}"{{/if}}
{{#if contextDrugGroup}}Group: "{{contextDrugGroup}}"{{/if}}
{{#if contextDrugType}}Type: "{{contextDrugType}}"{{/if}}
{{#if contextHsnCode}}HSN Code: "{{contextHsnCode}}"{{/if}}
{{#if contextSearchKey}}Search Key: "{{contextSearchKey}}"{{/if}}

Your primary task is to use the provided 'Salt Name (Composition): "{{contextSaltName}}"' to generate the following details for the medicine (identified as "{{contextDrugName}}") in {{language}}:
- usage: Provide typical usage/indications.
- manufacturer: List a few common INDIAN manufacturers.
- dosage: Provide general dosage guidelines.
- sideEffects: List common side effects.

The output 'source' field MUST be "database_ai_enhanced".
The output 'drugCode' MUST be "{{contextDrugCode}}".
The output 'drugName' MUST be "{{contextDrugName}}".
The output 'saltName' MUST be "{{contextSaltName}}".
{{#if contextDrugCategory}}The output 'drugCategory' MUST be "{{contextDrugCategory}}".{{else}}The output 'drugCategory' field should be empty or omitted.{{/if}}
{{#if contextDrugGroup}}The output 'drugGroup' MUST be "{{contextDrugGroup}}".{{else}}The output 'drugGroup' field should be empty or omitted.{{/if}}
{{#if contextDrugType}}The output 'drugType' MUST be "{{contextDrugType}}".{{else}}The output 'drugType' field should be empty or omitted.{{/if}}
{{#if contextHsnCode}}The output 'hsnCode' MUST be "{{contextHsnCode}}".{{else}}The output 'hsnCode' field should be empty or omitted.{{/if}}
{{#if contextSearchKey}}The output 'searchKey' MUST be "{{contextSearchKey}}".{{else}}The output 'searchKey' field should be empty or omitted.{{/if}}

If you cannot find specific information for any of the AI-generated fields (usage, manufacturer, dosage, sideEffects), PROVIDE AN EMPTY STRING for that field. Do NOT use phrases like 'Information not available' or 'Not found' yourself in these fields.

Example for contextDrugName="Paracetamol 500mg", contextSaltName="Paracetamol 500mg", language="en", contextDrugCode="item001":
  drugCode: "item001"
  drugName: "Paracetamol 500mg"
  saltName: "Paracetamol 500mg"
  drugCategory: "Analgesic" (example, taken from context if provided)
  usage: "• For relief from fever\n• To reduce mild to moderate pain"
  manufacturer: "• GSK India\n• Cipla Ltd."
  dosage: "• Adults: 1 to 2 tablets every 4-6 hours\n• Max: 8 tablets in 24 hours"
  sideEffects: "• Nausea (rare)\n• Allergic reactions (very rare)"
  source: "database_ai_enhanced"

{{else}}
The user is searching for information related to: "{{searchTermOrName}}".
This term could be a medicine name, a partial name, or a salt name.

First, try to identify the most likely specific 'drugName' and 'saltName' based on "{{searchTermOrName}}".
Then, provide the following AI-generated details for that identified medicine in {{language}}:
- usage
- manufacturer
- dosage
- sideEffects

The output 'drugCode' should be a new unique identifier (e.g., starting with 'ai-gen-').
The output 'drugName' field should be the identified drug name.
The output 'saltName' field should be the identified salt name/composition.
The fields 'drugCategory', 'drugGroup', 'drugType', 'hsnCode', 'searchKey' MUST be empty or omitted as these are database-specific.
The output 'source' field MUST be "ai_generated".
PROVIDE AN EMPTY STRING for any AI-generated detail field if information cannot be found. Do NOT use phrases like 'Information not available'.

Example for searchTermOrName="Amoxicillin", language="en":
  drugCode: "ai-gen-{{timestamp}}" // Or similar unique ID
  drugName: "Amoxicillin"
  saltName: "Amoxicillin Trihydrate (e.g., 250mg or 500mg capsules)"
  usage: "• Treats bacterial infections\n• Used for ear, nose, throat infections"
  manufacturer: "• Cipla Ltd.\n• Mankind Pharma"
  dosage: "• Adults: 250mg to 500mg every 8 hours"
  sideEffects: "• Diarrhea\n• Nausea"
  source: "ai_generated"
  // drugCategory, drugGroup, drugType, hsnCode, searchKey must be empty or omitted.
{{/if}}

Ensure all textual output for AI-generated fields (usage, manufacturer, dosage, sideEffects) is in {{language}}.
The 'source' field must be one of: 'database_ai_enhanced', 'ai_generated', as specified above.
`,
});

const generateMedicineDetailsFlow = ai.defineFlow(
  {
    name: 'generateMedicineDetailsFlow',
    inputSchema: GenerateMedicineDetailsInputSchema,
    outputSchema: GenerateMedicineDetailsOutputSchema,
  },
  async (input: GenerateMedicineDetailsInput): Promise<GenerateMedicineDetailsOutput> => {
    const t_flow_fallback = getTranslations(input.language || 'en');
    const defaultDrugCode = input.contextDrugCode || `ai-gen-${Date.now()}`;

    if (!process.env.GEMINI_API_KEY) {
      console.error("CRITICAL ERROR: GEMINI_API_KEY is NOT SET in generateMedicineDetailsFlow environment!");
      return {
        drugCode: defaultDrugCode,
        drugName: input.contextDrugName || input.searchTermOrName || t_flow_fallback.infoNotAvailable,
        saltName: input.contextSaltName || t_flow_fallback.infoNotAvailable,
        drugCategory: input.contextDrugCategory,
        drugGroup: input.contextDrugGroup,
        drugType: input.contextDrugType,
        hsnCode: input.contextHsnCode,
        searchKey: input.contextSearchKey,
        usage: t_flow_fallback.infoNotAvailable,
        manufacturer: t_flow_fallback.infoNotAvailable,
        dosage: t_flow_fallback.infoNotAvailable,
        sideEffects: t_flow_fallback.infoNotAvailable,
        source: 'ai_unavailable',
      };
    }

    let rawOutputFromAI: GenerateMedicineDetailsOutput | null = null;

    try {
      const {output} = await medicineDetailsPrompt(input);
      rawOutputFromAI = output;

      if (!rawOutputFromAI || typeof rawOutputFromAI.drugName !== 'string' || typeof rawOutputFromAI.saltName !== 'string') {
        console.warn(`[generateMedicineDetailsFlow] AI returned invalid basic structure. Input: ${JSON.stringify(input)}, Raw Output: ${JSON.stringify(rawOutputFromAI)}`);
        const sourceForFailure: GenerateMedicineDetailsOutput['source'] = input.contextDrugName ? 'database_only' : 'ai_failed';
        return {
            drugCode: defaultDrugCode,
            drugName: input.contextDrugName || input.searchTermOrName || t_flow_fallback.infoNotAvailable,
            saltName: input.contextSaltName || t_flow_fallback.infoNotAvailable,
            drugCategory: input.contextDrugCategory,
            drugGroup: input.contextDrugGroup,
            drugType: input.contextDrugType,
            hsnCode: input.contextHsnCode,
            searchKey: input.contextSearchKey,
            usage: t_flow_fallback.infoNotAvailable,
            manufacturer: t_flow_fallback.infoNotAvailable,
            dosage: t_flow_fallback.infoNotAvailable,
            sideEffects: t_flow_fallback.infoNotAvailable,
            source: sourceForFailure,
        };
      }
      
      let finalSource: GenerateMedicineDetailsOutput['source'];
      if (input.contextDrugName && input.contextSaltName) { // Database context path
        finalSource = (rawOutputFromAI.source === 'database_ai_enhanced' && 
                       (rawOutputFromAI.usage?.trim() !== '' || rawOutputFromAI.manufacturer?.trim() !== '' || rawOutputFromAI.dosage?.trim() !== '' || rawOutputFromAI.sideEffects?.trim() !== ''))
                      ? 'database_ai_enhanced' 
                      : 'database_only';
      } else { // AI-only path
        finalSource = (rawOutputFromAI.source === 'ai_generated' && rawOutputFromAI.drugName.trim() !== '' && rawOutputFromAI.saltName.trim() !== '')
                      ? 'ai_generated'
                      : 'ai_failed';
      }
      
      // Ensure context fields are prioritized if they exist, even if AI tries to override them (which it shouldn't per prompt)
      const validatedOutput: GenerateMedicineDetailsOutput = {
        drugCode: rawOutputFromAI.drugCode || defaultDrugCode,
        drugName: input.contextDrugName || rawOutputFromAI.drugName || t_flow_fallback.infoNotAvailable,
        saltName: input.contextSaltName || rawOutputFromAI.saltName || t_flow_fallback.infoNotAvailable,
        drugCategory: input.contextDrugCategory || rawOutputFromAI.drugCategory,
        drugGroup: input.contextDrugGroup || rawOutputFromAI.drugGroup,
        drugType: input.contextDrugType || rawOutputFromAI.drugType,
        hsnCode: input.contextHsnCode || rawOutputFromAI.hsnCode,
        searchKey: input.contextSearchKey || rawOutputFromAI.searchKey,
        usage: rawOutputFromAI.usage?.trim() || t_flow_fallback.infoNotAvailable,
        manufacturer: rawOutputFromAI.manufacturer?.trim() || t_flow_fallback.infoNotAvailable,
        dosage: rawOutputFromAI.dosage?.trim() || t_flow_fallback.infoNotAvailable,
        sideEffects: rawOutputFromAI.sideEffects?.trim() || t_flow_fallback.infoNotAvailable,
        source: finalSource,
      };
      
      // If it was supposed to be AI generated but essential AI fields are missing, mark as failed.
      if (finalSource === 'ai_generated' && (validatedOutput.usage === t_flow_fallback.infoNotAvailable && validatedOutput.manufacturer === t_flow_fallback.infoNotAvailable)) {
          console.warn(`[generateMedicineDetailsFlow] AI generated path but key AI fields are missing. Output: ${JSON.stringify(validatedOutput)}`);
          validatedOutput.source = 'ai_failed';
      }


      return validatedOutput;

    } catch (flowError: any) {
        console.error(`[generateMedicineDetailsFlow] Error for input ${JSON.stringify(input)} - Message: ${flowError.message}`, flowError);
        let sourceForError: GenerateMedicineDetailsOutput['source'] = (input.contextDrugName && input.contextSaltName) ? 'database_only' : 'ai_failed';
        if (flowError.message?.toLowerCase().includes('api key') || flowError.message?.toLowerCase().includes('model not found')) {
            sourceForError = 'ai_unavailable';
        }
        return {
            drugCode: defaultDrugCode,
            drugName: input.contextDrugName || input.searchTermOrName || t_flow_fallback.infoNotAvailable,
            saltName: input.contextSaltName || t_flow_fallback.infoNotAvailable,
            drugCategory: input.contextDrugCategory,
            drugGroup: input.contextDrugGroup,
            drugType: input.contextDrugType,
            hsnCode: input.contextHsnCode,
            searchKey: input.contextSearchKey,
            usage: t_flow_fallback.infoNotAvailable,
            manufacturer: t_flow_fallback.infoNotAvailable,
            dosage: t_flow_fallback.infoNotAvailable,
            sideEffects: t_flow_fallback.infoNotAvailable,
            source: sourceForError,
        };
    }
  }
);

