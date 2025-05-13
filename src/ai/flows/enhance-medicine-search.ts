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
  query: z.string().describe('The user input query, which may contain misspellings, be incomplete, a barcode, or composition keywords.'),
});
export type EnhanceMedicineSearchInput = z.infer<typeof EnhanceMedicineSearchInputSchema>;

const EnhanceMedicineSearchOutputSchema = z.object({
  correctedMedicineName: z
    .string()
    .describe('The corrected/completed medicine name, barcode, or composition keyword extracted from the query, suitable for backend search.'),
});
export type EnhanceMedicineSearchOutput = z.infer<typeof EnhanceMedicineSearchOutputSchema>;

export async function enhanceMedicineSearch(input: EnhanceMedicineSearchInput): Promise<EnhanceMedicineSearchOutput> {
  return enhanceMedicineSearchFlow(input);
}

const enhanceMedicineSearchPrompt = ai.definePrompt({
  name: 'enhanceMedicineSearchPrompt',
  input: {schema: EnhanceMedicineSearchInputSchema},
  output: {schema: EnhanceMedicineSearchOutputSchema},
  prompt: `You are an AI assistant for a medicine search application. Your primary goal is to help identify the medicine the user is looking for.
The user query can be a medicine name (possibly misspelled or partial), its barcode, or keywords from its composition.
Based on the input, determine the most likely *medicine name* or the *original query if it seems to be a direct identifier like a barcode that doesn't map to a common name*.
Return this as \`correctedMedicineName\`.

The subsequent search will use this \`correctedMedicineName\` to look up medicines by name, barcode, or composition.

Examples:
- Query: "panadol", correctedMedicineName: "Panadol"
- Query: "amoxilin", correctedMedicineName: "Amoxicillin"
- Query: "dolo 650", correctedMedicineName: "Dolo 650"
- Query: "Barcode 1234567890123 for Paracetamol", correctedMedicineName: "Paracetamol"
- Query: "1234567890123" (assume this is a barcode), correctedMedicineName: "1234567890123"
- Query: "syrup with paracetamol 500mg", correctedMedicineName: "Paracetamol" (if "Paracetamol" is the best general name to search for) or "syrup with paracetamol 500mg" (if a more specific name is not clear or the phrase itself is a good search term)
- Query: "medicine for headache with ibuprofen", correctedMedicineName: "Ibuprofen"

If the input is a barcode, and you cannot confidently map it to a common medicine name, return the barcode itself.
If the input is a composition keyword, and you can map it to a common medicine name, return that name. Otherwise, return the keyword or a slightly refined version of it.
The key is to provide a search term that will be effective for the backend.

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
    return output!;
  }
);
