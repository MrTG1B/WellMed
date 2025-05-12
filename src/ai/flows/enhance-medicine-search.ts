'use server';

/**
 * @fileOverview Enhances medicine search functionality by extracting the intended medicine name from potentially misspelled or partial queries.
 *
 * - enhanceMedicineSearch - A function that takes a user's search query and returns the corrected medicine name.
 * - EnhanceMedicineSearchInput - The input type for the enhanceMedicineSearch function.
 * - EnhanceMedicineSearchOutput - The return type for the enhanceMedicineSearch function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EnhanceMedicineSearchInputSchema = z.object({
  query: z.string().describe('The user input query, which may contain misspellings or be incomplete.'),
});
export type EnhanceMedicineSearchInput = z.infer<typeof EnhanceMedicineSearchInputSchema>;

const EnhanceMedicineSearchOutputSchema = z.object({
  correctedMedicineName: z
    .string()
    .describe('The corrected and complete medicine name extracted from the query.'),
});
export type EnhanceMedicineSearchOutput = z.infer<typeof EnhanceMedicineSearchOutputSchema>;

export async function enhanceMedicineSearch(input: EnhanceMedicineSearchInput): Promise<EnhanceMedicineSearchOutput> {
  return enhanceMedicineSearchFlow(input);
}

const enhanceMedicineSearchPrompt = ai.definePrompt({
  name: 'enhanceMedicineSearchPrompt',
  input: {schema: EnhanceMedicineSearchInputSchema},
  output: {schema: EnhanceMedicineSearchOutputSchema},
  prompt: `You are an AI assistant designed to correct and complete medicine names from user queries.

  The user will provide a query that might contain misspellings, be incomplete, or contain extra words.
  Your task is to extract the intended medicine name from the query and provide the corrected and complete medicine name.

  For example:
  - If the query is "panadol", the corrected medicine name should be "Panadol".
  - If the query is "amoxilin", the corrected medicine name should be "Amoxicillin".
  - If the query is "dolo 650", the corrected medicine name should be "Dolo 650".

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
