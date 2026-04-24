export const TaskStatus = {
    TO_START: 'TO_START',
    IN_PROGRESS: 'IN_PROGRESS',
    WAITING_CLIENT: 'WAITING_CLIENT',
    CANCELED: 'CANCELED',
    DONE: 'DONE',
};

export const Priority = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
};

export const Category = {
    DEVELOPMENT: 'DEVELOPMENT',
    RNC: 'RNC',
    AFTER_SALES: 'AFTER_SALES',
    TRAINING: 'TRAINING',
    FAIRS: 'FAIRS',
};

export const CategoryLabels = {
    [Category.DEVELOPMENT]: 'Desenvolvimento/Teste/Melhorias',
    [Category.RNC]: 'Atendimento de RNC',
    [Category.AFTER_SALES]: 'Pós Vendas',
    [Category.TRAINING]: 'Treinamentos',
    [Category.FAIRS]: 'Feiras / Eventos',
};

export const STAGES_BY_CATEGORY = {
    [Category.DEVELOPMENT]: ['Extrusão', 'Impressão', 'Laminação', 'Acabamento', 'Faturamento', 'Agendamento de Visita'],
    [Category.RNC]: ['ANÁLISE LABORATORIAL', 'TESTES', 'ACOMPANHAMENTO NO CLIENTE', 'RETORNO AO CLIENTE', 'ANÁLISE DE RETENÇÕES', 'DEFINIÇÃO'],
    [Category.AFTER_SALES]: [],
    [Category.TRAINING]: [],
    [Category.FAIRS]: []
};

export const StatusLabels = {
    [TaskStatus.TO_START]: 'A Iniciar',
    [TaskStatus.IN_PROGRESS]: 'Em Andamento',
    [TaskStatus.WAITING_CLIENT]: 'Aguardando Cliente',
    [TaskStatus.CANCELED]: 'Cancelada',
    [TaskStatus.DONE]: 'Finalizada',
};

export const StatusColors = {
    [TaskStatus.TO_START]: 'bg-slate-100 text-slate-900 border-slate-300 shadow-sm',
    [TaskStatus.IN_PROGRESS]: 'bg-blue-50 text-blue-700 border-blue-200',
    [TaskStatus.WAITING_CLIENT]: 'bg-amber-50 text-amber-700 border-amber-200',
    [TaskStatus.CANCELED]: 'bg-red-50 text-red-700 border-red-200',
    [TaskStatus.DONE]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const PriorityColors = {
    [Priority.LOW]: 'bg-sky-100 text-sky-700',
    [Priority.MEDIUM]: 'bg-orange-100 text-orange-600',
    [Priority.HIGH]: 'bg-red-100 text-red-600',
};

export const StatusBgColors = {
    [TaskStatus.TO_START]: 'bg-slate-100 border-slate-300',
    [TaskStatus.IN_PROGRESS]: 'bg-blue-100 border-blue-300',
    [TaskStatus.WAITING_CLIENT]: 'bg-amber-100 border-amber-300',
    [TaskStatus.CANCELED]: 'bg-red-100 border-red-300',
    [TaskStatus.DONE]: 'bg-emerald-100 border-emerald-300',
};

export const StageStatusLabels = {
    NOT_STARTED: 'Não Iniciada',
    IN_PROGRESS: 'Em Andamento',
    COMPLETED: 'Finalizada',
    DATE_TO_DEFINE: 'A Definir Data',
    DEVOLVIDO: 'Devolvido',
    SOLUCIONADO: 'Solucionado',
    'EM NEGOCIAÇÃO': 'Em Negociação',
    FINALIZADO: 'Finalizado',
    CANCELED: 'Cancelada',
};

export const INITIAL_NATIVE_CATEGORIES = [
    { id: Category.DEVELOPMENT, label: CategoryLabels[Category.DEVELOPMENT], isNative: true, stages: STAGES_BY_CATEGORY[Category.DEVELOPMENT], fields: { op: true, pedido: true, item: true, rnc: false, visitation: true, deadlineMode: 'PRIORITY' } },
    { id: Category.RNC, label: CategoryLabels[Category.RNC], isNative: true, stages: STAGES_BY_CATEGORY[Category.RNC], fields: { op: true, pedido: true, item: true, rnc: true, visitation: false, deadlineMode: 'PRIORITY' } },
    { id: Category.AFTER_SALES, label: CategoryLabels[Category.AFTER_SALES], isNative: true, stages: STAGES_BY_CATEGORY[Category.AFTER_SALES], fields: { op: false, pedido: false, item: false, rnc: false, visitation: false, deadlineMode: 'DATE' } },
    { id: Category.TRAINING, label: CategoryLabels[Category.TRAINING], isNative: true, stages: STAGES_BY_CATEGORY[Category.TRAINING], fields: { op: false, pedido: false, item: false, rnc: false, visitation: false, deadlineMode: 'DATE' } },
    { id: Category.FAIRS, label: CategoryLabels[Category.FAIRS], isNative: true, stages: STAGES_BY_CATEGORY[Category.FAIRS], fields: { op: false, pedido: false, item: false, rnc: false, visitation: false, deadlineMode: 'DATE' } }
];
