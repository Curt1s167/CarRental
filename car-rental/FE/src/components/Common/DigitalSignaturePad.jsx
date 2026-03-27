import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaTrash, FaCheck, FaUndo } from 'react-icons/fa';

/**
 * Digital Signature Pad Component
 * Allows users to sign using mouse/touch input
 */
const DigitalSignaturePad = ({ 
  onSignatureChange, 
  onSave,
  disabled = false,
  signedData = null // Pre-filled signature data
}) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState(signedData);
  const [hasSignature, setHasSignature] = useState(!!signedData);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width - 20;
    canvas.height = 200;

    // Set up context
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';

    // Draw existing signature if provided
    if (signedData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = signedData;
    }
  }, [signedData]);

  const startDrawing = (e) => {
    if (disabled || hasSignature) return;

    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing || disabled || hasSignature) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
    setHasSignature(false);
    onSignatureChange(null);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    const data = canvas.toDataURL('image/png');
    setSignatureData(data);
    setHasSignature(true);
    onSignatureChange(data);
    if (onSave) onSave(data);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-2 border-dashed border-emerald-300 rounded-lg p-4 bg-emerald-50"
    >
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          ✍️ Ký điện tử của bạn
        </h4>
        <p className="text-xs text-gray-500 mb-3">
          Vui lòng ký tên của bạn trong khung dưới đây
        </p>
      </div>

      <canvas
        ref={canvasRef}
        className={`w-full border-2 border-gray-300 rounded-lg bg-white cursor-crosshair transition-all ${
          disabled || hasSignature ? 'opacity-75 cursor-not-allowed' : 'hover:border-emerald-500'
        }`}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        style={{ height: '200px' }}
      />

      {hasSignature && signatureData && (
        <div className="mt-3 p-3 bg-emerald-100 border border-emerald-200 rounded-lg">
          <p className="text-xs text-emerald-700 font-semibold mb-2">
            ✓ Chữ ký đã được lưu
          </p>
          <img src={signatureData} alt="Chữ ký" className="max-h-24 mx-auto" />
        </div>
      )}

      <div className="flex gap-2 mt-4 justify-end">
        {hasSignature ? (
          <button
            onClick={clearSignature}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <FaUndo /> Ký lại
          </button>
        ) : (
          <>
            <button
              onClick={clearSignature}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <FaTrash /> Xóa
            </button>
            <button
              onClick={saveSignature}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <FaCheck /> Lưu chữ ký
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default DigitalSignaturePad;
