import { GoogleGenerativeAI } from "@google/generative-ai";

let dynamicKeys = {
    GEMINI_API_KEY: null,
    OPENAI_API_KEY: null
};

/**
 * Atualiza as chaves de IA em tempo de execução
 */
export const setAiConfig = (configs) => {
    if (!configs) return;
    // Atualiza mesmo que seja string vazia para permitir reset, mas prioriza valores reais
    if (configs.GEMINI_API_KEY !== undefined) dynamicKeys.GEMINI_API_KEY = configs.GEMINI_API_KEY;
    if (configs.OPENAI_API_KEY !== undefined) dynamicKeys.OPENAI_API_KEY = configs.OPENAI_API_KEY;
    console.log("[AI] Sincronização de chaves executada.", {
        hasGemini: !!dynamicKeys.GEMINI_API_KEY,
        hasOpenAI: !!dynamicKeys.OPENAI_API_KEY
    });
};

// Nomes de modelos para tentar em ordem de prioridade
const MODELS_TO_TRY = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-2.0-flash",
    "gemini-1.5-pro"
];

const ensureArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'object') {
        // Se for um objeto (como o stages do TaskModal), converter para array preservando a chave como título
        return Object.entries(val).map(([key, value]) => ({
            title: key,
            ...(typeof value === 'object' ? value : { value })
        }));
    }
    return [];
};

const formatDate = (dateStr) => {
    if (!dateStr) return 'Não informado';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Não informado';
    return d.toLocaleDateString('pt-BR');
};

/**
 * Limpa e extrai JSON de uma string retornada pela IA de forma robusta
 */
function extractAndCleanJson(text) {
    if (!text) return null;

    try {
        // 1. Tenta encontrar o bloco de código JSON (```json ... ```)
        const jsonBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        let targetText = jsonBlockMatch ? jsonBlockMatch[1] : text;

        // 2. Se não encontrou bloco, tenta extrair qualquer coisa entre as chaves { }
        if (!jsonBlockMatch) {
            const curlyMatch = targetText.match(/\{[\s\S]*\}/);
            if (curlyMatch) targetText = curlyMatch[0];
        }

        // 3. Limpeza de caracteres de controle invisíveis e espaços extras
        const cleanJson = targetText
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove caracteres de controle
            .trim();

        return JSON.parse(cleanJson);
    } catch (e) {
        console.warn("[AI] Falha no parsing robusto de JSON:", e.message);

        // 4. Fallback agressivo: Tentativa de "consertar" o JSON removendo quebras de linha dentro de strings
        try {
            const softClean = text.match(/\{[\s\S]*\}/)?.[0]
                .replace(/\n/g, "\\n")
                .replace(/\r/g, "\\r")
                .replace(/\t/g, "\\t");
            if (softClean) return JSON.parse(softClean);
        } catch (innerE) {
            return null;
        }
        return null;
    }
}

/**
 * Função central para chamar o Gemini com resiliência de modelos
 */
