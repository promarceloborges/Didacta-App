import { GoogleGenAI, Type } from "@google/genai";
import bnccData from './data/bncc_data.js';
const { bnccCompetenciasHabilidades } = bnccData;
import { saebDescritores } from './data/saeb_data.js';

const lessonPlanSchema = {
  type: Type.OBJECT,
  properties: {
    meta: {
      type: Type.OBJECT,
      properties: {
        gerado_por: { type: Type.STRING },
        timestamp: { type: Type.STRING },
        versao_template: { type: Type.STRING },
      },
       required: ['gerado_por', 'timestamp', 'versao_template']
    },
    plano_aula: {
      type: Type.OBJECT,
      properties: {
        titulo: { type: Type.STRING },
        componente_curricular: { type: Type.STRING },
        disciplina: { type: Type.STRING },
        serie_turma: { type: Type.STRING },
        objetos_do_conhecimento: { type: Type.ARRAY, items: { type: Type.STRING } },
        duracao_total_min: { type: Type.INTEGER },
        numero_de_aulas: { type: Type.INTEGER },
        competencia_especifica: { 
            type: Type.OBJECT,
            properties: {
                codigo: { type: Type.STRING },
                texto: { type: Type.STRING },
            },
            required: ['codigo', 'texto']
        },
        habilidades: { 
            type: Type.ARRAY, 
            items: { 
                type: Type.OBJECT,
                properties: {
                    codigo: { type: Type.STRING },
                    texto: { type: Type.STRING },
                },
                required: ['codigo', 'texto']
            }
        },
        objetivos_de_aprendizagem: { type: Type.ARRAY, items: { type: Type.STRING } },
        descritores: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    codigo: { type: Type.STRING },
                    texto: { type: Type.STRING },
                },
                required: ['codigo', 'texto']
            }
        },
        metodologia: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              etapa: { type: Type.STRING },
              duracao_min: { type: Type.INTEGER },
              atividades: { type: Type.ARRAY, items: { type: Type.STRING } },
              recursos: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['etapa', 'duracao_min', 'atividades', 'recursos']
          },
        },
        material_de_apoio: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              tipo: { type: Type.STRING },
              titulo: { type: Type.STRING },
              link: { type: Type.STRING },
            },
            required: ['tipo', 'titulo', 'link']
          },
        },
        estrategia_de_avaliacao: {
          type: Type.OBJECT,
          properties: {
            criterios: { type: Type.ARRAY, items: { type: Type.STRING } },
            instrumentos: { type: Type.ARRAY, items: { type: Type.STRING } },
            pesos: { 
                type: Type.OBJECT,
                properties: {
                    prova: {type: Type.NUMBER},
                    atividade: {type: Type.NUMBER},
                    participacao: {type: Type.NUMBER}
                }
             },
          },
          required: ['criterios', 'instrumentos']
        },
        adapitacoes_nee: { type: Type.ARRAY, items: { type: Type.STRING } },
        observacoes: { type: Type.STRING },
        export_formats: { type: Type.ARRAY, items: { type: Type.STRING } },
        hash_validacao: { type: Type.STRING },
      },
       required: ['titulo', 'componente_curricular', 'disciplina', 'serie_turma', 'objetos_do_conhecimento', 'duracao_total_min', 'numero_de_aulas', 'competencia_especifica', 'habilidades', 'objetivos_de_aprendizagem', 'descritores', 'metodologia', 'material_de_apoio', 'estrategia_de_avaliacao', 'adapitacoes_nee', 'observacoes']
    },
  },
  required: ['meta', 'plano_aula']
};

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Método não permitido', { status: 405 });
  }

  // A API Key é obtida das variáveis de ambiente da Netlify
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Chave de API não configurada no servidor.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const request = await req.json();
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
      Você é um especialista em pedagogia e design instrucional, fluente em português do Brasil (pt-BR).
      Sua tarefa é criar planos de aula detalhados e de alta qualidade, a partir das especificações do usuário.
      Utilize as seguintes informações como sua fonte de conhecimento EXCLUSIVA para garantir o alinhamento curricular. Baseie-se estritamente nestes dados para selecionar competências, habilidades e descritores:
      - Dados da BNCC (Competências e Habilidades): ${JSON.stringify(bnccCompetenciasHabilidades)}
      - Dados dos Descritores (SAEB): ${JSON.stringify(saebDescritores)}
      
      Você deve retornar estritamente um objeto JSON válido, sem nenhum texto, markdown ou explicação adicional fora do objeto JSON.
      Siga rigorosamente o schema JSON fornecido em 'responseSchema'.
      - Sempre alinhe o plano à BNCC e aos descritores do SAEB, usando os dados fornecidos. Para 'competencia_especifica', 'habilidades' e 'descritores', forneça o código e o texto descritivo exatamente como aparecem nos dados, em objetos separados conforme o schema.
      - Identifique e inclua de uma a três habilidades da BNCC que sejam diretamente relevantes para o objeto de conhecimento fornecido. A seleção deve ser criteriosa para garantir a pertinência pedagógica.
      - Para a seção 'material_de_apoio', quando o tipo for 'Vídeo', o campo 'link' DEVE ser uma URL de busca do YouTube ('https://www.youtube.com/results?search_query=...'), usando os termos de busca mais relevantes em formato de query string. NÃO gere links diretos para vídeos ('watch?v=...').
      - O conteúdo deve ser original, com linguagem profissional e apropriada para professores.
      - Inclua estimativas de tempo realistas para cada etapa da metodologia.
      - Sugira recursos concretos, com links para materiais gratuitos (OER, artigos) quando possível, e links de busca para vídeos.
      - Inclua sugestões práticas de adaptação para alunos com Necessidades Educacionais Especiais (NEE).
      - Valide a coerência interna do plano (ex: se uma atividade prática é proposta, os materiais necessários devem estar listados).
      - A soma da duração das etapas da metodologia deve ser igual à duração total da aula.
    `;

    const prompt = `
      Por favor, gere um plano de aula completo com base nos seguintes parâmetros, utilizando o conhecimento da BNCC e descritores SAEB fornecidos.
      O resultado DEVE ser um JSON que valide com o schema fornecido.
      
      Parâmetros da Solicitação:
      - Modalidade de Ensino: ${request.modalidade_ensino}
      - Componente Curricular/Disciplina: ${request.componente_curricular}
      - Série/Turma: ${request.serie_turma}
      - Objeto do Conhecimento/Conteúdo: ${request.objeto_conhecimento}
      - Duração da Aula (minutos): ${request.duracao_aula_min}
      - Número de Aulas: ${request.numero_aulas}
      - Nível de Detalhe: ${request.nivel_detalhe}
      - Língua: pt-BR
    `;

    const responseStream = await ai.models.generateContentStream({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: lessonPlanSchema,
            temperature: 0.7,
        }
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      }
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

  } catch (error) {
    console.error("Erro na função serverless:", error);
    let errorMessage = "Ocorreu um erro ao gerar o plano de aula no servidor.";
    let statusCode = 500;
    if (error instanceof Error) {
        // Tenta preservar mensagens de erro específicas da API
        if (error.message.includes("SAFETY")) {
            errorMessage = "A solicitação foi bloqueada por questões de segurança. Tente reformular o conteúdo.";
            statusCode = 400;
        } else if (error.message.includes("429")) {
            errorMessage = "Limite de requisições atingido. Por favor, aguarde um momento antes de tentar novamente.";
            statusCode = 429;
        }
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
    });
  }
};
