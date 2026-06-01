import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, Image as ImageIcon, Trash2, Star, CheckCircle, AlertCircle, Eye, Download } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import imageCompression from 'browser-image-compression';

const ProductAttachmentsModal = ({ isOpen, onClose, product, onProductUpdated }) => {
    const [mediaUrls, setMediaUrls] = useState([]);
    const [coverUrl, setCoverUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen && product) {
            setMediaUrls(product.media_urls || []);
            setCoverUrl(product.cover_url || null);
            setError(null);
        }
    }, [isOpen, product]);

    if (!isOpen || !product) return null;

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        setIsUploading(true);
        setError(null);
        
        try {
            const newUrls = [...mediaUrls];
            
            for (const file of files) {
                let fileToUpload = file;
                const isImage = file.type.startsWith('image/');
                
                // Validate size (max 5MB if not image, images will be compressed)
                if (!isImage && file.size > 5 * 1024 * 1024) {
                    throw new Error(`O arquivo ${file.name} excede o limite de 5MB.`);
                }
                
                // Compress image
                if (isImage) {
                    const options = {
                        maxSizeMB: 1,
                        maxWidthOrHeight: 1200,
                        useWebWorker: true
                    };
                    try {
                        fileToUpload = await imageCompression(file, options);
                    } catch (err) {
                        console.error("Erro na compressão:", err);
                    }
                }
                
                const fileExt = fileToUpload.name.split('.').pop();
                const fileName = `${product.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `client-items/${fileName}`;
                
                const { error: uploadError, data } = await supabase.storage
                    .from('assistec-media') // Assumindo bucket existente
                    .upload(filePath, fileToUpload);
                    
                if (uploadError) throw uploadError;
                
                const { data: publicUrlData } = supabase.storage
                    .from('assistec-media')
                    .getPublicUrl(filePath);
                    
                newUrls.push(publicUrlData.publicUrl);
            }
            
            // Save to database
            const { error: dbError } = await supabase
                .from('client_products')
                .update({ media_urls: newUrls })
                .eq('id', product.id);
                
            if (dbError) throw dbError;
            
            setMediaUrls(newUrls);
            if (onProductUpdated) {
                onProductUpdated({ ...product, media_urls: newUrls, cover_url: coverUrl });
            }
        } catch (err) {
            console.error(err);
            setError(err.message || 'Erro ao enviar o arquivo.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSetCover = async (url) => {
        try {
            const newCover = coverUrl === url ? null : url; // Toggle
            const { error: dbError } = await supabase
                .from('client_products')
                .update({ cover_url: newCover })
                .eq('id', product.id);
                
            if (dbError) throw dbError;
            
            setCoverUrl(newCover);
            if (onProductUpdated) {
                onProductUpdated({ ...product, media_urls: mediaUrls, cover_url: newCover });
            }
        } catch (err) {
            console.error(err);
            setError('Erro ao definir a capa.');
        }
    };

    const handleDelete = async (urlToDelete) => {
        if (!window.confirm('Tem certeza que deseja excluir este anexo?')) return;
        
        try {
            // Extract filepath from URL
            const urlObj = new URL(urlToDelete);
            const pathSegments = urlObj.pathname.split('/');
            const bucketIndex = pathSegments.indexOf('assistec-media');
            const filePath = pathSegments.slice(bucketIndex + 1).join('/');
            
            // Delete from storage
            if (filePath) {
                await supabase.storage.from('assistec-media').remove([filePath]);
            }
            
            const newUrls = mediaUrls.filter(u => u !== urlToDelete);
            const newCover = coverUrl === urlToDelete ? null : coverUrl;
            
            const { error: dbError } = await supabase
                .from('client_products')
                .update({ 
                    media_urls: newUrls,
                    cover_url: newCover
                })
                .eq('id', product.id);
                
            if (dbError) throw dbError;
            
            setMediaUrls(newUrls);
            setCoverUrl(newCover);
            
            if (onProductUpdated) {
                onProductUpdated({ ...product, media_urls: newUrls, cover_url: newCover });
            }
        } catch (err) {
            console.error(err);
            setError('Erro ao excluir o arquivo.');
        }
    };
    
    const isImageUrl = (url) => {
        return url.match(/\.(jpeg|jpg|gif|png|webp|bmp)(\?.*)?$/i);
    };

    return (
        <div className="fixed inset-0 z-[999] bg-slate-900/50 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-5 border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Anexos do Item</h2>
                        <p className="text-xs text-slate-500 uppercase font-semibold">{product.product_name}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-5 flex-1 overflow-y-auto">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm border border-red-200">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}
                    
                    {/* Upload Zone */}
                    <div className="mb-6">
                        <input
                            type="file"
                            multiple
                            accept="image/*,application/pdf"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            disabled={isUploading}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors ${
                                isUploading ? 'border-slate-300 bg-slate-50 opacity-70' : 'border-brand-300 hover:border-brand-500 hover:bg-brand-50 bg-slate-50'
                            }`}
                        >
                            {isUploading ? (
                                <>
                                    <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mb-3"></div>
                                    <span className="text-sm font-bold text-brand-700">Enviando e Comprimindo...</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={32} className="text-brand-500 mb-2" />
                                    <span className="text-sm font-bold text-slate-700">Clique para adicionar anexos</span>
                                    <span className="text-xs text-slate-500 mt-1">Imagens (JPG, PNG) e Documentos (PDF)</span>
                                </>
                            )}
                        </button>
                    </div>
                    
                    {/* Attachments Gallery */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase flex items-center gap-2">
                            <ImageIcon size={16} /> Arquivos Anexados ({mediaUrls.length})
                        </h3>
                        
                        {mediaUrls.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 text-sm">
                                Nenhum arquivo anexado a este item ainda.
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {mediaUrls.map((url, idx) => {
                                    const isImg = isImageUrl(url);
                                    const isCover = coverUrl === url;
                                    
                                    return (
                                        <div key={idx} className={`relative group rounded-xl border-2 overflow-hidden bg-slate-100 aspect-square flex flex-col ${isCover ? 'border-amber-400' : 'border-slate-200'}`}>
                                            {isImg ? (
                                                <img src={url} alt={`Anexo ${idx}`} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-4">
                                                    <FileText size={32} className="mb-2" />
                                                    <span className="text-[10px] font-bold text-center break-all">
                                                        Documento PDF
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {/* Hover Actions */}
                                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-2">
                                                <div className="flex gap-2">
                                                    <a href={url} target="_blank" rel="noreferrer" className="bg-white/20 hover:bg-white text-white hover:text-slate-900 p-2 rounded-full transition-colors" title="Visualizar / Baixar">
                                                        {isImg ? <Eye size={18} /> : <Download size={18} />}
                                                    </a>
                                                    {isImg && (
                                                        <button onClick={() => handleSetCover(url)} className={`p-2 rounded-full transition-colors ${isCover ? 'bg-amber-500 text-white' : 'bg-white/20 hover:bg-white text-white hover:text-amber-500'}`} title={isCover ? 'Remover Capa' : 'Definir como Capa'}>
                                                            <Star size={18} className={isCover ? "fill-current" : ""} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDelete(url)} className="bg-white/20 hover:bg-red-500 text-white p-2 rounded-full transition-colors" title="Excluir">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {isCover && (
                                                <div className="absolute top-2 right-2 bg-amber-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1 shadow-md">
                                                    <Star size={10} className="fill-current" /> Capa
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductAttachmentsModal;
