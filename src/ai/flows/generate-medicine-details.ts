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

  if (!input || typeof input.searchTermOrName !== 'string' || input.searchTermOrName.trim() === '') {
    console.warn(`generateMedicineDetails (wrapper): Invalid or empty input. Input: ${JSON.stringify(input)}`);
    return {
      name: input?.contextName || input?.searchTermOrName || t_fallback.infoNotAvailable,
      composition: input?.contextComposition || t_fallback.infoNotAvailable,
      usage: t_fallback.infoNotAvailable,
      manufacturer: t_fallback.infoNotAvailable,
      dosage: t_fallback.infoNotAvailable,
      sideEffects: t_fallback.infoNotAvailable,
      barcode: input?.contextBarcode,
      source: 'ai_failed', // Or 'database_only' if context was present but overall input invalid.
    };
  }
  
  const nameForFallback = input.contextName || input.searchTermOrName;

  try {
    console.log(`generateMedicineDetails (wrapper): Calling flow with input:`, JSON.stringify(input, null, 2));
    const result = await generateMedicineDetailsFlow(input); // This now returns a more robust result
    console.log(`generateMedicineDetails (wrapper): Flow returned result:`, JSON.stringify(result, null, 2));
    
    if (result.source === 'ai_unavailable') {
        console.warn(`generateMedicineDetails (wrapper): Flow indicated AI is unavailable. Input: ${JSON.stringify(input)}`);
    }
    
    // The flow now handles fallbacks for individual fields if AI returns empty strings.
    // The wrapper's role is mainly to catch broader flow execution errors.
    // We still ensure essential fields have some value.
    const validatedResult = {
        ...result, // result already contains best-effort fields from the flow
        name: result.name || nameForFallback || t_fallback.infoNotAvailable,
        composition: result.composition || input.contextComposition || t_fallback.infoNotAvailable,
        // usage, manufacturer, dosage, sideEffects should come from flow, possibly as t_fallback.infoNotAvailable if AI failed for them
    };
    return validatedResult;

  } catch (error: unknown) {
    let rawErrorMessage = "Unknown AI error during flow execution in wrapper.";
    if (error instanceof Error) {
      rawErrorMessage = error.message;
    } else if (typeof error === 'string') {
      rawErrorMessage = error;
    }
    console.error(`Error in generateMedicineDetails wrapper for input ${JSON.stringify(input)}:`, rawErrorMessage, error);
    
    const source: GenerateMedicineDetailsOutput['source'] = (input.contextName && input.contextComposition) ? 'database_only' : 'ai_failed';
     return {
      name: nameForFallback || t_fallback.infoNotAvailable, 
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

{{#if contextName}}
The user has provided context for a medicine:
Identifier (Name/ID): "{{contextName}}"
{{#if contextComposition}}Composition: "{{contextComposition}}"{{/if}}
{{#if contextBarcode}}Barcode: "{{contextBarcode}}"{{/if}}

Based on this information, particularly the composition "{{contextComposition}}", please generate the following details for the medicine (identified as "{{contextName}}") in {{language}}:
- Typical usage or indications (based on "{{contextComposition}}").
- Common manufacturer(s) of medicines with "{{contextComposition}}" (if multiple, list prominent ones).
- General dosage guidelines (for a medicine with "{{contextComposition}}").
- Common side effects (associated with "{{contextComposition}}").

The output 'name' should be "{{contextName}}".
The output 'composition' should be "{{contextComposition}}".
{{#if contextBarcode}}The output 'barcode' should be "{{contextBarcode}}".{{else}}If a barcode for a medicine with composition "{{contextComposition}}" is commonly known or found, provide it; otherwise, omit or leave the 'barcode' field empty.{{/if}}
The output 'source' should be "database_ai_enhanced".

Example for contextName="Paracetamol 500mg", contextComposition="Paracetamol 500mg", language="en":
  name: "Paracetamol 500mg"
  composition: "Paracetamol 500mg"
  usage: "Used to treat pain and fever."
  manufacturer: "Various generic manufacturers, GSK"
  dosage: "1-2 tablets every 4-6 hours."
  sideEffects: "Rare, may include allergic reactions."
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
If you cannot confidently identify a specific medicine from "{{searchTermOrName}}", clearly state that you are providing general information based on the term or that no specific medicine could be identified. In such cases, try your best to populate the fields, using "Not specifically identified based on '{{searchTermOrName}}'" or similar for name/composition if needed.
The output 'source' should be "ai_generated".

Example for searchTermOrName="Amoxicillin", language="en":
  name: "Amoxicillin"
  composition: "Amoxicillin Trihydrate (e.g., 250mg or 500mg capsules)"
  usage: "Used to treat a wide variety of bacterial infections."
  manufacturer: "Various generic manufacturers, Sandoz, Teva"
  dosage: "Typically 250mg to 500mg three times a day."
  sideEffects: "Nausea, diarrhea, rash."
  source: "ai_generated"

Example for searchTermOrName="painkiller for headache", language="hi":
  name: "सामान्य दर्दनाशक (जैसे, पैरासिटामोल, आइबुप्रोफेन)"
  composition: "विभिन्न (जैसे, पैरासिटामोल, आइबुप्रोफेन)"
  usage: "सिरदर्द से राहत के लिए।"
  manufacturer: "विभिन्न"
  dosage: "उत्पाद-विशिष्ट निर्देशों का पालन करें।"
  sideEffects: "विशिष्ट दर्दनाशक के आधार पर भिन्न होता है।"
  source: "ai_generated"
{{/if}}

Ensure all textual output (name, composition, usage, manufacturer, dosage, sideEffects) is in {{language}}.
For any field (usage, manufacturer, dosage, sideEffects) where specific information is not found or cannot be reliably determined, you MUST return the phrase 'Information not available' (or its equivalent in the target {{language}}) for that specific field. DO NOT return an empty string or omit the field. If name or composition cannot be determined (especially in the 'ai_generated' path), use a similar clear statement.
The 'source' field must be one of: 'database_ai_enhanced', 'ai_generated'. Do not use 'database_only', 'ai_unavailable', or 'ai_failed' in the direct AI response; these are handled by the calling logic if AI fails or is unavailable.
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
      console.log("generateMedicineDetailsFlow: Calling AI prompt with input:", JSON.stringify(input, null, 2));
      const {output} = await medicineDetailsPrompt(input);
      rawOutputFromAI = output;
      // Log the raw output from AI immediately after receiving it
      console.log("generateMedicineDetailsFlow - Raw AI Output BEFORE validation:", JSON.stringify(rawOutputFromAI, null, 2));


      // Basic validation for critical structure from AI
      if (!rawOutputFromAI ||
          typeof rawOutputFromAI.name !== 'string' || // Name must be a string (even if it's a fallback like "Not identified")
          typeof rawOutputFromAI.composition !== 'string' || // Composition must be a string
          typeof rawOutputFromAI.source !== 'string' || 
          !['database_ai_enhanced', 'ai_generated'].includes(rawOutputFromAI.source)
      ) {
        console.warn(
          "generateMedicineDetailsFlow: AI returned invalid basic structure (name, composition, or source). Input:",
          JSON.stringify(input, null, 2),
          "Raw Output:",
          JSON.stringify(rawOutputFromAI, null, 2)
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

      // Construct validated output, applying field-level fallbacks if AI provided empty strings
      // for fields it was supposed to generate.
      const finalName = (input.contextName && input.contextName.trim() !== '') 
                        ? input.contextName 
                        : (rawOutputFromAI.name && rawOutputFromAI.name.trim() !== '' ? rawOutputFromAI.name : input.searchTermOrName || t_flow_fallback.infoNotAvailable);
      
      const finalComposition = (input.contextComposition && input.contextComposition.trim() !== '')
                               ? input.contextComposition
                               : (rawOutputFromAI.composition && rawOutputFromAI.composition.trim() !== '' ? rawOutputFromAI.composition : t_flow_fallback.infoNotAvailable);

      const finalUsage = (typeof rawOutputFromAI.usage === 'string' && rawOutputFromAI.usage.trim() !== '') 
                         ? rawOutputFromAI.usage 
                         : t_flow_fallback.infoNotAvailable;
      const finalManufacturer = (typeof rawOutputFromAI.manufacturer === 'string' && rawOutputFromAI.manufacturer.trim() !== '') 
                                ? rawOutputFromAI.manufacturer 
                                : t_flow_fallback.infoNotAvailable;
      const finalDosage = (typeof rawOutputFromAI.dosage === 'string' && rawOutputFromAI.dosage.trim() !== '') 
                          ? rawOutputFromAI.dosage 
                          : t_flow_fallback.infoNotAvailable;
      const finalSideEffects = (typeof rawOutputFromAI.sideEffects === 'string' && rawOutputFromAI.sideEffects.trim() !== '') 
                               ? rawOutputFromAI.sideEffects 
                               : t_flow_fallback.infoNotAvailable;
      
      const validatedOutput: GenerateMedicineDetailsOutput = {
        name: finalName,
        composition: finalComposition,
        usage: finalUsage,
        manufacturer: finalManufacturer,
        dosage: finalDosage,
        sideEffects: finalSideEffects,
        barcode: rawOutputFromAI.barcode || input.contextBarcode, // Prefer AI barcode, then context
        source: rawOutputFromAI.source as GenerateMedicineDetailsOutput['source'], 
      };
      
      console.log("generateMedicineDetailsFlow - Validated Output to be returned:", JSON.stringify(validatedOutput, null, 2));
      return validatedOutput;

    } catch (flowError: unknown) {
        let errorMessage = "AI model failed to generate valid details or an unexpected error occurred in the flow.";
        let errorStack: string | undefined;
        let sourceForError: GenerateMedicineDetailsOutput['source'] = (input.contextName && input.contextComposition) ? 'database_only' : 'ai_failed';


        if (flowError instanceof Error) {
            errorMessage = flowError.message;
            errorStack = flowError.stack;

            if (errorMessage.includes('API key not valid') || errorMessage.includes('User location is not supported') || errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('API key is invalid')) {
              console.error(`generateMedicineDetailsFlow: Probable API key or configuration issue: ${errorMessage}`, flowError);
              sourceForError = 'ai_unavailable';
            } else if (errorMessage.includes('model not found') || errorMessage.includes('Could not find model')) {
              console.error(`generateMedicineDetailsFlow: AI model not found or configured: ${errorMessage}`, flowError);
              sourceForError = 'ai_unavailable';
            } else if (errorMessage.includes('Billing account not found') || errorMessage.includes('billing issues')) {
                 console.error(`generateMedicineDetailsFlow: Billing issue: ${errorMessage}`);
                 sourceForError = 'ai_unavailable';
            } else if (errorMessage.toLowerCase().includes("failed to fetch")) {
                console.error(`generateMedicineDetailsFlow: Network issue or AI service unreachable: ${errorMessage}`, flowError);
                sourceForError = 'ai_failed'; // Could be temporary, treat as general AI failure
            }
        } else if (typeof flowError === 'string') {
            errorMessage = flowError;
        } else if (flowError && typeof flowError === 'object' && 'message' in flowError) {
            errorMessage = String((flowError as any).message);
        }

        console.error(`generateMedicineDetailsFlow: Error for input ${JSON.stringify(input)} - Message: ${errorMessage}${errorStack ? `\nStack: ${errorStack}` : ''}\nRaw AI Output (if available): ${JSON.stringify(rawOutputFromAI, null, 2)}\nOriginal Error Object:`, flowError);
        
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
