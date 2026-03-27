import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import {
  FaFileContract, FaSearch, FaEye, FaSignature, FaTimes,
  FaCheckCircle, FaClock, FaExclamationTriangle, FaArrowLeft, FaSync,
  FaUser, FaCar, FaCalendarAlt, FaDownload, FaPrint, FaMoneyBillWave,
  FaCreditCard, FaIdCard, FaMapMarkerAlt, FaPhone, FaEnvelope, FaShieldAlt
} from "react-icons/fa";
import { toast } from "react-toastify";
import {
  getCustomerContracts, getContractById, signContract, rejectContract
} from "@/services/api";
import SignatureModal, { SignatureDisplay } from "@/components/common/SignatureModal";
const StripePayment = lazy(() => import("@/components/features/payments/StripePayment"));

const statusConfig = {
  6:  { label: "Bản nháp",   color: "bg-yellow-100 text-yellow-800", icon: <FaClock /> },
  7:  { label: "Đã ký",      color: "bg-blue-100 text-blue-800",     icon: <FaSignature /> },
  8:  { label: "Hoạt động",   color: "bg-green-100 text-green-800",   icon: <FaCheckCircle /> },
  9:  { label: "Hết hạn",     color: "bg-gray-100 text-gray-600",     icon: <FaExclamationTriangle /> },
  10: { label: "Chấm dứt",   color: "bg-red-100 text-red-800",       icon: <FaTimes /> },
};