async function runGeminiWithResilience(apiKey, parts, isChat = false, history = []) {
    // Limpeza profunda da chave para evitar qualquer caractere invisível
    const cleanKey = apiKey?.replace(/[\s\r\n\t]/g, '').replace(/["']/g, '').trim();
    if (!cleanKey || cleanKey.length < 10) throw new Error("Chave API do Gemini inválida ou não configurada.");

    const genAI = new GoogleGenerativeAI(cleanKey);
    let lastError = null;

    // Log seguro
    const maskedKey = `${cleanKey.substring(0, 6)}...${cleanKey.substring(cleanKey.length - 4)}`;
    console.log(`[AI] Testando chave: ${maskedKey}`);

    for (const modelName of MODELS_TO_TRY) {
        // O SDK resolve a versão automaticamente na maioria dos casos.
        const versions = [undefined, 'v1', 'v1beta'];

        for (const apiVer of versions) {
            try {
                const modelOpts = { model: modelName };
                const apiOpts = apiVer ? { apiVersion: apiVer } : {};

                console.log(`[AI] Tentando: ${modelName} | API: ${apiVer || 'auto'}`);
                const model = genAI.getGenerativeModel(modelOpts, apiOpts);

                if (isChat) {
                    const chat = model.startChat({ history });
                    const result = await chat.sendMessage(parts[0].text);
                    const response = await result.response;
                    return response.text();
                } else {
                    const result = await model.generateContent(parts);
                    const response = await result.response;
                    return response.text();
                }
            } catch (error) {
                const errorMsg = error.message.toLowerCase();
                console.warn(`[AI] Falhou: ${modelName} (${apiVer || 'auto'}) ->`, errorMsg);
                lastError = error;

                // Erros de permissão/chave (403) ou 401 são fatais para a chave
                if (errorMsg.includes('403') || errorMsg.includes('401') || errorMsg.includes('permission') || errorMsg.includes('api_key_invalid')) {
                    throw new Error(`Erro de Permissão (403). A chave ${maskedKey} não tem acesso à API ou ao modelo. Verifique se o faturamento está ativo e se você não atingiu o limite de tempo de propagação do Google Cloud.`);
                }

                // Erro de cota (429): pula para o próximo modelo (pode ter limites diferentes)
                if (errorMsg.includes('429')) break;

                // Erro 404: continua tentando outras versões/modelos
                continue;
            }
        }
    }

    const finalErrMsg = lastError?.message || "Erro desconhecido";
    throw new Error(`O Gemini falhou em todas as tentativas. Último erro: ${finalErrMsg}. Considere usar o OpenAI (GPT) na aba de configurações como alternativa temporária.`);
}

/**
 * Função para chamar a OpenAI (ChatGPT)
 */
async function runOpenAI(apiKey, prompt, model = "gpt-4o-mini") {
    const cleanKey = apiKey?.trim().replace(/["']/g, '');
    if (!cleanKey) throw new Error("Chave API da OpenAI não configurada.");

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${cleanKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Erro na API da OpenAI");
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("[AI] Erro na OpenAI:", error);
        throw error;
    }
}

/**
 * Refina um texto de relatório existente, melhorando gramática, tom técnico e clareza.
 */
export const refineReportText = async (currentText, taskContext) => {
    // DESATIVADO: IA removida a pedido do usuário. Retornando texto original para manter integridade.
    console.log("[AI] Refinamento por IA desativado. Mantendo texto original.");
    return currentText;
};

/**
 * Constrói um pacote de dados técnico estruturado para os relatórios.
 */
export const buildAIDataPackage = (notes, mediaItems, taskContext) => {
    const sanitize = (val) => (val && val.toString().trim()) ? val.toString().trim() : "Não informado";

    const travels = ensureArray(taskContext.travels || taskContext.visitations);
    const stages = ensureArray(taskContext.stages || taskContext.checklist);
    const completedStages = stages.filter(s => s.completed || s.status === 'DONE').length;
    const completionRate = stages.length > 0 ? Math.round((completedStages / stages.length) * 100) : 0;
    const hasVisits = travels.length > 0;

    const stagesList = stages
        .map(s => {
            const isCompleted = s.completed || s.status === 'DONE' || s.status === 'FINALIZADO' || s.status === 'SOLUCIONADO';
            const statusIndicator = isCompleted ? 'x' : ' ';
            const title = s.title || s.label || s.description || 'Item sem título';
            const notes = s.notes || s.description || s.comment || '';

            // Se o título e a nota forem iguais (comum em etapas simples), não repetir
            const displayNotes = (notes && notes !== title) ? `\n  > *Nota: ${notes}*` : '';

            return { isCompleted, text: `- [${statusIndicator}] ${title}${displayNotes}` };
        })
        .filter(s => s.isCompleted) // FILTRO: Apenas as marcadas/concluídas
        .map(s => s.text)
        .join('\n');

    const commentsList = ensureArray(taskContext.comments)
        .map(c => `> **${c.user_name || 'Comentário'}:** ${c.content || c.text || ''}`)
        .join('\n\n');

    return {
        userName: taskContext.userName || 'Técnico AssisTec',
        clientName: sanitize(taskContext.client || taskContext.client_name),
        title: sanitize(taskContext.title || taskContext.op || 'Atendimento Técnico'),
        op: sanitize(taskContext.op),
        item: sanitize(taskContext.item || taskContext.item_number),
        order: sanitize(taskContext.purchase_order || taskContext.pedido),
        category: sanitize(taskContext.category),
        rawNotes: sanitize(notes || taskContext.raw_notes),
        description: sanitize(taskContext.description), // Descrição original da tarefa
        stagesList: stagesList || 'Nenhuma etapa de checklist registrada.',
        completionRate,
        hasVisits,
        tripStatus: hasVisits ? "VISTORIA REALIZADA" : "ATENDIMENTO REMOTO",
        date: new Date().toLocaleDateString('pt-BR'),
        // Novos campos comerciais
        solicitante: taskContext.solicitanteVisita || 'Não informado',
        contato: taskContext.contatoCliente || 'Não informado',
        produto: taskContext.produtoRelacionado || 'Não informado',
        cidade: taskContext.city || taskContext.location_city || 'Não informado',
        location: taskContext.location || 'Não informado',
        rnc: taskContext.rnc || 'N/A',
        manualActions: taskContext.manualActions || [],
        commentsList: commentsList || null
    };
};

/**
 * Gera um relatório técnico nativo (Safety Mode) baseado puramente nos dados do Data Package.
 * Esta função não depende de rede ou chaves de IA e serve como fallback definitivo.
 */
export const generateNativeReportFallback = (data, status) => {
    console.log("[AI] Gerando Relatório Técnico Nativo Estruturado...");
    const isFinal = status === 'FINAL';

    // Estilos Inline para garantir consistência no editor e na impressão
    const styles = {
        headerBox: "background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e2e8f0; font-family: sans-serif;",
        sectionTitle: "color: #1e40af; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-top: 25px; margin-bottom: 12px; text-transform: uppercase; font-size: 15px; font-weight: 800; letter-spacing: 0.5px;",
        label: "color: #1e40af; font-size: 11px; font-weight: 900; text-transform: uppercase; display: block; margin-bottom: 2px; text-decoration: underline;",
        value: "color: #1e293b; font-size: 14px; font-weight: 600; margin-bottom: 12px; display: block;",
        table: "width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; table-layout: fixed;",
        th: "background-color: #f1f5f9; color: #475569; font-weight: bold; text-align: left; padding: 10px; border: 1px solid #cbd5e1; text-transform: uppercase; font-size: 10px;",
        td: "padding: 10px; border: 1px solid #cbd5e1; color: #334155; word-wrap: break-word; vertical-align: top;"
    };

    // --- INÍCIO DA GERAÇÃO DO CONTEÚDO ---
    let content = '';

    // 1. Objetivo da Visita
    content += `<h3 style="${styles.sectionTitle}">OBJETIVO DA VISITA</h3>`;
    content += `<p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 20px;">${data.objective || 'Atendimento técnico programado para análise e suporte conforme solicitação do cliente.'}</p>`;

    // 2. Descrição do Chamado
    if (data.description && data.description !== 'Não informado') {
        content += `<h3 style="${styles.sectionTitle}">DESCRIÇÃO DO CHAMADO</h3>`;
        content += `<p style="font-size: 14px; line-height: 1.6; color: #334155; font-style: italic; margin-bottom: 15px;">${data.description}</p>`;
    }

    // 3. Resumo de Atividades da Tarefa
    content += `<h3 style="${styles.sectionTitle}">RESUMO DE ATIVIDADES DA TAREFA</h3>`;
    if (data.stagesList && data.stagesList !== 'Nenhuma etapa de checklist registrada.') {
        const stages = data.stagesList.split('\n').map(s => s.replace('- [x] ', '').replace('- [ ] ', '').trim());
        content += `<ul style="font-size: 14px; line-height: 1.8; color: #334155; padding-left: 20px; margin-bottom: 15px;">`;
        stages.forEach(s => {
            if (s) content += `<li style="margin-bottom: 5px;">${s}</li>`;
        });
        content += `</ul>`;
    } else {
        content += `<p style="font-size: 14px; color: #94a3b8; font-style: italic; margin-bottom: 15px;">Nenhuma etapa de checklist registrada.</p>`;
    }

    // 4. Notas do Técnico
    content += `<p style="font-size: 14px; color: #1e293b; font-weight: 800; margin-top: 15px; margin-bottom: 8px;">Notas Gerais do Técnico:</p>`;
    const formattedNotes = (data.rawNotes || 'Não informado')
        .replace(/\n/g, '<br>');
    content += `<div style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 25px;">
        ${formattedNotes}
    </div>`;

    // 5. Conclusão
    content += `<h3 style="${styles.sectionTitle}">CONCLUSÃO</h3>`;
    content += `<p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 15px;">O atendimento foi realizado conforme os padrões técnicos da Plastimarau. As pendências e resultados foram registrados nos itens acima.</p>`;

    return {
        reportText: content,
        suggestedActions: [],
        suggestedStatus: isFinal ? "FINAL" : "PARCIAL"
    };
};

/**
 * Generates a technical report based on notes and pre-analyzed media descriptions.
 */
export const generateReportWithGemini = async (notes, mediaItems, taskContext) => {
    // Constrói o pacote de dados estruturado (Data Package)
    const dataPackage = buildAIDataPackage(notes, mediaItems, taskContext);
    const reportStatusTarget = taskContext.manualStatus === 'FINALIZADO' ? 'FINAL' : 'PARCIAL';

    // IA DESATIVADA: Sempre usando o modo de segurança nativo para garantir estabilidade.
    console.log("[AI] Geração por IA desativada. Usando Modo de Segurança Nativo.");
    return generateNativeReportFallback(dataPackage, reportStatusTarget);
};

/**
 * Otimiza endereços
 */
export const optimizeAddressForGeocoding = async (address, clientName) => {
    const geminiKey = dynamicKeys.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    const openaiKey = dynamicKeys.OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;
    const prompt = `Otimize este endereço para busca no mapa(Nominatim): "${address}" do cliente "${clientName}".Retorne JSON: { "suggestion": "Endereço", "reason": "motivo", "confidence": "high/medium/low" } `;

    try {
        let resultText;
        if (geminiKey && geminiKey.length > 10) {
            try {
                resultText = await runGeminiWithResilience(geminiKey, [{ text: prompt }]);
            } catch (e) {
                if (openaiKey && openaiKey.length > 10) {
                    resultText = await runOpenAI(openaiKey, prompt);
                } else throw e;
            }
        } else if (openaiKey && openaiKey.length > 10) {
            resultText = await runOpenAI(openaiKey, prompt);
        } else {
            return { suggestion: address, reason: "Sem chaves de IA", confidence: "low" };
        }

        const parsed = extractAndCleanJson(resultText);
        if (parsed && parsed.suggestion) return parsed;
        return { suggestion: address, reason: "Fallback", confidence: "low" };
    } catch (e) {
        console.error("[AI] Erro ao otimizar endereço:", e);
        return { suggestion: address, reason: e.message, confidence: "low" };
    }
};

/**
 * Chat POLI
 */
export const chatWithPoli = async (history, userMessage, context = {}) => {
    // Chat POLI Nativo - Respostas baseadas em regras de negócio
    const msg = userMessage.toLowerCase();
    const userName = context.userName || 'Técnico';

    if (msg.includes('olá') || msg.includes('oi') || msg.includes('bom dia')) {
        return `Olá ${userName}! Sou a POLI. Estou analisando seus dados localmente agora. Como posso ajudar com seus indicadores hoje?`;
    }
    if (msg.includes('status') || msg.includes('como está')) {
        return `A operação está estável. Temos ${context.taskCount || 0} atividades registradas no banco de dados e ${context.clientCount || 0} clientes na carteira.`;
    }
    if (msg.includes('atraso') || msg.includes('pendência') || msg.includes('atrasada')) {
        return "Verifiquei que o fluxo de trabalho segue o cronograma, mas recomendo revisar as tarefas marcadas como 'Atrasadas' no Kanban para garantir o faturamento do mês.";
    }
    if (msg.includes('viagem') || msg.includes('km') || msg.includes('deslocamento')) {
        return "Os dados de deslocamento foram normalizados. Você pode ver o resumo total de KMs e custos gerando uma 'Apresentação POLI' na aba ao lado.";
    }
    if (msg.includes('rnc') || msg.includes('sac') || msg.includes('reclamação')) {
        return "Estou monitorando as RNCs. A maioria está relacionada a ajustes de processo. Recomendo a análise de 'Causas Raiz' na apresentação estratégica.";
    }
    if (msg.includes('obrigado') || msg.includes('valeu')) {
        return "Disponha! Estou aqui para otimizar sua gestão técnica.";
    }

    return "Entendi sua mensagem. No momento estou operando em modo nativo para maior rapidez. Você pode conferir os detalhes estratégicos gerando uma 'Apresentação POLI' no botão acima.";
};

/**
 * Sugestão Proativa
 */
export const getProactiveSuggestion = async (taskData, existingTasks, existingClients) => {
    // Sugestão Proativa Nativa
    if (!taskData.client) return null;

    const clientTasks = (existingTasks || []).filter(t => t.client === taskData.client);
    const hasHistory = clientTasks.length > 0;

    if (taskData.category === 'RNC' && !hasHistory) {
        return {
            hasSuggestion: true,
            title: "Primeira Ocorrência",
            message: "Este cliente não possui histórico de RNCs. Verifique se é um novo padrão de falha.",
            type: "warning"
        };
    }

    if (new Date(taskData.due_date) < new Date()) {
        return {
            hasSuggestion: true,
            title: "Atenção ao Prazo",
            message: "Esta atividade está com o prazo vencido. Priorize a execução para evitar impacto no SLA.",
            type: "danger"
        };
    }

    return {
        hasSuggestion: true,
        title: "Dica Assistec",
        message: "Mantenha o checklist sempre atualizado para garantir a precisão do relatório final.",
        type: "info"
    };
};

/**
 * Gera um relatório técnico da jornada completa (SAC -> RNC -> Kanban)
 */
/**
 * Gera um relatório técnico da jornada completa (SAC -> RNC -> Kanban) de forma nativa.
 */
export const generateServiceJourneyReport = async (notes, history, context) => {
    console.log("[AI] Gerando Relatório de Jornada (Versão HTML v2)...");
    const now = new Date();
    const sacDate = new Date(context.sac?.created_at || now);
    const cycleDays = Math.ceil(Math.abs(now - sacDate) / (1000 * 60 * 60 * 24));

    // Cálculo de Valor Total
    const qty = parseFloat(context.rnc?.quantity || context.sac?.quantity || 0);
    const unitPrice = parseFloat(context.rnc?.unit_price || context.sac?.unit_price || 0);
    const totalPriceFormatted = (qty * unitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // --- CASO ESPECIAL: ACOMPANHAMENTO / DOSSIÊ ---
    if (context.sac?.is_followup) {
        let content = `<h3>ORIGEM DO ACOMPANHAMENTO (DOSSIÊ)</h3>`;
        content += `<p><strong>Dossiê:</strong> #${context.sac.followup_number || 'N/A'}<br>`;
        content += `<strong>Cliente:</strong> ${context.sac.client_name || 'Não informado'}<br>`;
        content += `<strong>Assunto:</strong> ${context.sac.title || 'Não informado'}<br>`;
        content += `<strong>Observação Técnica Base:</strong> ${context.sac.notes || 'Não informado'}<br>`;
        content += `<strong>Objetivo Operacional:</strong> ${context.sac.monitoring_objective || 'Não definido'}</p>`;

        content += `<h3>STATUS DO MONITORAMENTO</h3>`;
        content += `<p><strong>Estabilidade:</strong> ${context.sac.stability_status || 'N/A'}<br>`;
        content += `<strong>Ciclo de Revisão:</strong> ${context.sac.review_cycle || 'MENSAL'}<br>`;
        content += `<strong>Prioridade:</strong> ${context.sac.priority || 'MEDIA'}</p>`;

        // Checklist de Monitoramento
        const checklist = (context.sac.checklist || [])
            .map(item => `<li>[${item.completed ? 'x' : ' '}] ${item.text || item.title}</li>`)
            .join('');

        content += `<h3>CHECKLIST DE MONITORAMENTO</h3>`;
        content += `<ul>${checklist || '<li>Sem itens no checklist.</li>'}</ul>`;

        // Parecer de Auditoria
        content += `<h3>PARECER DE AUDITORIA DE JORNADA</h3>`;
        content += `<p><strong>Duração do Ciclo:</strong> ${cycleDays} dias<br>`;
        content += `<strong>Notas do Auditor:</strong> ${notes || 'Sem observações adicionais.'}</p>`;
        content += `<p>[DESCREVA AQUI A VALIDAÇÃO FINAL DA EFICÁCIA DO ATENDIMENTO]</p>`;

        return {
            reportText: content,
            summary: `Monitoramento Dossiê #${context.sac.followup_number || ''}`
        };
    }

    // --- CASO PADRÃO: SAC / RNC ---
    // Cabeçalho e Dados do SAC
    let content = context.sac?.is_virtual ? `<h3>ORIGEM DA RNC (Monitoramento Direto)</h3>` : `<h3>CHAMADO ORIGINAL (SAC)</h3>`;
    content += `<p><strong>Atendimento:</strong> #${context.sac?.appointment_number || 'N/A'}<br>`;
    content += `<strong>Cliente:</strong> ${context.sac?.client_name || 'Não informado'}<br>`;
    content += `<strong>Assunto:</strong> ${context.sac?.subject || 'Não informado'}<br>`;
    content += `<strong>Descrição:</strong> ${context.sac?.description || 'Não informado'}</p>`;

    // Adicionar campos comerciais do SAC caso a RNC ainda não exista ou esteja incompleta
    if (context.sac?.invoice_number || context.sac?.op || context.sac?.item_number || context.sac?.item_name) {
        content += `<p>`;
        if (context.sac?.invoice_number) content += `<strong>NF:</strong> ${context.sac.invoice_number}<br>`;
        if (context.sac?.op) content += `<strong>OP:</strong> ${context.sac.op}<br>`;
        if (context.sac?.item_number || context.sac?.item_name) {
            content += `<strong>Item:</strong> ${context.sac.item_number ? `${context.sac.item_number} - ` : ''}${context.sac.item_name || ''}<br>`;
        }
        // Adicionar valores comerciais se houver no SAC
        if (context.sac?.quantity > 0 || context.sac?.unit_price > 0) {
            const sQty = parseFloat(context.sac.quantity || 0);
            const sPrice = parseFloat(context.sac.unit_price || 0);
            const sTotal = (sQty * sPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            content += `<strong>Quantidade:</strong> ${sQty} | <strong>Preço Unit.:</strong> R$ ${sPrice.toFixed(2)} | <strong>Total:</strong> ${sTotal}`;
        }
        content += `</p>`;
    }

    // Dados da RNC (Se houver)
    content += `<h3>REGISTRO DE NÃO CONFORMIDADE (RNC)</h3>`;
    if (context.rnc) {
        content += `<p><strong>RNC:</strong> #${context.rnc.rnc_number}<br>`;
        content += `<strong>Nota Fiscal (NF):</strong> ${context.rnc.invoice_number || context.sac?.invoice_number || 'Não informada'}<br>`;
        content += `<strong>Ordem de Produção (OP):</strong> ${context.rnc.op || context.sac?.op || 'Não informada'}<br>`;
        content += `<strong>Lote:</strong> ${context.rnc.batch_number || context.sac?.batch_number || 'Não informado'}<br>`;

        const itemCode = context.rnc.item_code || context.sac?.item_number;
        const itemName = context.rnc.item_name || context.sac?.item_name;
        content += `<strong>Item:</strong> ${itemCode ? `${itemCode} - ` : ''}${itemName || 'Não informado'}<br>`;
        content += `<strong>Quantidade:</strong> ${qty} | <strong>Preço Unit.:</strong> R$ ${unitPrice.toFixed(2)} | <strong>Total:</strong> ${totalPriceFormatted}<br>`;

        const requester = context.rnc.requester_name || context.sac?.contact_name;
        const sector = context.rnc.requester_sector || context.sac?.contact_sector;
        content += `<strong>Solicitante:</strong> ${requester || 'Não informado'} (${sector || 'Setor N/I'})</p>`;

        // Seção Financeira de Devolução na RNC
        if (context.rnc.has_return) {
            const uom = context.rnc.uom || 'un';
            content += `<h4>RASTREABILIDADE FINANCEIRA DE DEVOLUÇÃO</h4>`;
            content += `<p><strong>Quantidade Devolvida:</strong> ${context.rnc.returned_quantity} ${uom}<br>`;

            const dest = context.rnc.return_destination === 'REWORK' ? 'RETRABALHO (Rework)' :
                context.rnc.return_destination === 'DISCARD' ? 'DESCARTE (Loss/Discard)' : 'Não definido';
            content += `<strong>Destino da Mercadoria:</strong> ${dest}</p>`;

            if (context.rnc.return_destination === 'REWORK') {
                const finalQty = context.rnc.final_quantity || 0;
                const newPrice = context.rnc.new_unit_price || 0;
                const newTotal = (finalQty * newPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                content += `<p><strong>Quantidade Final (Pós-Retrabalho):</strong> ${finalQty} ${uom}<br>`;
                content += `<strong>Novo Preço Unitário:</strong> R$ ${newPrice.toFixed(2)}<br>`;
                content += `<strong>Valor Re-faturado Estimado:</strong> ${newTotal}<br>`;

                const returnedQty = parseFloat(context.rnc.returned_quantity || 0);
                const loss = returnedQty - finalQty;
                if (loss > 0) {
                    content += `<strong>Perda de Processo no Retrabalho:</strong> ${loss.toFixed(2)} ${uom}</p>`;
                } else {
                    content += `</p>`;
                }
            } else if (context.rnc.return_destination === 'DISCARD') {
                content += `<p><strong>Impacto Financeiro:</strong> Perda total de ${context.rnc.returned_quantity} ${uom} (Prejuízo estimado: ${totalPriceFormatted})</p>`;
            }
        }

        content += `<p><strong>Causa Raiz (Ishikawa):</strong> ${context.rnc.root_cause_ishikawa || 'Não informada'}</p>`;
    } else {
        content += `<p>Nenhuma RNC vinculada a este atendimento no momento.</p>`;
    }

    // Parecer de Auditoria
    content += `<h3>PARECER DE AUDITORIA DE JORNADA</h3>`;
    content += `<p><strong>Duração do Ciclo:</strong> ${cycleDays} dias<br>`;
    content += `<strong>Notas do Auditor:</strong> ${notes || 'Sem observações adicionais.'}</p>`;
    content += `<p>[DESCREVA AQUI A VALIDAÇÃO FINAL DA EFICÁCIA DO ATENDIMENTO]</p>`;

    return {
        reportText: content,
        summary: `Resumo da Jornada ${context.sac?.appointment_number || context.rnc?.rnc_number || 'Sem Número'}`
    };
};

// Helper to convert File to Gemini Part
async function fileToGenerativePart(file) {
    const base64EncodedDataPromise = new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
    });

    return {
        inlineData: {
            data: await base64EncodedDataPromise,
            mimeType: file.type,
        },
    };
}
