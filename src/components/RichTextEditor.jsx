import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

/**
 * RichTextEditor Component
 * A wrapper for ReactQuill with custom styling and toolbar.
 */
const RichTextEditor = ({ value, onChange, disabled, placeholder, minHeight = "400px" }) => {
    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ],
    };

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'list', 'bullet'
    ];

    return (
        <div className="rich-text-editor-container">
            <style>{`
                .rich-text-editor-container .ql-container {
                    border-bottom-left-radius: 0.75rem;
                    border-bottom-right-radius: 0.75rem;
                    background-color: #f8fafc;
                    min-height: ${minHeight};
                    font-family: inherit;
                    font-size: 0.875rem;
                }
                .rich-text-editor-container .ql-toolbar {
                    border-top-left-radius: 0.75rem;
                    border-top-right-radius: 0.75rem;
                    background-color: white;
                    border-color: #f1f5f9;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                .rich-text-editor-container .ql-editor {
                    min-height: ${minHeight};
                    line-height: 1.6;
                    color: #334155;
                }
                .rich-text-editor-container .ql-editor.ql-blank::before {
                    color: #94a3b8;
                    font-style: normal;
                }
                .rich-text-editor-container .ql-snow .ql-stroke {
                    stroke: #64748b;
                }
                .rich-text-editor-container .ql-snow .ql-fill {
                    fill: #64748b;
                }
                .rich-text-editor-container .ql-snow.ql-toolbar button:hover .ql-stroke {
                    stroke: #0ea5e9;
                }
                .rich-text-editor-container .ql-snow.ql-toolbar button.ql-active .ql-stroke {
                    stroke: #0ea5e9;
                }
                .rich-text-editor-container .ql-container.ql-snow {
                    border-color: #f1f5f9;
                }
                .rich-text-editor-container .ql-editor strong {
                    font-weight: 900;
                }
                
                /* Ajustes para o modo desabilitado */
                .rich-text-editor-container.is-disabled .ql-toolbar {
                    display: none;
                }
                .rich-text-editor-container.is-disabled .ql-container {
                    border-radius: 0.75rem;
                    border: 2px solid #f1f5f9;
                }
            `}</style>
            <div className={disabled ? 'is-disabled' : ''}>
                <ReactQuill
                    theme="snow"
                    value={value || ''}
                    onChange={onChange}
                    modules={modules}
                    formats={formats}
                    readOnly={disabled}
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
};

export default RichTextEditor;
