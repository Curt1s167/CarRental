import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  FaFileContract, FaArrowRight, FaArrowLeft, FaCheck, FaTimes, FaSpinner,
  FaEye, FaDownload, FaPrint, FaSignature, FaCreditCard, FaHome,
  FaUser, FaCar, FaCalendarAlt, FaMoneyBillWave, FaShieldAlt,
  FaPhone, FaEnvelope, FaMapMarkerAlt, FaIdCard
} from 'react-icons/fa';

import { getContractForReview, signAndPay, getContractById } from '@/services/api';
import { generateContractHTML, formatCurrency, formatDate, downloadHTML, generatePDF, numberToWords } from '@/utils/contractUtils';
const StripePayment = lazy(() => import('@/components/features/payments/StripePayment'));
import SignatureModal, { SignatureDisplay } from '@/components/common/SignatureModal';

/**
 * Contract Signing and Payment Page
 * Full flow: Preview → Sign → Pay → Confirmation
 */
const ContractSigningPage = () => {
  const { contractId } = useParams();
  const navigate = useNavigate();

  // State management
  const [step, setStep] = useState('preview'); // preview, signature, payment, confirmation
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contractData, setContractData] = useState(null);
  const [signature, setSignature] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const contractRef = useRef(null);

  const steps = ['preview', 'signature', 'payment', 'confirmation'];
  const stepLabels = { preview: 'Xem hợp đồng', signature: 'Ký hợp đồng', payment: 'Thanh toán', confirmation: 'Hoàn tất' };
  const stepIcons = { preview: <FaEye />, signature: <FaSignature />, payment: <FaCreditCard />, confirmation: <FaCheck /> };

  // Load contract data
  useEffect(() => {
    loadContractData();
  }, [contractId]);

  const loadContractData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Try review endpoint first, then fallback to getContractById
      let data;
      try {
        data = await getContractForReview(contractId);
      } catch {
        const res = await getContractById(contractId);
        data = res?.data ?? res;
      }
      setContractData(data);

      // If already signed and paid, jump to confirmation
      if (data?.customerSignature && data?.paymentInfo?.paymentStatus === 'completed') {
        setStep('confirmation');
        setSignature(data.customerSignature);
      } else if (data?.customerSignature) {
        // Already signed, skip to payment
        setSignature(data.customerSignature);
        setStep('payment');
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err.message || 'Không thể tải hợp đồng';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignature = (signatureBase64) => {
    setSignature(signatureBase64);
    setShowSignModal(false);
    toast.success('Chữ ký đã được lưu! ✍️');
  };

  const handleNextStep = () => {
    if (step === 'preview') {
      setStep('signature');
    } else if (step === 'signature') {
      if (!signature) {
        toast.error('Vui lòng ký tên trước khi tiếp tục');
        return;
      }
      setStep('payment');
    }
  };

  const handlePrevStep = () => {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  const handlePayment = async (paymentIntent) => {
    try {
      setProcessingPayment(true);
      const formData = contractData?.formData || contractData;
      const totalAmount = (formData?.totalFare || 0) - (formData?.appliedDiscount || 0) + (formData?.lateFeeAmount || 0);

      const result = await signAndPay(
        contractId,
        signature,
        paymentMethod,
        totalAmount
      );

      toast.success('Ký hợp đồng và thanh toán thành công! 🎉');
      setContractData(result);
      setStep('confirmation');
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Thanh toán thất bại');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCashPayment = async () => {
    await handlePayment(null);
  };

  const handleExportPDF = async () => {
    setPdfLoading(true);
    try {
      const htmlContent = generateContractHTML(buildContractForHTML());
      const element = document.createElement('div');
      element.innerHTML = htmlContent;
      document.body.appendChild(element);

      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set({
        margin: [10, 10, 10, 10],
        filename: `HopDong_${contractData?.contractCode || contractId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(element).save();

      document.body.removeChild(element);
      toast.success('Tải PDF thành công!');
    } catch (err) {
      toast.error('Không thể tạo PDF: ' + err.message);
      // Fallback: open in new window
      try {
        const htmlContent = generateContractHTML(buildContractForHTML());
        const win = window.open('', '_blank');
        win.document.write(htmlContent);
        win.document.close();
        win.print();
      } catch { }
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadHTML = () => {
    try {
      downloadHTML(buildContractForHTML(), `HopDong_${contractData?.contractCode || contractId}.html`);
      toast.success('Tải HTML thành công!');
    } catch (err) {
      toast.error('Không thể tải HTML');
    }
  };

  // Build contract object for HTML generation
  const buildContractForHTML = () => {
    const fd = contractData?.formData || contractData;
    return {
      contractCode: contractData?.contractCode || '',
      formData: {
        supplierName: fd?.supplierName || '',
        supplierPhone: fd?.supplierPhone || '',
        supplierEmail: fd?.supplierEmail || '',
        supplierAddress: fd?.supplierAddress || '',
        supplierNationalId: fd?.supplierNationalId || '',
        customerName: fd?.customerName || '',
        customerPhone: fd?.customerPhone || '',
        customerEmail: fd?.customerEmail || '',
        customerAddress: fd?.customerAddress || '',
        customerNationalId: fd?.customerNationalId || '',
        customerDrivingLicense: fd?.customerDrivingLicense || '',
        carBrand: fd?.carBrand || '',
        carModel: fd?.carModel || '',
        licensePlate: fd?.licensePlate || '',
        carYear: fd?.carYear || '',
        carSeats: fd?.carSeats || '',
        carColor: fd?.carColor || '',
        carTransmission: fd?.carTransmission || '',
        carFuelType: fd?.carFuelType || '',
        startDate: fd?.startDate || '',
        endDate: fd?.endDate || '',
        totalDays: fd?.totalDays || 0,
        pickupLocation: fd?.pickupLocation || '',
        dropoffLocation: fd?.dropoffLocation || '',
        dailyRate: fd?.dailyRate || 0,
        totalFare: fd?.totalFare || 0,
        depositAmount: fd?.depositAmount || 0,
        appliedDiscount: fd?.appliedDiscount || 0,
        lateFeeAmount: fd?.lateFeeAmount || 0,
      },
      terms: contractData?.terms || contractData?.termsAndConditions || '',
      customerSignature: signature || contractData?.customerSignature || null,
      supplierSignature: contractData?.supplierSignature || null,
      paymentInfo: contractData?.paymentInfo || null,
    };
  };

  const fd = contractData?.formData || contractData || {};
  const totalAmount = (fd?.totalFare || 0) - (fd?.appliedDiscount || 0) + (fd?.lateFeeAmount || 0);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="text-center">
          <FaSpinner className="text-5xl text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Đang tải hợp đồng...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-white rounded-2xl shadow-xl p-8">
          <FaTimes className="text-5xl text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Lỗi tải hợp đồng</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-semibold">
            <FaHome className="inline mr-2" /> Quay về trang chủ
          </button>
        </div>
      </div>
    );
  }

  if (!contractData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-cyan-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* ══ Header ══ */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl shadow-lg shadow-emerald-200">
              <FaFileContract className="text-white text-3xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Ký Hợp Đồng & Thanh Toán</h1>
              <p className="text-gray-500">Mã hợp đồng: <span className="font-mono font-bold text-emerald-700">{contractData.contractCode}</span></p>
            </div>
          </div>

          {/* ── Progress Steps ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              {steps.map((s, idx) => {
                const currentIdx = steps.indexOf(step);
                const isCompleted = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <React.Fragment key={s}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-sm ${
                        isCurrent ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white scale-110 shadow-emerald-200 shadow-lg'
                          : isCompleted ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {isCompleted ? <FaCheck /> : stepIcons[s]}
                      </div>
                      <span className={`text-sm font-semibold hidden md:block ${
                        isCurrent ? 'text-emerald-700' : isCompleted ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {stepLabels[s]}
                      </span>
                    </div>
                    {idx < steps.length - 1 && (
                      <div className={`flex-1 h-1 mx-4 rounded-full transition-all ${
                        idx < currentIdx ? 'bg-green-400' : 'bg-gray-200'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ══ Main Content ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: Main ── */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">

              {/* ═══ Step 1: Preview ═══ */}
              {step === 'preview' && (
                <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden">

                  <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                      <FaEye /> Xem trước Hợp đồng
                    </h2>
                    <p className="text-emerald-100 text-sm mt-1">Vui lòng đọc kỹ nội dung hợp đồng trước khi ký</p>
                  </div>

                  <div className="p-6">
                    {/* ── Thông tin Bên A & Bên B ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-3 text-sm"><FaUser /> BÊN A - BÊN CHO THUÊ</h4>
                        <div className="space-y-1.5 text-sm">
                          <p><span className="text-gray-500">Họ tên:</span> <span className="font-semibold">{fd.supplierName || '—'}</span></p>
                          <p><span className="text-gray-500">SĐT:</span> <span className="font-medium">{fd.supplierPhone || '—'}</span></p>
                          <p><span className="text-gray-500">Email:</span> <span className="font-medium">{fd.supplierEmail || '—'}</span></p>
                          <p><span className="text-gray-500">Địa chỉ:</span> <span className="font-medium">{fd.supplierAddress || '—'}</span></p>
                          <p><span className="text-gray-500">CCCD:</span> <span className="font-medium">{fd.supplierNationalId || '—'}</span></p>
                        </div>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                        <h4 className="font-bold text-emerald-800 flex items-center gap-2 mb-3 text-sm"><FaUser /> BÊN B - BÊN THUÊ</h4>
                        <div className="space-y-1.5 text-sm">
                          <p><span className="text-gray-500">Họ tên:</span> <span className="font-semibold">{fd.customerName || '—'}</span></p>
                          <p><span className="text-gray-500">SĐT:</span> <span className="font-medium">{fd.customerPhone || '—'}</span></p>
                          <p><span className="text-gray-500">Email:</span> <span className="font-medium">{fd.customerEmail || '—'}</span></p>
                          <p><span className="text-gray-500">Địa chỉ:</span> <span className="font-medium">{fd.customerAddress || '—'}</span></p>
                          <p><span className="text-gray-500">CCCD:</span> <span className="font-medium">{fd.customerNationalId || '—'}</span></p>
                          <p><span className="text-gray-500">GPLX:</span> <span className="font-medium">{fd.customerDrivingLicense || '—'}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* ── Xe ── */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-6">
                      <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-3 text-sm"><FaCar className="text-blue-600" /> THÔNG TIN XE</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><p className="text-gray-500">Nhãn hiệu</p><p className="font-semibold">{fd.carBrand} {fd.carModel}</p></div>
                        <div><p className="text-gray-500">Biển số</p><p className="font-semibold">{fd.licensePlate || '—'}</p></div>
                        <div><p className="text-gray-500">Năm SX</p><p className="font-semibold">{fd.carYear || '—'}</p></div>
                        <div><p className="text-gray-500">Màu sắc</p><p className="font-semibold">{fd.carColor || '—'}</p></div>
                        <div><p className="text-gray-500">Số chỗ</p><p className="font-semibold">{fd.carSeats || '—'}</p></div>
                        <div><p className="text-gray-500">Hộp số</p><p className="font-semibold">{fd.carTransmission || '—'}</p></div>
                        <div><p className="text-gray-500">Nhiên liệu</p><p className="font-semibold">{fd.carFuelType || '—'}</p></div>
                      </div>
                    </div>

                    {/* ── Thời gian ── */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-6">
                      <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-3 text-sm"><FaCalendarAlt className="text-indigo-600" /> THỜI GIAN & ĐỊA ĐIỂM</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-gray-500">Nhận xe</p><p className="font-semibold">{formatDate(fd.startDate)}</p></div>
                        <div><p className="text-gray-500">Trả xe</p><p className="font-semibold">{formatDate(fd.endDate)}</p></div>
                        <div><p className="text-gray-500">Tổng ngày</p><p className="font-semibold text-blue-700">{fd.totalDays} ngày</p></div>
                        <div><p className="text-gray-500">Địa điểm nhận</p><p className="font-semibold">{fd.pickupLocation || '—'}</p></div>
                        <div><p className="text-gray-500">Địa điểm trả</p><p className="font-semibold">{fd.dropoffLocation || '—'}</p></div>
                      </div>
                    </div>

                    {/* ── Contract HTML Preview ── */}
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-800 text-sm mb-3">📄 Nội dung hợp đồng đầy đủ</h4>
                      <div className="bg-white rounded-xl border-2 border-gray-200 h-[500px] overflow-hidden shadow-inner">
                        <iframe
                          title="Contract Preview"
                          srcDoc={generateContractHTML(buildContractForHTML())}
                          className="w-full h-full border-none"
                        />
                      </div>
                    </div>

                    {/* ── Action buttons ── */}
                    <div className="flex flex-wrap gap-3 mb-6">
                      <button onClick={handleExportPDF} disabled={pdfLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition text-sm font-medium border border-red-200">
                        {pdfLoading ? <FaSpinner className="animate-spin" /> : <FaDownload />} Tải PDF
                      </button>
                      <button onClick={handleDownloadHTML}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition text-sm font-medium border border-blue-200">
                        <FaDownload /> Tải HTML
                      </button>
                      <button onClick={() => { const w = window.open('', '_blank'); w.document.write(generateContractHTML(buildContractForHTML())); w.document.close(); w.print(); }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition text-sm font-medium border border-gray-200">
                        <FaPrint /> In hợp đồng
                      </button>
                    </div>

                    <button onClick={handleNextStep}
                      className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition flex items-center justify-center gap-3 shadow-lg shadow-emerald-200 text-lg">
                      Tiếp tục ký hợp đồng <FaArrowRight />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ═══ Step 2: Signature ═══ */}
              {step === 'signature' && (
                <motion.div key="signature" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden">

                  <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                      <FaSignature /> Ký Hợp Đồng Điện Tử
                    </h2>
                    <p className="text-indigo-100 text-sm mt-1">Chữ ký sẽ được lưu trữ có giá trị pháp lý</p>
                  </div>

                  <div className="p-6">
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-amber-800 text-sm flex items-center gap-2">
                        <FaShieldAlt className="text-amber-600 flex-shrink-0" />
                        <span><strong>Lưu ý:</strong> Chữ ký điện tử theo quy định pháp luật Việt Nam có giá trị pháp lý tương đương chữ ký tay. Vui lòng ký tên đầy đủ.</span>
                      </p>
                    </div>

                    {/* Signature area */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      {/* Bên A */}
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
                        <p className="font-bold text-blue-800 text-sm mb-1">BÊN A - BÊN CHO THUÊ</p>
                        <p className="text-xs text-gray-500 mb-3">(Ký và ghi rõ họ tên)</p>
                        <SignatureDisplay
                          signature={contractData?.supplierSignature}
                          label={fd.supplierName || 'Chủ xe'}
                          signed={!!contractData?.supplierSignature || !!contractData?.signedBySupplier}
                        />
                      </div>
                      {/* Bên B */}
                      <div className={`border rounded-xl p-5 text-center ${signature ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                        <p className="font-bold text-gray-800 text-sm mb-1">BÊN B - BÊN THUÊ (Bạn)</p>
                        <p className="text-xs text-gray-500 mb-3">(Ký và ghi rõ họ tên)</p>
                        {signature ? (
                          <div>
                            <img src={signature} alt="Chữ ký" className="max-h-24 mx-auto border-b-2 border-gray-300 pb-2 mb-2" />
                            <p className="text-xs text-gray-500 font-medium">{fd.customerName || 'Khách hàng'}</p>
                            <p className="text-xs text-green-600 font-medium mt-1">✓ Đã ký điện tử</p>
                          </div>
                        ) : (
                          <div className="py-4">
                            <FaSignature className="text-4xl text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-400">Chưa ký</p>
                          </div>
                        )}
                        <button onClick={() => setShowSignModal(true)}
                          className="mt-3 w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm rounded-lg hover:from-indigo-700 hover:to-blue-700 transition flex items-center justify-center gap-2 font-semibold shadow-lg shadow-indigo-200">
                          <FaSignature /> {signature ? 'Ký lại' : 'Ký hợp đồng'}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={handlePrevStep}
                        className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2">
                        <FaArrowLeft /> Quay lại
                      </button>
                      <button onClick={handleNextStep} disabled={!signature}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-200">
                        Tiếp tục thanh toán <FaArrowRight />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ═══ Step 3: Payment ═══ */}
              {step === 'payment' && (
                <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden">

                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                      <FaCreditCard /> Thanh Toán
                    </h2>
                    <p className="text-purple-100 text-sm mt-1">Chọn phương thức và hoàn tất thanh toán</p>
                  </div>

                  <div className="p-6">
                    {/* Payment Methods */}
                    <h4 className="font-bold text-gray-800 mb-4 text-sm">Chọn phương thức thanh toán:</h4>
                    <div className="space-y-3 mb-6">
                      {[
                        { id: 'stripe', label: 'Thẻ tín dụng / ghi nợ (Stripe)', icon: '💳', desc: 'Visa, Mastercard, JCB...' },
                        { id: 'cash', label: 'Tiền mặt', icon: '💰', desc: 'Thanh toán khi nhận xe' },
                        { id: 'transfer', label: 'Chuyển khoản ngân hàng', icon: '🏦', desc: 'Chuyển khoản qua tài khoản' }
                      ].map(method => (
                        <motion.label key={method.id} whileHover={{ scale: 1.01 }}
                          className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition ${
                            paymentMethod === method.id ? 'border-purple-500 bg-purple-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}>
                          <input type="radio" name="payment" value={method.id}
                            checked={paymentMethod === method.id}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-5 h-5 text-purple-600" />
                          <span className="text-2xl">{method.icon}</span>
                          <div>
                            <span className="font-semibold text-gray-800">{method.label}</span>
                            <p className="text-xs text-gray-500">{method.desc}</p>
                          </div>
                        </motion.label>
                      ))}
                    </div>

                    {/* Amount Summary */}
                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 mb-6 border border-purple-200">
                      <h4 className="font-bold text-gray-800 mb-4 text-sm">📊 Chi tiết thanh toán</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Đơn giá thuê / ngày:</span>
                          <span className="font-semibold">{formatCurrency(fd.dailyRate)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Tiền thuê ({fd.totalDays} ngày):</span>
                          <span className="font-bold">{formatCurrency(fd.totalFare)}</span>
                        </div>
                        {(fd.appliedDiscount > 0) && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Chiết khấu:</span>
                            <span className="font-bold text-green-600">-{formatCurrency(fd.appliedDiscount)}</span>
                          </div>
                        )}
                        {(fd.lateFeeAmount > 0) && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Phí phát sinh:</span>
                            <span className="font-bold text-red-600">+{formatCurrency(fd.lateFeeAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Tiền đặt cọc:</span>
                          <span className="font-semibold text-orange-600">{formatCurrency(fd.depositAmount)}</span>
                        </div>
                        <div className="border-t-2 border-purple-300 pt-3 mt-3 flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-800">TỔNG CỘNG:</span>
                          <span className="text-2xl font-bold text-purple-700">{formatCurrency(totalAmount)}</span>
                        </div>
                        <p className="text-xs text-gray-500 italic">({numberToWords(totalAmount)} đồng)</p>
                      </div>
                    </div>

                    {/* Stripe integration */}
                    {paymentMethod === 'stripe' && (
                      <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
                        <Suspense fallback={<div className="text-center py-4">Đang tải thanh toán...</div>}>
                        <StripePayment
                          bookingId={fd.bookingId || contractData?.bookingId}
                          amount={totalAmount}
                          onSuccess={handlePayment}
                          onError={(msg) => toast.error(msg || 'Thanh toán thất bại')}
                        />
                        </Suspense>
                      </div>
                    )}

                    {/* Non-stripe payment */}
                    {paymentMethod !== 'stripe' && (
                      <div className="flex gap-3">
                        <button onClick={handlePrevStep}
                          className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2">
                          <FaArrowLeft /> Quay lại
                        </button>
                        <button onClick={handleCashPayment} disabled={processingPayment}
                          className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-200">
                          {processingPayment ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                          Xác nhận ký & thanh toán
                        </button>
                      </div>
                    )}

                    {paymentMethod === 'stripe' && (
                      <button onClick={handlePrevStep}
                        className="w-full mt-4 px-6 py-2 text-gray-500 hover:text-gray-700 transition text-sm text-center">
                        ← Quay lại bước trước
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ═══ Step 4: Confirmation ═══ */}
              {step === 'confirmation' && (
                <motion.div key="confirmation" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  {/* Success banner */}
                  <div className="bg-white rounded-2xl shadow-lg p-8 text-center mb-6">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 100 }}>
                      <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-200">
                        <FaCheck className="text-5xl text-white" />
                      </div>
                    </motion.div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Hoàn thành! 🎉</h2>
                    <p className="text-gray-600 text-lg">Hợp đồng đã được ký và thanh toán thành công</p>
                  </div>

                  {/* Contract + Payment Info */}
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2"><FaFileContract /> Thông tin hợp đồng & thanh toán</h3>
                    </div>
                    <div className="p-6 space-y-6">

                      {/* Contract summary */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-gray-500">Mã hợp đồng</p><p className="font-mono font-bold text-emerald-700">{contractData.contractCode}</p></div>
                        <div><p className="text-gray-500">Trạng thái</p><p className="font-bold text-green-600">✓ Đã ký & Thanh toán</p></div>
                        <div><p className="text-gray-500">Xe</p><p className="font-semibold">{fd.carBrand} {fd.carModel} - {fd.licensePlate}</p></div>
                        <div><p className="text-gray-500">Thời gian</p><p className="font-semibold">{fd.totalDays} ngày</p></div>
                      </div>

                      {/* Payment info */}
                      {contractData.paymentInfo && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                          <h4 className="font-bold text-green-800 flex items-center gap-2 mb-3 text-sm"><FaCreditCard /> Thông tin thanh toán</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div><p className="text-gray-500">Số tiền</p><p className="font-bold text-emerald-700">{formatCurrency(contractData.paymentInfo.amount)}</p></div>
                            <div><p className="text-gray-500">Phương thức</p><p className="font-semibold uppercase">{contractData.paymentInfo.paymentMethod || '—'}</p></div>
                            <div>
                              <p className="text-gray-500">Trạng thái</p>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                contractData.paymentInfo.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {contractData.paymentInfo.paymentStatus === 'completed' ? '✓ Đã thanh toán' : '⏳ Đang xử lý'}
                              </span>
                            </div>
                            {contractData.paymentInfo.transactionId && (
                              <div className="col-span-2"><p className="text-gray-500">Mã giao dịch</p><p className="font-mono text-xs">{contractData.paymentInfo.transactionId}</p></div>
                            )}
                            {contractData.paymentInfo.paymentDate && (
                              <div><p className="text-gray-500">Thời gian</p><p className="font-semibold">{formatDate(contractData.paymentInfo.paymentDate)}</p></div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Signatures */}
                      <div>
                        <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-4 text-sm"><FaSignature className="text-indigo-600" /> Chữ ký các bên</h4>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200">
                            <p className="font-bold text-sm text-gray-700 mb-2">BÊN A - Chủ xe</p>
                            <SignatureDisplay signature={contractData?.supplierSignature} label={fd.supplierName || 'Chủ xe'} signed={!!contractData?.supplierSignature || !!contractData?.signedBySupplier} />
                          </div>
                          <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
                            <p className="font-bold text-sm text-gray-700 mb-2">BÊN B - Khách hàng</p>
                            {signature && <img src={signature} alt="Chữ ký" className="max-h-20 mx-auto border-b-2 border-gray-300 pb-2 mb-2" />}
                            <p className="text-xs text-gray-500 font-medium">{fd.customerName}</p>
                            <p className="text-xs text-green-600 font-medium mt-1">✓ Đã ký điện tử</p>
                          </div>
                        </div>
                      </div>

                      {/* Security */}
                      <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200">
                        <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
                          <FaShieldAlt className="text-green-500" />
                          Hợp đồng điện tử bảo mật • Mã: {contractData.contractCode} • Chữ ký số không thể giả mạo
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Full contract view */}
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
                    <div className="p-6">
                      <h4 className="font-bold text-gray-800 text-sm mb-3">📄 Hợp đồng đầy đủ</h4>
                      <div className="bg-white rounded-xl border-2 border-gray-200 h-[500px] overflow-hidden shadow-inner">
                        <iframe
                          title="Final Contract"
                          srcDoc={generateContractHTML(buildContractForHTML())}
                          className="w-full h-full border-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3 mb-6">
                    <button onClick={handleExportPDF} disabled={pdfLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition font-semibold border border-red-200">
                      {pdfLoading ? <FaSpinner className="animate-spin" /> : <FaDownload />} Tải PDF
                    </button>
                    <button onClick={handleDownloadHTML}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition font-semibold border border-blue-200">
                      <FaDownload /> Tải HTML
                    </button>
                  </div>

                  <button onClick={() => navigate('/')}
                    className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition flex items-center justify-center gap-3 shadow-lg shadow-emerald-200 text-lg">
                    <FaHome /> Quay về trang chủ
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right sidebar ── */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                📋 Chi tiết hợp đồng
              </h3>

              <div className="space-y-3">
                <div className="pb-3 border-b border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Loại xe</p>
                  <p className="font-semibold text-gray-800">{fd.carBrand} {fd.carModel}</p>
                </div>
                <div className="pb-3 border-b border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Biển số</p>
                  <p className="font-semibold text-gray-800">{fd.licensePlate}</p>
                </div>
                <div className="pb-3 border-b border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Thời gian thuê</p>
                  <p className="font-semibold text-gray-800">{fd.totalDays} ngày</p>
                </div>
                <div className="pb-3 border-b border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Đơn giá</p>
                  <p className="font-semibold text-gray-800">{formatCurrency(fd.dailyRate)}/ngày</p>
                </div>
                <div className="pb-3 border-b border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Tổng tiền</p>
                  <p className="font-bold text-emerald-600 text-xl">{formatCurrency(totalAmount)}</p>
                </div>

                {/* Status indicators */}
                <div className="pt-2 space-y-2">
                  <div className={`flex items-center gap-2 text-xs ${contractData?.signedBySupplier || contractData?.supplierSignature ? 'text-green-600' : 'text-gray-400'}`}>
                    {contractData?.signedBySupplier || contractData?.supplierSignature ? '✓' : '○'} Chủ xe đã ký
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${signature ? 'text-green-600' : 'text-orange-500 font-medium'}`}>
                    {signature ? '✓' : '⚡'} {signature ? 'Bạn đã ký' : 'Cần ký'}
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${contractData?.paymentInfo?.paymentStatus === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
                    {contractData?.paymentInfo?.paymentStatus === 'completed' ? '✓' : '○'} Đã thanh toán
                  </div>
                </div>

                {contractData?.paymentInfo && contractData.paymentInfo.paymentStatus === 'completed' && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4">
                    <p className="text-xs text-green-700 font-semibold mb-2">✓ ĐÃ THANH TOÁN</p>
                    <p className="text-xs text-gray-600 mb-1">
                      Phương thức: <span className="font-semibold uppercase">{contractData.paymentInfo.paymentMethod}</span>
                    </p>
                    {contractData.paymentInfo.paymentDate && (
                      <p className="text-xs text-gray-600">
                        Thời gian: <span className="font-semibold">{formatDate(contractData.paymentInfo.paymentDate)}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Signature Modal ── */}
      <SignatureModal
        isOpen={showSignModal}
        onClose={() => setShowSignModal(false)}
        onSave={handleSignature}
        title="Ký hợp đồng thuê xe"
        signerLabel="Chữ ký bên thuê (Bên B)"
      />
    </div>
  );
};

export default ContractSigningPage;
