'use server';

/**
 * @fileOverview Enhances medicine search functionality by extracting the intended medicine name from potentially misspelled, partial queries, barcodes, or composition keywords.
 *
 * - enhanceMedicineSearch - A function that takes a user's search query and returns a term suitable for backend search.
 * - EnhanceMedicineSearchInput - The input type for the enhanceMedicineSearch function.
 * - EnhanceMedicineSearchOutput - The return type for the enhanceMedicineSearch function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EnhanceMedicineSearchInputSchema = z.object({
  query: z.string().describe('The user input query, which may contain misspellings, be incomplete, a barcode, or composition keywords, potentially including dosages.'),
});
export type EnhanceMedicineSearchInput = z.infer<typeof EnhanceMedicineSearchInputSchema>;

const EnhanceMedicineSearchOutputSchema = z.object({
  correctedMedicineName: z
    .string()
    .describe('The corrected/completed medicine name, barcode, or composition keyword extracted from the query, suitable for backend search. Should retain specific details like dosages if they appear to be part of a product name.'),
});
export type EnhanceMedicineSearchOutput = z.infer<typeof EnhanceMedicineSearchOutputSchema>;

export async function enhanceMedicineSearch(input: EnhanceMedicineSearchInput): Promise<EnhanceMedicineSearchOutput> {
  // If no AI plugins are loaded (e.g., GOOGLE_API_KEY is missing), use fallback.
  if (ai.plugins.length === 0) {
    console.warn("enhanceMedicineSearch: AI plugin not available (likely missing GOOGLE_API_KEY). Returning original query.");
    return { correctedMedicineName: input.query };
  }
  try {
    return await enhanceMedicineSearchFlow(input);
  } catch (error) {
    console.error("Error in enhanceMedicineSearchFlow:", error);
    // Fallback to original query if the flow itself errors out
    return { correctedMedicineName: input.query };
  }
}

const enhanceMedicineSearchPrompt = ai.definePrompt({
  name: 'enhanceMedicineSearchPrompt',
  input: {schema: EnhanceMedicineSearchInputSchema},
  output: {schema: EnhanceMedicineSearchOutputSchema},
  prompt: `You are an AI assistant for a medicine search application. Your primary goal is to help identify the medicine the user is looking for.
The user query can be a medicine name (possibly misspelled or partial, and may include dosages like "500mg"), its barcode, or keywords from its composition.
Based on the input, determine the most likely *medicine name* or the *original query if it seems to be a direct identifier like a barcode or a specific product formulation that doesn't map to a more general common name*.
Return this as \`correctedMedicineName\`.

The subsequent search will use this \`correctedMedicineName\` to look up medicines by name, barcode, or composition.
If the query includes dosage or strength (e.g., "Paracetamol 500mg", "Dolo 650"), and this appears to be part of a specific product name or common way of referring to it, RETAIN these details in \`correctedMedicineName\`.
If the query is a general description (e.g., "medicine for headache"), extract the key medicinal component.

Examples:
- Query: "panadol", correctedMedicineName: "Panadol"
- Query: "amoxilin", correctedMedicineName: "Amoxicillin"
- Query: "dolo 650", correctedMedicineName: "Dolo 650"
- Query: "Paracetamol 500mg Tablet", correctedMedicineName: "Paracetamol 500mg Tablet"
- Query: "Aceclofenac 100 mg Paracetamol 325 mg", correctedMedicineName: "Aceclofenac 100 mg Paracetamol 325 mg"
- Query: "Barcode 1234567890123 for Paracetamol", correctedMedicineName: "Paracetamol"
- Query: "1234567890123" (assume this is a barcode), correctedMedicineName: "1234567890123"
- Query: "syrup with paracetamol 500mg" (descriptive), correctedMedicineName: "Paracetamol"
- Query: "medicine for headache with ibuprofen", correctedMedicineName: "Ibuprofen"


If the input is a barcode, and you cannot confidently map it to a common medicine name, return the barcode itself.
If the input is a composition keyword (e.g. "Paracetamol"), return it or a slightly refined version.
The key is to provide a search term that will be effective for the backend, preserving specificity when it seems intentional.

User Query: {{{query}}}
  `,
});

const enhanceMedicineSearchFlow = ai.defineFlow(
  {
    name: 'enhanceMedicineSearchFlow',
    inputSchema: EnhanceMedicineSearchInputSchema,
    outputSchema: EnhanceMedicineSearchOutputSchema,
  },
  async input => {
    const {output} = await enhanceMedicineSearchPrompt(input);
    if (!output) {
      // This case should ideally be caught by Zod schema validation if the AI returns an invalid structure.
      // However, this explicit check adds robustness if the AI returns nothing or a valid but empty object.
      console.error("enhanceMedicineSearchFlow: AI returned no output or an invalid structure.");
      throw new Error("AI failed to enhance search query or return valid output structure.");
    }
    return output;
  }
);

