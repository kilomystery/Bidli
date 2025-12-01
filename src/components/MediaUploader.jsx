// src/components/MediaUploader.jsx
import React, { useState, useRef } from 'react';

const MediaUploader = ({ 
  onFileSelect, 
  file = null, 
  accept = "image/*,video/*", 
  className = "",
  placeholder = "Aggiungi foto o video"
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOut = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    // Validate file type
    const validTypes = accept.split(',').map(type => type.trim());
    const isValid = validTypes.some(type => {
      if (type === 'image/*') return selectedFile.type.startsWith('image/');
      if (type === 'video/*') return selectedFile.type.startsWith('video/');
      return selectedFile.type === type;
    });

    if (!isValid) {
      alert('Tipo di file non supportato. Scegli un\'immagine o un video.');
      return;
    }

    // Validate file size (50MB max)
    if (selectedFile.size > 50 * 1024 * 1024) {
      alert('File troppo grande. Massimo 50MB.');
      return;
    }

    onFileSelect(selectedFile);
  };

  const handleInputChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const removeFile = () => {
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`media-uploader ${className}`}>
      {!file ? (
        // Upload Area
        <div
          onDrag={handleDrag}
          onDragStart={handleDrag}
          onDragEnd={handleDrag}
          onDragOver={handleDrag}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? '#0095f6' : '#dbdbdb'}`,
            borderRadius: 12,
            padding: 40,
            textAlign: 'center',
            cursor: 'pointer',
            background: isDragging ? '#f8f9fa' : '#fafafa',
            transition: 'all 0.2s ease',
            minHeight: 120,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12
          }}
        >
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#40e0d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path 
                d="M14.5 4H6A2 2 0 0 0 4 6V18A2 2 0 0 0 6 20H18A2 2 0 0 0 20 18V9.5L14.5 4Z" 
                stroke="white" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <polyline points="14,4 14,9 19,9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <div>
            <div style={{ 
              fontSize: 16, 
              fontWeight: 600, 
              color: '#262626',
              marginBottom: 4
            }}>
              {placeholder}
            </div>
            <div style={{ 
              fontSize: 14, 
              color: '#8e8e8e' 
            }}>
              Trascina qui i file oppure clicca per selezionare
            </div>
            <div style={{ 
              fontSize: 12, 
              color: '#c7c7c7',
              marginTop: 8
            }}>
              JPG, PNG, GIF, MP4, WebM (max 50MB)
            </div>
          </div>
        </div>
      ) : (
        // File Preview
        <div style={{
          border: '1px solid #dbdbdb',
          borderRadius: 12,
          overflow: 'hidden',
          background: '#fff'
        }}>
          {/* Preview Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #efefef',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: file.type.startsWith('video/') ? '#ff4757' : '#0095f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 14,
                fontWeight: 'bold'
              }}>
                {file.type.startsWith('video/') ? '🎥' : '📷'}
              </div>
              <div>
                <div style={{ 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: '#262626',
                  wordBreak: 'break-all'
                }}>
                  {file.name}
                </div>
                <div style={{ 
                  fontSize: 12, 
                  color: '#8e8e8e' 
                }}>
                  {formatFileSize(file.size)}
                </div>
              </div>
            </div>
            
            <button
              onClick={removeFile}
              style={{
                background: 'none',
                border: 'none',
                color: '#ed4956',
                cursor: 'pointer',
                fontSize: 18,
                padding: 4,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Rimuovi file"
            >
              ✕
            </button>
          </div>

          {/* File Preview */}
          {file.type.startsWith('image/') && (
            <div style={{ 
              padding: 16,
              textAlign: 'center'
            }}>
              <img
                src={URL.createObjectURL(file)}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: 200,
                  borderRadius: 8,
                  objectFit: 'cover'
                }}
              />
            </div>
          )}

          {file.type.startsWith('video/') && (
            <div style={{ 
              padding: 16,
              textAlign: 'center'
            }}>
              <video
                src={URL.createObjectURL(file)}
                controls
                style={{
                  maxWidth: '100%',
                  maxHeight: 200,
                  borderRadius: 8
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default MediaUploader;