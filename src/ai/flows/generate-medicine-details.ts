
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
  source: z.enum(['database_ai_enhanced', 'ai_generated', 'database_only']).describe('Indicates if the primary details were from a database and enhanced by AI, or if all details were AI-generated.'),
});
export type GenerateMedicineDetailsOutput = z.infer<typeof GenerateMedicineDetailsOutputSchema>;


export async function generateMedicineDetails(input: GenerateMedicineDetailsInput): Promise<GenerateMedicineDetailsOutput> {
  if (ai.plugins.length === 0 && !ai.registry.models['googleai/gemini-2.0-flash']) {
    console.warn("generateMedicineDetails: AI plugin not available. Returning placeholder data.");
    // Fallback behavior: return minimal data if AI is not configured
    const name = input.contextName || input.searchTermOrName;
    const composition = input.contextComposition || "Not available due to AI configuration issue.";
    return {
      name: name,
      composition: composition,
      usage: "Not available due to AI configuration issue.",
      manufacturer: "Not available due to AI configuration issue.",
      dosage: "Not available due to AI configuration issue.",
      sideEffects: "Not available due to AI configuration issue.",
      barcode: input.contextBarcode,
      source: input.contextName ? 'database_only' : 'ai_generated', // Simplified source
    };
  }
  return generateMedicineDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMedicineDetailsPrompt',
  input: {schema: GenerateMedicineDetailsInputSchema},
  output: {schema: GenerateMedicineDetailsOutputSchema},
  prompt: `You are a highly knowledgeable pharmaceutical AI assistant. Your goal is to provide comprehensive and accurate medicine details in the specified language: {{language}}.

{{#if contextName}}
The user has provided context for a medicine:
Name: "{{contextName}}"
Composition: "{{contextComposition}}"
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
`,
});

const generateMedicineDetailsFlow = ai.defineFlow(
  {
    name: 'generateMedicineDetailsFlow',
    inputSchema: GenerateMedicineDetailsInputSchema,
    outputSchema: GenerateMedicineDetailsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("AI failed to generate medicine details.");
    }
    // Ensure source is correctly set based on context presence
    output.source = input.contextName ? 'database_ai_enhanced' : 'ai_generated';
    if (input.contextBarcode && !output.barcode) {
        output.barcode = input.contextBarcode;
    }
    return output;
  }
);
