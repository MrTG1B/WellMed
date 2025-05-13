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
import {z} from 'genkit';

const GenerateMedicineDetailsInputSchema = z.object({
  searchTermOrName: z.string().describe('The initial search term, or the medicine name if found in the database.'),
  language: z.enum(['en', 'hi', 'bn']).describe('The language for the generated details.'),
  contextName: z.string().optional().describe('The medicine name, if already known from the database.'),
  contextComposition: z.string().optional().describe('The medicine composition, if already known from the database.'),
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
  const genericAiFailureMessage = "AI generation failed. Details unavailable.";
  const genericConfigIssueMessage = "AI not configured. Details unavailable.";
  
  const name = input.contextName || input.searchTermOrName;
  let source: GenerateMedicineDetailsOutput['source'];

  if (ai.plugins.length === 0) {
    console.warn("generateMedicineDetails: AI plugin not available. Returning placeholder data.");
    source = input.contextName ? 'database_only' : 'ai_unavailable';
    return {
      name: name,
      composition: input.contextComposition || genericConfigIssueMessage,
      usage: genericConfigIssueMessage,
      manufacturer: genericConfigIssueMessage,
      dosage: genericConfigIssueMessage,
      sideEffects: genericConfigIssueMessage,
      barcode: input.contextBarcode,
      source: source,
    };
  }

  try {
    const result = await generateMedicineDetailsFlow(input);
    return result;
  } catch (error: unknown) {
    let message = genericAiFailureMessage;
    if (error instanceof Error) {
      message = error.message; 
    } else if (typeof error === 'string') {
      message = error;
    }
    console.error(`Error in generateMedicineDetails wrapper for input ${JSON.stringify(input)}:`, message, error); // Log original error
    
    source = input.contextName ? 'database_only' : 'ai_failed';
     return {
      name: name,
      composition: input.contextComposition || `Error: ${message}`,
      usage: `Error: ${message}`,
      manufacturer: `Error: ${message}`,
      dosage: `Error: ${message}`,
      sideEffects: `Error: ${message}`,
      barcode: input.contextBarcode,
      source: source, 
    };
  }
}

const prompt = ai.definePrompt({
  name: 'generateMedicineDetailsPrompt',
  input: {schema: GenerateMedicineDetailsInputSchema},
  output: {schema: GenerateMedicineDetailsOutputSchema},
  prompt: `You are a highly knowledgeable pharmaceutical AI assistant. Your goal is to provide comprehensive and accurate medicine details in the specified language: {{language}}.

{{#if contextName}}
The user has provided context for a medicine:
Name: "{{contextName}}"
{{#if contextComposition}}Composition: "{{contextComposition}}"{{/if}}
{{#if contextBarcode}}Barcode: "{{contextBarcode}}"{{/if}}

Based on this information, please generate the following details for "{{contextName}}" in {{language}}:
- Typical usage or indications.
- Common manufacturer(s) (if multiple, list prominent ones).
- General dosage guidelines.
- Common side effects.

The output 'name' should be "{{contextName}}".
The output 'composition' should be "{{contextComposition}}".
{{#if contextBarcode}}The output 'barcode' should be "{{contextBarcode}}".{{/if}}
The output 'source' should be "database_ai_enhanced".

Example for contextName="Paracetamol 500mg", contextComposition="Paracetamol 500mg":
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
- Common name.
- Typical composition/active ingredients.
- Typical usage or indications.
- Common manufacturer(s) (if multiple, list prominent ones).
- General dosage guidelines.
- Common side effects.
- Barcode (if identifiable and applicable, otherwise omit or leave empty).

If "{{searchTermOrName}}" is a barcode, try to identify the medicine and its details.
If "{{searchTermOrName}}" seems to be a composition, describe a common medicine with that composition.
If you cannot confidently identify a specific medicine from "{{searchTermOrName}}", clearly state that you are providing general information based on the term or that no specific medicine could be identified. In such cases, try your best to populate the fields, using "Not specifically identified" or similar for name/composition if needed.
The output 'source' should be "ai_generated".

Example for searchTermOrName="Amoxicillin":
  name: "Amoxicillin"
  composition: "Amoxicillin Trihydrate (e.g., 250mg or 500mg capsules)"
  usage: "Used to treat a wide variety of bacterial infections."
  manufacturer: "Various generic manufacturers, Sandoz, Teva"
  dosage: "Typically 250mg to 500mg three times a day."
  sideEffects: "Nausea, diarrhea, rash."
  source: "ai_generated"

Example for searchTermOrName="painkiller for headache":
  name: "Common Painkillers (e.g., Paracetamol, Ibuprofen)"
  composition: "Varies (e.g., Paracetamol, Ibuprofen)"
  usage: "To relieve headache pain."
  manufacturer: "Various"
  dosage: "Follow product-specific instructions."
  sideEffects: "Varies by specific painkiller."
  source: "ai_generated"
{{/if}}

Ensure all textual output (name, composition, usage, manufacturer, dosage, sideEffects) is in {{language}}.
If any information is not found or cannot be reliably determined, explicitly state 'Information not available' or a similar phrase in the target language for that specific field rather than omitting it.
The 'source' field must be one of: 'database_ai_enhanced', 'ai_generated'. Do not use 'database_only', 'ai_unavailable', or 'ai_failed' in the direct AI response; these are handled by the calling logic if AI fails or is unavailable.
`,
});

const generateMedicineDetailsFlow = ai.defineFlow(
  {
    name: 'generateMedicineDetailsFlow',
    inputSchema: GenerateMedicineDetailsInputSchema,
    outputSchema: GenerateMedicineDetailsOutputSchema,
  },
  async (input: GenerateMedicineDetailsInput) => {
    let rawOutputFromAI: any = null;
    try {
      const {output} = await prompt(input);
      rawOutputFromAI = output;
      
      console.log("generateMedicineDetailsFlow: Raw AI Output:", JSON.stringify(rawOutputFromAI, null, 2));
      
      if (!rawOutputFromAI || 
          typeof rawOutputFromAI.name !== 'string' || rawOutputFromAI.name.trim() === '' ||
          typeof rawOutputFromAI.composition !== 'string' || rawOutputFromAI.composition.trim() === '' ||
          typeof rawOutputFromAI.usage !== 'string' || rawOutputFromAI.usage.trim() === '' ||
          typeof rawOutputFromAI.manufacturer !== 'string' || rawOutputFromAI.manufacturer.trim() === '' ||
          typeof rawOutputFromAI.dosage !== 'string' || rawOutputFromAI.dosage.trim() === '' ||
          typeof rawOutputFromAI.sideEffects !== 'string' || rawOutputFromAI.sideEffects.trim() === '' ||
          typeof rawOutputFromAI.source !== 'string' || !['database_ai_enhanced', 'ai_generated'].includes(rawOutputFromAI.source)
      ) {
        console.error(
          "generateMedicineDetailsFlow: AI returned incomplete, invalid, or empty-stringed data for required fields. Input:", 
          JSON.stringify(input, null, 2), 
          "Raw Output:", 
          JSON.stringify(rawOutputFromAI, null, 2)
        );
        if (rawOutputFromAI === null) {
             throw new Error("AI prompt output failed Zod schema validation or AI returned null. Raw output was null.");
        }
        throw new Error("AI returned incomplete, invalid, or empty-stringed data for required fields. Check logs for raw AI output.");
      }
      
      const validatedOutput: GenerateMedicineDetailsOutput = {
        name: rawOutputFromAI.name,
        composition: rawOutputFromAI.composition,
        usage: rawOutputFromAI.usage,
        manufacturer: rawOutputFromAI.manufacturer,
        dosage: rawOutputFromAI.dosage,
        sideEffects: rawOutputFromAI.sideEffects,
        barcode: rawOutputFromAI.barcode || input.contextBarcode, 
        source: rawOutputFromAI.source as GenerateMedicineDetailsOutput['source'],
      };
      
      if (input.contextBarcode && !validatedOutput.barcode) {
          validatedOutput.barcode = input.contextBarcode;
      }

      return validatedOutput;

    } catch (flowError: unknown) {
        let errorMessage = "AI model failed to generate valid details or an unexpected error occurred in the flow.";
        let errorStack: string | undefined;

        if (flowError instanceof Error) {
            errorMessage = flowError.message;
            errorStack = flowError.stack;
        } else if (typeof flowError === 'string') {
            errorMessage = flowError;
        } else if (flowError && typeof flowError === 'object' && 'message' in flowError) {
            errorMessage = String((flowError as any).message);
        }
        
        console.error(`generateMedicineDetailsFlow: Error for input ${JSON.stringify(input)} - Message: ${errorMessage}${errorStack ? `\nStack: ${errorStack}` : ''}\nRaw AI Output (if available): ${JSON.stringify(rawOutputFromAI, null, 2)}\nOriginal Error Object:`, flowError);
        throw new Error(`AI Generation Error: ${errorMessage}`);
    }
  }
);
