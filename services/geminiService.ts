import type { LessonPlanRequest } from '../types';

export async function* generateLessonPlanStream(request: LessonPlanRequest): AsyncGenerator<string> {
  try {
    const response = await fetch('/.netlify/functions/generate-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = `Erro do servidor: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // Could not parse JSON, stick with the status text.
      }
      throw new Error(errorMessage);
    }

    if (!response.body) {
      throw new Error("O corpo da resposta está vazio.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.length > 0) {
          yield buffer;
        }
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      // Yield chunks as they are parsed, assuming they are sent as distinct JSON parts or text streams
      yield buffer;
      buffer = '';
    }

  } catch (error) {
    console.error("Erro ao chamar a função serverless:", error);
    if (error instanceof Error) {
        // Re-throw the specific message for the UI to catch
        throw error;
    }
    throw new Error("Ocorreu um erro desconhecido ao se comunicar com o servidor.");
  }
};
