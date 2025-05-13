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
  source: z.enum(['ai_enhanced', 'ai_unavailable', 'ai_failed', 'original_query_used']).optional().describe("Indicates the source or status of the correctedMedicineName. 'ai_enhanced' if AI successfully processed. 'ai_unavailable' if AI couldn't be used (e.g. no API key). 'ai_failed' if AI processing failed. 'original_query_used' if AI was skipped or failed and original query is returned."),
});
export type EnhanceMedicineSearchOutput = z.infer<typeof EnhanceMedicineSearchOutputSchema>;

export async function enhanceMedicineSearch(input: EnhanceMedicineSearchInput): Promise<EnhanceMedicineSearchOutput> {
  if (!input || typeof input.query !== 'string') {
    console.error(`enhanceMedicineSearch: Invalid input received. Input: ${JSON.stringify(input)}`);
    return {
      correctedMedicineName: input?.query || "", 
      source: 'ai_failed',
    };
  }

  try {
    const result = await enhanceMedicineSearchFlow(input);
    if (result.source === 'ai_unavailable') {
        console.warn(`enhanceMedicineSearch: Flow indicated AI is unavailable. Query: "${input.query}"`);
    }
    return result;
  } catch (error: unknown) {
    let message = "Unknown error during AI search enhancement.";
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }
    console.error(`Error in enhanceMedicineSearch wrapper for query "${input.query}":`, message, error);
    return { correctedMedicineName: input.query, source: 'ai_failed' };
  }
}

const enhanceMedicineSearchPrompt = ai.definePrompt({
  name: 'enhanceMedicineSearchPrompt',
  model: 'googleai/gemini-pro',
  input: {schema: EnhanceMedicineSearchInputSchema},
  output: {schema: EnhanceMedicineSearchOutputSchema},
  prompt: `You are an AI assistant for a medicine search application. Your primary goal is to help identify the medicine the user is looking for.
The user query can be a medicine name (possibly misspelled or partial, and may include dosages like "500mg"), its barcode, or keywords from its composition.
Based on the input, determine the most likely *medicine name* or the *original query if it seems to be a direct identifier like a barcode or a specific product formulation that doesn't map to a more general common name*.
Return this as \`correctedMedicineName\`.
Set the 'source' field to 'ai_enhanced'.

The subsequent search will use this \`correctedMedicineName\` to look up medicines by name, barcode, or composition.
If the query includes dosage or strength (e.g., "Paracetamol 500mg", "Dolo 650"), and this appears to be part of a specific product name or common way of referring to it, RETAIN these details in \`correctedMedicineName\`.
If the query is a general description (e.g., "medicine for headache"), extract the key medicinal component.

Examples:
- Query: "panadol", correctedMedicineName: "Panadol", source: "ai_enhanced"
- Query: "amoxilin", correctedMedicineName: "Amoxicillin", source: "ai_enhanced"
- Query: "dolo 650", correctedMedicineName: "Dolo 650", source: "ai_enhanced"
- Query: "Paracetamol 500mg Tablet", correctedMedicineName: "Paracetamol 500mg Tablet", source: "ai_enhanced"
- Query: "Aceclofenac 100 mg Paracetamol 325 mg", correctedMedicineName: "Aceclofenac 100 mg Paracetamol 325 mg", source: "ai_enhanced"
- Query: "Barcode 1234567890123 for Paracetamol", correctedMedicineName: "Paracetamol", source: "ai_enhanced"
- Query: "1234567890123" (assume this is a barcode), correctedMedicineName: "1234567890123", source: "ai_enhanced"
- Query: "syrup with paracetamol 500mg" (descriptive), correctedMedicineName: "Paracetamol", source: "ai_enhanced"
- Query: "medicine for headache with ibuprofen", correctedMedicineName: "Ibuprofen", source: "ai_enhanced"

If the input is a barcode, and you cannot confidently map it to a common medicine name, return the barcode itself.
If the input is a composition keyword (e.g. "Paracetamol"), return it or a slightly refined version.
The key is to provide a search term that will be effective for the backend, preserving specificity when it seems intentional.
Always set 'source' to 'ai_enhanced' in your direct response. Do not return empty strings for correctedMedicineName; if unsure, return the original query.

User Query: {{{query}}}
  `,
});

const enhanceMedicineSearchFlow = ai.defineFlow(
  {
    name: 'enhanceMedicineSearchFlow',
    inputSchema: EnhanceMedicineSearchInputSchema,
    outputSchema: EnhanceMedicineSearchOutputSchema,
  },
  async (input: EnhanceMedicineSearchInput) => {
    let rawOutputFromAI: any = null;
    try {
      const {output} = await enhanceMedicineSearchPrompt(input);
      rawOutputFromAI = output;
      console.log("enhanceMedicineSearchFlow - Raw AI Output:", JSON.stringify(rawOutputFromAI, null, 2));


      if (!rawOutputFromAI ||
          typeof rawOutputFromAI.correctedMedicineName !== 'string' ||
          rawOutputFromAI.correctedMedicineName.trim() === '' ||
          rawOutputFromAI.source !== 'ai_enhanced'
        ) {
        console.error(
            "enhanceMedicineSearchFlow: AI returned no output, invalid structure, empty correctedMedicineName, or incorrect source. Input:",
            JSON.stringify(input, null, 2),
            "Raw Output:",
            JSON.stringify(rawOutputFromAI, null, 2)
        );
        if (rawOutputFromAI === null) {
             console.error("enhanceMedicineSearchFlow: AI prompt output failed Zod schema validation or AI returned null. Raw output was null.");
        }
        return { correctedMedicineName: input.query, source: 'original_query_used' };
      }
      return { ...rawOutputFromAI, source: 'ai_enhanced' };
    } catch (flowError: unknown) {
      let errorMessage = "AI model failed to process search enhancement or an unexpected error occurred.";
      let errorStack: string | undefined;

      if (flowError instanceof Error) {
          errorMessage = flowError.message;
          errorStack = flowError.stack;

          if (errorMessage.includes('API key not valid') || errorMessage.includes('User location is not supported') || errorMessage.includes('API_KEY_INVALID')) {
            console.error(`enhanceMedicineSearchFlow: Probable API key or configuration issue: ${errorMessage}`);
            return { correctedMedicineName: input.query, source: 'ai_unavailable' };
          }
          if (errorMessage.includes('model not found') || errorMessage.includes('Could not find model')) {
            console.error(`enhanceMedicineSearchFlow: AI model not found or configured: ${errorMessage}`);
            return { correctedMedicineName: input.query, source: 'ai_unavailable' };
          }
      } else if (typeof flowError === 'string') {
          errorMessage = flowError;
      } else if (flowError && typeof flowError === 'object' && 'message' in flowError) {
          errorMessage = String((flowError as any).message);
      }

      console.error(`enhanceMedicineSearchFlow: Error for input ${JSON.stringify(input)} - Message: ${errorMessage}${errorStack ? `\nStack: ${errorStack}` : ''}\nRaw AI Output (if available): ${JSON.stringify(rawOutputFromAI, null, 2)}\nOriginal Error Object:`, flowError);
      return { correctedMedicineName: input.query, source: 'ai_failed' };
    }
  }
);
