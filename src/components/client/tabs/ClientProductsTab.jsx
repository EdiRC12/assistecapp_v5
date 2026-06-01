import React from 'react';
import { Package, Plus, Trash2, Boxes, Paperclip, Image as ImageIcon } from 'lucide-react';
import DashboardCard from '../DashboardCard';
import useIsMobile from '../../../hooks/useIsMobile';
import ProductAttachmentsModal from '../ProductAttachmentsModal';

const ClientProductsTab = ({
    clientProducts,
    loadingProducts,
    isAddingProduct,
    setIsAddingProduct,
    newProductName,
    setNewProductName,
    handleAddProduct,
    handleDeleteProduct
}) => {
    const isMobile = useIsMobile();
    const [localProducts, setLocalProducts] = React.useState([]);
    const [selectedProduct, setSelectedProduct] = React.useState(null);

    React.useEffect(() => {
        setLocalProducts(clientProducts);
    }, [clientProducts]);

    const handleProductUpdated = (updatedProduct) => {
        setLocalProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    };

    return (
        <DashboardCard title="Catálogo de Itens do Cliente" icon={Package}>
            <div className="space-y-4">
                <div className="flex justify-between items-center bg-brand-50 p-4 rounded-xl border border-brand-100 mb-6">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-brand-700 uppercase">Itens Vinculados</span>
                        <span className="text-[10px] md:text-xs text-slate-500">
                            Estes produtos são auto-cadastrados ao preencher novos Testes, Ocorrências, Devoluções ou Tarefas.
                        </span>
                    </div>
                    {!isAddingProduct && (
                        <button
                            onClick={() => setIsAddingProduct(true)}
                            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-brand-500 flex items-center gap-1 shadow-md shadow-brand-200 whitespace-nowrap"
                        >
                            <Plus size={16} /> NOVO ITEM
                        </button>
                    )}
                </div>

                {isAddingProduct && (
                    <form onSubmit={handleAddProduct} className="bg-white p-6 rounded-2xl border-2 border-brand-200 shadow-xl animate-in zoom-in-95 duration-200 mb-8 max-w-xl">
                        <h4 className="text-sm font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
                            <Plus size={16} className="text-brand-600" /> Cadastrar Novo Item Manualmente
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">Nome do Item / Produto</label>
                                <input
                                    type="text"
                                    placeholder="Ex: BOBINA PLÁSTICA 50X60 PP *"
                                    value={newProductName}
                                    onChange={(e) => setNewProductName(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 uppercase"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddingProduct(false);
                                    setNewProductName('');
                                }}
                                className="px-4 py-2 text-slate-400 font-bold uppercase text-xs hover:text-slate-600 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="bg-brand-600 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase shadow-lg shadow-brand-200 hover:bg-brand-500 transition-all"
                            >
                                Adicionar ao Catálogo
                            </button>
                        </div>
                    </form>
                )}

                {loadingProducts ? (
                    <div className="py-20 text-center text-slate-400">
                        <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-brand-600 rounded-full mb-2" role="status">
                            <span className="sr-only">Carregando...</span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Carregando catálogo de produtos...</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 w-full">
                        {localProducts.map(prod => (
                            <div
                                key={prod.id}
                                className="group relative bg-white border border-slate-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-lg transition-all flex items-center justify-between w-full gap-4"
                            >
                                <div className="flex items-center sm:items-start gap-4 flex-1 min-w-0">
                                    {prod.cover_url ? (
                                        <div className="w-20 h-20 sm:w-40 sm:h-32 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 shadow-md">
                                            <img src={prod.cover_url} alt="Capa" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-brand-50 text-brand-600 rounded-xl flex-shrink-0 mt-1">
                                            <Boxes size={24} />
                                        </div>
                                    )}
                                    <div className="flex flex-col min-w-0 flex-1 pt-1">
                                        <span className="font-bold text-slate-800 text-xs sm:text-sm md:text-base uppercase break-words leading-snug flex flex-wrap items-center gap-2">
                                            {prod.product_name}
                                            {prod.media_urls && prod.media_urls.length > 0 && (
                                                <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded-md flex items-center gap-1 font-bold shadow-sm whitespace-nowrap">
                                                    <Paperclip size={12} /> {prod.media_urls.length}
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-medium mt-0.5">
                                            Adicionado em {new Date(prod.created_at).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setSelectedProduct(prod)}
                                        className="bg-slate-50 text-slate-400 p-2 rounded-lg hover:bg-brand-50 hover:text-brand-600 transition-all opacity-100 lg:opacity-0 group-hover:opacity-100 flex-shrink-0"
                                        title="Anexos e Capa"
                                    >
                                        <Paperclip size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteProduct(prod.id)}
                                        className="bg-red-50 text-red-400 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-all opacity-100 lg:opacity-0 group-hover:opacity-100 flex-shrink-0"
                                        title="Remover item deste cliente"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {clientProducts.length === 0 && !isAddingProduct && (
                            <div className="col-span-full py-20 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <Package className="mx-auto text-slate-300 mb-3" size={36} />
                                <p className="text-slate-400 italic text-sm">Nenhum produto cadastrado para este cliente.</p>
                                <p className="text-slate-400 text-xs mt-1">Crie testes, ocorrências, devoluções ou adicione um item manualmente acima para começar.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ProductAttachmentsModal 
                isOpen={!!selectedProduct} 
                onClose={() => setSelectedProduct(null)} 
                product={selectedProduct} 
                onProductUpdated={handleProductUpdated} 
            />
        </DashboardCard>
    );
};

export default ClientProductsTab;