const StatusBadge = ({ statusId }) => {
  const cfg = statusConfig[statusId] || { label: "Không xác định", color: "bg-gray-100 text-gray-500", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

const formatCurrency = (v) => Number(v || 0).toLocaleString("vi-VN") + " VNĐ";
const formatDate = (d) => d ? new Date(d).toLocaleString("vi-VN") : "—";

// ── Contract List ──────────────────────────────────────────────────────────
const CustomerContractList = ({ contracts, loading, onView, onRefresh }) => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = contracts.filter(c => {
    const matchSearch =
      c.contractCode?.toLowerCase().includes(search.toLowerCase()) ||
      c.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      c.carInfo?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.contractStatusId === parseInt(filterStatus);
    return matchSearch && matchStatus;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-3 rounded-full">
            <FaFileContract className="text-emerald-600 text-2xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Hợp đồng của tôi</h2>
            <p className="text-gray-500 text-sm">Xem và ký hợp đồng thuê xe điện tử</p>
          </div>
        </div>
        <button onClick={onRefresh} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
          <FaSync className={loading ? "animate-spin" : ""} /> Làm mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[250px]">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Tìm kiếm mã hợp đồng, chủ xe, xe..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(statusConfig).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table / List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <FaSync className="animate-spin text-3xl text-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FaFileContract className="mx-auto text-5xl mb-4" />
          <p className="text-lg">Chưa có hợp đồng nào</p>
          <p className="text-sm mt-2">Khi chủ xe tạo hợp đồng, bạn sẽ thấy ở đây</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.contractId}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition cursor-pointer"
              onClick={() => onView(c.contractId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-50 p-3 rounded-lg">
                    <FaFileContract className="text-emerald-600 text-lg" />
                  </div>
                  <div>
                    <p className="font-mono font-semibold text-emerald-700">{c.contractCode}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1"><FaCar className="text-gray-400" /> {c.carInfo || "—"}</span>
                      <span className="flex items-center gap-1"><FaCalendarAlt className="text-gray-400" /> {c.startDate} → {c.endDate}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right mr-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className={c.signedBySupplier ? "text-green-600" : "text-gray-400"}>
                        {c.signedBySupplier ? "✓ Chủ xe đã ký" : "○ Chủ xe chưa ký"}
                      </span>
                      <span>•</span>
                      <span className={c.signedByCustomer ? "text-green-600" : "text-orange-500 font-medium"}>
                        {c.signedByCustomer ? "✓ Bạn đã ký" : "⚡ Cần ký"}
                      </span>
                    </div>
                  </div>
                  <StatusBadge statusId={c.contractStatusId} />
                  <FaEye className="text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Contract Detail ────────────────────────────────────────────────────────
const CustomerContractDetail = ({ contractId, onBack }) => {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const contractRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getContractById(contractId);
      if (res.success) setContract(res.data);
      else toast.error(res.message || "Lỗi tải hợp đồng");
    } catch (err) {
      toast.error("Lỗi tải hợp đồng");
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => { load(); }, [load]);

  const handleSign = async (signatureBase64) => {
    try {
      setSigning(true);
      const res = await signContract(contractId, signatureBase64);
      if (res.success) {
        toast.success(res.message || "Ký hợp đồng thành công! ✍️");
        setContract(res.data);
        setShowSignModal(false);
      } else {
        toast.error(res.message || "Lỗi ký hợp đồng");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Lỗi ký hợp đồng");
    } finally { setSigning(false); }
  };

  const handlePaymentSuccess = () => {
    toast.success("Thanh toán thành công! 🎉");
    setShowPayment(false);
    load();
  };

  const handleExportPDF = async () => {
    if (!contractRef.current) return;
    setPdfLoading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `HopDong_${contract.contractCode}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] }
      };
      await html2pdf().set(opt).from(contractRef.current).save();
      toast.success("Tải PDF thành công!");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Lỗi tải PDF. Vui lòng thử lại.");
    } finally { setPdfLoading(false); }
  };

  const handleReject = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn từ chối hợp đồng này? Đơn đặt xe sẽ bị hủy.")) return;
    try {
      setRejecting(true);
      const reason = window.prompt("Nhập lý do từ chối (tùy chọn):");
      await rejectContract(contractId, reason || "Khách hàng từ chối hợp đồng");
      toast.success("Đã từ chối hợp đồng. Đơn đặt xe đã bị hủy.");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Lỗi từ chối hợp đồng");
    } finally { setRejecting(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <FaSync className="animate-spin text-3xl text-emerald-500" />
    </div>
  );
  if (!contract) return <div className="text-center py-20 text-gray-400">Không tìm thấy hợp đồng</div>;

  const canSign = !contract.signedByCustomer && (contract.contractStatusId === 6 || contract.contractStatusId === 7);
  const canReject = contract.contractStatusId !== 10 && contract.contractStatusId !== 8;
  const bothSigned = contract.signedByCustomer && contract.signedBySupplier;
  const needsPayment = bothSigned && (!contract.paymentInfo || contract.paymentInfo.paymentStatus !== "completed");

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Back + Title */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 transition">
          <FaArrowLeft className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaFileContract className="text-emerald-600" /> {contract.contractCode}
          </h2>
          <p className="text-gray-500 text-sm">Tạo lúc: {formatDate(contract.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} disabled={pdfLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition disabled:opacity-50">
            {pdfLoading ? <FaSync className="animate-spin" /> : <FaDownload />} Tải PDF
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-600">
            <FaPrint /> In
          </button>
          <StatusBadge statusId={contract.contractStatusId} />
        </div>
      </div>

      {/* Banner ký */}
      {canSign && (
        <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl flex items-center gap-4">
          <div className="bg-orange-100 p-3 rounded-full"><FaSignature className="text-orange-600 text-xl" /></div>
          <div className="flex-1">
            <p className="font-semibold text-orange-800">Hợp đồng cần chữ ký của bạn</p>
            <p className="text-sm text-orange-600">Vui lòng đọc kỹ điều khoản và ký xác nhận bên dưới</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSignModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition font-semibold flex items-center gap-2 shadow-lg">
              <FaSignature /> Ký ngay
            </button>
            {canReject && (
              <button onClick={handleReject} disabled={rejecting}
                className="px-4 py-2.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition font-semibold flex items-center gap-2 disabled:opacity-50">
                <FaTimes /> {rejecting ? "..." : "Từ chối"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ Nội dung xuất PDF ═══ */}
      <div ref={contractRef} className="space-y-6">

        {/* Header hợp đồng */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <div className="border-b-2 border-gray-800 pb-4 mb-4">
            <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h1>
            <p className="text-gray-700 font-medium">Độc lập - Tự do - Hạnh phúc</p>
            <p className="text-gray-500 mt-1">───────── ✦ ─────────</p>
          </div>
          <h2 className="text-2xl font-bold text-blue-900 mt-4">HỢP ĐỒNG THUÊ XE TỰ LÁI</h2>
          <p className="text-gray-600 font-mono mt-2">Số: <span className="font-bold text-blue-800">{contract.contractCode}</span></p>
          <p className="text-sm text-gray-500 mt-1">Ngày tạo: {formatDate(contract.createdAt)}</p>
        </div>

        {/* Bên A & Bên B */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-blue-200 p-5">
            <div className="flex items-center gap-2 text-blue-800 font-bold mb-4 pb-2 border-b border-blue-100">
              <FaUser className="text-blue-600" /> BÊN A - BÊN CHO THUÊ
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><FaUser className="text-gray-400 w-4" /><span className="text-gray-500">Họ tên:</span><span className="font-semibold">{contract.supplierName || "—"}</span></p>
              <p className="flex items-center gap-2"><FaPhone className="text-gray-400 w-4" /><span className="text-gray-500">SĐT:</span><span className="font-medium">{contract.supplierPhone || "—"}</span></p>
              <p className="flex items-center gap-2"><FaEnvelope className="text-gray-400 w-4" /><span className="text-gray-500">Email:</span><span className="font-medium">{contract.supplierEmail || "—"}</span></p>
              <p className="flex items-center gap-2"><FaMapMarkerAlt className="text-gray-400 w-4" /><span className="text-gray-500">Địa chỉ:</span><span className="font-medium">{contract.supplierAddress || "—"}</span></p>
              <p className="flex items-center gap-2"><FaIdCard className="text-gray-400 w-4" /><span className="text-gray-500">CCCD:</span><span className="font-medium">{contract.supplierNationalId || "—"}</span></p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 p-5">
            <div className="flex items-center gap-2 text-emerald-800 font-bold mb-4 pb-2 border-b border-emerald-100">
              <FaUser className="text-emerald-600" /> BÊN B - BÊN THUÊ
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><FaUser className="text-gray-400 w-4" /><span className="text-gray-500">Họ tên:</span><span className="font-semibold">{contract.customerName || "—"}</span></p>
              <p className="flex items-center gap-2"><FaPhone className="text-gray-400 w-4" /><span className="text-gray-500">SĐT:</span><span className="font-medium">{contract.customerPhone || "—"}</span></p>
              <p className="flex items-center gap-2"><FaEnvelope className="text-gray-400 w-4" /><span className="text-gray-500">Email:</span><span className="font-medium">{contract.customerEmail || "—"}</span></p>
              <p className="flex items-center gap-2"><FaMapMarkerAlt className="text-gray-400 w-4" /><span className="text-gray-500">Địa chỉ:</span><span className="font-medium">{contract.customerAddress || "—"}</span></p>
              <p className="flex items-center gap-2"><FaIdCard className="text-gray-400 w-4" /><span className="text-gray-500">CCCD:</span><span className="font-medium">{contract.customerNationalId || "—"}</span></p>
              <p className="flex items-center gap-2"><FaIdCard className="text-gray-400 w-4" /><span className="text-gray-500">GPLX:</span><span className="font-medium">{contract.customerDrivingLicense || "—"}</span></p>
            </div>
          </div>
        </div>

        {/* Thông tin xe */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-800 font-bold mb-4 pb-2 border-b border-gray-100">
            <FaCar className="text-blue-600" /> THÔNG TIN XE CHO THUÊ
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-gray-500">Hãng xe</p><p className="font-semibold">{contract.carBrand || "—"}</p></div>
            <div><p className="text-gray-500">Mẫu xe</p><p className="font-semibold">{contract.carModel || "—"}</p></div>
            <div><p className="text-gray-500">Biển số</p><p className="font-semibold">{contract.licensePlate || "—"}</p></div>
            <div><p className="text-gray-500">Năm SX</p><p className="font-semibold">{contract.carYear || "—"}</p></div>
            <div><p className="text-gray-500">Số chỗ</p><p className="font-semibold">{contract.carSeats || "—"} chỗ</p></div>
            <div><p className="text-gray-500">Màu sắc</p><p className="font-semibold">{contract.carColor || "—"}</p></div>
            <div><p className="text-gray-500">Hộp số</p><p className="font-semibold">{contract.carTransmission || "—"}</p></div>
            <div><p className="text-gray-500">Nhiên liệu</p><p className="font-semibold">{contract.carFuelType || "—"}</p></div>
          </div>
        </div>

        {/* Thời gian & địa điểm */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-800 font-bold mb-4 pb-2 border-b border-gray-100">
            <FaCalendarAlt className="text-indigo-600" /> THỜI GIAN & ĐỊA ĐIỂM
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><p className="text-gray-500">Ngày bắt đầu</p><p className="font-semibold">{contract.startDate}</p></div>
            <div><p className="text-gray-500">Ngày kết thúc</p><p className="font-semibold">{contract.endDate}</p></div>
            <div><p className="text-gray-500">Tổng số ngày</p><p className="font-semibold text-blue-700">{contract.totalDays} ngày</p></div>
            <div><p className="text-gray-500">Địa điểm nhận xe</p><p className="font-semibold">{contract.pickupLocation || "Theo thỏa thuận"}</p></div>
            <div><p className="text-gray-500">Địa điểm trả xe</p><p className="font-semibold">{contract.dropoffLocation || "Theo thỏa thuận"}</p></div>
          </div>
        </div>

        {/* Tài chính */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-800 font-bold mb-4 pb-2 border-b border-gray-100">
            <FaMoneyBillWave className="text-green-600" /> THÔNG TIN TÀI CHÍNH
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm py-2 border-b border-gray-50">
              <span className="text-gray-600">Đơn giá thuê / ngày</span>
              <span className="font-semibold">{formatCurrency(contract.dailyRate)}</span>
            </div>
            <div className="flex justify-between items-center text-sm py-2 border-b border-gray-50">
              <span className="text-gray-600">Số ngày thuê</span>
              <span className="font-semibold">{contract.totalDays} ngày</span>
            </div>
            {contract.appliedDiscount > 0 && (
              <div className="flex justify-between items-center text-sm py-2 border-b border-gray-50">
                <span className="text-gray-600">Giảm giá</span>
                <span className="font-semibold text-green-600">- {formatCurrency(contract.appliedDiscount)}</span>
              </div>
            )}
            {contract.lateFeeAmount > 0 && (
              <div className="flex justify-between items-center text-sm py-2 border-b border-gray-50">
                <span className="text-gray-600">Phí trả trễ</span>
                <span className="font-semibold text-red-600">+ {formatCurrency(contract.lateFeeAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm py-2 border-b border-gray-50">
              <span className="text-gray-600">Tiền đặt cọc</span>
              <span className="font-semibold text-orange-600">{formatCurrency(contract.depositAmount)}</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-blue-50 -mx-5 px-5 rounded-lg mt-2">
              <span className="font-bold text-blue-900 text-base">TỔNG CỘNG</span>
              <span className="font-bold text-blue-900 text-xl">{formatCurrency(contract.totalFare)}</span>
            </div>
          </div>
        </div>

        {/* Điều khoản */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
            <FaFileContract className="text-indigo-600" /> ĐIỀU KHOẢN HỢP ĐỒNG
          </h3>
          <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg max-h-[500px] overflow-y-auto leading-relaxed font-sans">
            {contract.termsAndConditions || "Chưa có điều khoản"}
          </pre>
        </div>

        {/* Chữ ký */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
            <FaSignature className="text-indigo-600" /> CHỮ KÝ CÁC BÊN
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div className={`rounded-xl p-5 border text-center ${contract.signedBySupplier ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
              <p className="font-bold text-sm text-gray-700 mb-1">BÊN A - BÊN CHO THUÊ</p>
              <p className="text-xs text-gray-500 mb-3">(Ký và ghi rõ họ tên)</p>
              <SignatureDisplay signature={contract.supplierSignature} label={contract.supplierName || "Chủ xe"} signed={contract.signedBySupplier} />
              {contract.signedBySupplier && <p className="text-xs text-green-600 mt-2 font-medium">✓ Đã ký điện tử</p>}
            </div>
            <div className={`rounded-xl p-5 border text-center ${contract.signedByCustomer ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}`}>
              <p className="font-bold text-sm text-gray-700 mb-1">BÊN B - BÊN THUÊ</p>
              <p className="text-xs text-gray-500 mb-3">(Ký và ghi rõ họ tên)</p>
              <SignatureDisplay signature={contract.customerSignature} label={contract.customerName || "Khách hàng"} signed={contract.signedByCustomer} />
              {contract.signedByCustomer && <p className="text-xs text-green-600 mt-2 font-medium">✓ Đã ký điện tử</p>}
              {canSign && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setShowSignModal(true)}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm rounded-lg hover:from-emerald-700 hover:to-teal-700 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 font-semibold">
                    <FaSignature /> Ký hợp đồng
                  </button>
                  {canReject && (
                    <button onClick={handleReject} disabled={rejecting}
                      className="px-4 py-2.5 bg-red-100 text-red-600 text-sm rounded-lg hover:bg-red-200 transition flex items-center justify-center gap-2 font-semibold disabled:opacity-50">
                      <FaTimes /> {rejecting ? "..." : "Từ chối"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Thanh toán (nếu có) */}
        {contract.paymentInfo && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 text-gray-800 font-bold mb-4 pb-2 border-b border-gray-100">
              <FaCreditCard className="text-purple-600" /> THÔNG TIN THANH TOÁN
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><p className="text-gray-500">Số tiền</p><p className="font-semibold">{formatCurrency(contract.paymentInfo.amount)}</p></div>
              <div><p className="text-gray-500">Phương thức</p><p className="font-semibold capitalize">{contract.paymentInfo.paymentMethod || "—"}</p></div>
              <div>
                <p className="text-gray-500">Trạng thái</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  contract.paymentInfo.paymentStatus === "completed" ? "bg-green-100 text-green-800" :
                  contract.paymentInfo.paymentStatus === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                }`}>
                  {contract.paymentInfo.paymentStatus === "completed" ? "✓ Đã thanh toán" :
                   contract.paymentInfo.paymentStatus === "pending" ? "⏳ Đang xử lý" : "✗ Thất bại"}
                </span>
              </div>
              {contract.paymentInfo.transactionId && (
                <div className="col-span-2"><p className="text-gray-500">Mã giao dịch</p><p className="font-mono text-xs text-gray-700">{contract.paymentInfo.transactionId}</p></div>
              )}
              {contract.paymentInfo.paymentDate && (
                <div><p className="text-gray-500">Ngày thanh toán</p><p className="font-semibold">{formatDate(contract.paymentInfo.paymentDate)}</p></div>
              )}
            </div>
          </div>
        )}

        {/* Security footer */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
            <FaShieldAlt className="text-green-500" />
            Hợp đồng điện tử được bảo mật • Mã: {contract.contractCode} • Chữ ký số không thể giả mạo
          </div>
        </div>
      </div>

      {/* ═══ Thanh toán (ngoài PDF) ═══ */}
      {needsPayment && (
        <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-100 p-3 rounded-full"><FaCreditCard className="text-purple-600 text-xl" /></div>
            <div>
              <h3 className="font-bold text-purple-900">Thanh toán hợp đồng</h3>
              <p className="text-sm text-purple-600">Hợp đồng đã được ký bởi cả hai bên. Vui lòng thanh toán để hoàn tất.</p>
            </div>
          </div>
          {!showPayment ? (
            <div className="text-center">
              <p className="text-lg font-bold text-purple-900 mb-4">
                Số tiền cần thanh toán: <span className="text-2xl">{formatCurrency(contract.totalFare)}</span>
              </p>
              <button onClick={() => setShowPayment(true)}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 transition shadow-lg shadow-purple-200 flex items-center gap-3 mx-auto">
                <FaCreditCard /> Thanh toán qua Stripe
              </button>
            </div>
          ) : (
            <div className="max-w-md mx-auto bg-white rounded-xl p-6 shadow-sm">
              <Suspense fallback={<div className="text-center py-4">Đang tải thanh toán...</div>}>
              <StripePayment bookingId={contract.bookingId} amount={contract.totalFare}
                onSuccess={handlePaymentSuccess}
                onError={(msg) => toast.error(msg || "Thanh toán thất bại")} />
              </Suspense>
              <button onClick={() => setShowPayment(false)} className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700 transition">← Quay lại</button>
            </div>
          )}
        </div>
      )}

      {/* Trạng thái hoàn tất */}
      {bothSigned && contract.paymentInfo?.paymentStatus === "completed" && (
        <div className="mt-6 p-5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl text-center">
          <FaCheckCircle className="mx-auto text-4xl text-green-600 mb-3" />
          <p className="font-bold text-green-800 text-lg">Hợp đồng đã hoàn tất</p>
          <p className="text-sm text-green-600 mt-1">Đã ký bởi cả hai bên & thanh toán thành công</p>
          <p className="text-xs text-green-500 mt-2">Hiệu lực: {contract.startDate} → {contract.endDate}</p>
        </div>
      )}

      {bothSigned && !needsPayment && contract.paymentInfo?.paymentStatus !== "completed" && (
        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl text-center">
          <FaCheckCircle className="mx-auto text-3xl text-green-600 mb-2" />
          <p className="font-bold text-green-800">Hợp đồng đã được ký bởi cả hai bên</p>
          <p className="text-sm text-green-600 mt-1">Hiệu lực: {contract.startDate} → {contract.endDate}</p>
        </div>
      )}

      {/* Signature Modal */}
      <SignatureModal isOpen={showSignModal} onClose={() => setShowSignModal(false)} onSave={handleSign}
        title="Ký hợp đồng thuê xe" signerLabel="Chữ ký khách hàng (Customer)" loading={signing} />
    </motion.div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
const CustomerContractTab = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewContractId, setViewContractId] = useState(null);

  const loadContracts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCustomerContracts();
      if (res.success) setContracts(res.data || []);
    } catch (err) {
      toast.error("Lỗi tải danh sách hợp đồng");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadContracts(); }, [loadContracts]);

  if (viewContractId) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <CustomerContractDetail
          contractId={viewContractId}
          onBack={() => { setViewContractId(null); loadContracts(); }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <CustomerContractList
        contracts={contracts}
        loading={loading}
        onView={setViewContractId}
        onRefresh={loadContracts}
      />
    </motion.div>
  );
};

export default CustomerContractTab;
