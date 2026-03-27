import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaFileContract, FaSearch, FaEye, FaSignature, FaEdit, FaSave, FaTimes,
  FaCheckCircle, FaClock, FaExclamationTriangle, FaArrowLeft, FaSync,
  FaUser, FaCar, FaCalendarAlt, FaIdCard, FaMoneyBillWave, FaCreditCard,
  FaDownload, FaPrint, FaPhone, FaEnvelope, FaMapMarkerAlt, FaShieldAlt
} from "react-icons/fa";
import { toast } from "react-toastify";
import {
  getSupplierContracts, getContractById, generateContract,
  signContract, updateContractTerms, getSupplierOrders
} from "@/services/api";
import SignatureModal, { SignatureDisplay } from "@/components/common/SignatureModal";

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
const ContractList = ({ contracts, loading, onView, onRefresh }) => {
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
          <div className="bg-indigo-100 p-3 rounded-full">
            <FaFileContract className="text-indigo-600 text-2xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Quản lý Hợp đồng</h2>
            <p className="text-gray-500 text-sm">Kiểm tra và quản lý hợp đồng thuê xe</p>
          </div>
        </div>
        <button onClick={onRefresh} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
          <FaSync className={loading ? "animate-spin" : ""} /> Làm mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[250px]">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Tìm kiếm mã hợp đồng, tên khách hàng, xe..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(statusConfig).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <FaSync className="animate-spin text-3xl text-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FaFileContract className="mx-auto text-5xl mb-4" />
          <p className="text-lg">Chưa có hợp đồng nào</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mã HĐ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Khách hàng</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Xe</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Thời gian</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => (
                <tr key={c.contractId} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-mono text-sm font-medium text-indigo-600">{c.contractCode}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.customerName || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.carInfo || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.startDate} → {c.endDate}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge statusId={c.contractStatusId} /></td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => onView(c.contractId)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition">
                      <FaEye /> Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Contract Detail ────────────────────────────────────────────────────────
const ContractDetail = ({ contractId, onBack }) => {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [editingTerms, setEditingTerms] = useState(false);
  const [editedTerms, setEditedTerms] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
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
        toast.success(res.message || "Ký hợp đồng thành công!");
        setContract(res.data);
        setShowSignModal(false);
      } else {
        toast.error(res.message || "Lỗi ký hợp đồng");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Lỗi ký hợp đồng");
    } finally { setSigning(false); }
  };

  const handleSaveTerms = async () => {
    try {
      const res = await updateContractTerms(contractId, editedTerms);
      if (res.success) { toast.success("Cập nhật điều khoản thành công"); setContract(res.data); setEditingTerms(false); }
      else toast.error(res.message);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Lỗi cập nhật");
    }
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
      toast.error("Lỗi tải PDF.");
    } finally { setPdfLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <FaSync className="animate-spin text-3xl text-indigo-500" />
    </div>
  );
  if (!contract) return <div className="text-center py-20 text-gray-400">Không tìm thấy hợp đồng</div>;

  const isDraft = contract.contractStatusId === 6;
  const canSign = !contract.signedBySupplier && (contract.contractStatusId === 6 || contract.contractStatusId === 7);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Back + Title */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 transition"><FaArrowLeft className="text-gray-600" /></button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaFileContract className="text-indigo-600" /> {contract.contractCode}
          </h2>
          <p className="text-gray-500 text-sm">Tạo lúc: {formatDate(contract.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} disabled={pdfLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 transition disabled:opacity-50">
            {pdfLoading ? <FaSync className="animate-spin" /> : <FaDownload />} PDF
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-600">
            <FaPrint /> In
          </button>
          <StatusBadge statusId={contract.contractStatusId} />
        </div>
      </div>

      {/* ═══ PDF content ═══ */}
      <div ref={contractRef} className="space-y-5">

        {/* Header hợp đồng */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <div className="border-b-2 border-gray-800 pb-4 mb-4">
            <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h1>
            <p className="text-gray-700 font-medium">Độc lập - Tự do - Hạnh phúc</p>
            <p className="text-gray-500 mt-1">───────── ✦ ─────────</p>
          </div>
          <h2 className="text-2xl font-bold text-blue-900 mt-4">HỢP ĐỒNG THUÊ XE TỰ LÁI</h2>
          <p className="text-gray-600 font-mono mt-2">Số: <span className="font-bold text-blue-800">{contract.contractCode}</span></p>
        </div>

        {/* Bên A & Bên B */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-blue-200 p-5">
            <div className="flex items-center gap-2 text-blue-800 font-bold mb-4 pb-2 border-b border-blue-100">
              <FaUser className="text-blue-600" /> BÊN A - BÊN CHO THUÊ (Bạn)
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
              <FaUser className="text-emerald-600" /> BÊN B - BÊN THUÊ (Khách hàng)
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><FaUser className="text-gray-400 w-4" /><span className="text-gray-500">Họ tên:</span><span className="font-semibold">{contract.customerName || "—"}</span></p>
              <p className="flex items-center gap-2"><FaPhone className="text-gray-400 w-4" /><span className="text-gray-500">SĐT:</span><span className="font-medium">{contract.customerPhone || "—"}</span></p>
              <p className="flex items-center gap-2"><FaEnvelope className="text-gray-400 w-4" /><span className="text-gray-500">Email:</span><span className="font-medium">{contract.customerEmail || "—"}</span></p>
              <p className="flex items-center gap-2"><FaMapMarkerAlt className="text-gray-400 w-4" /><span className="text-gray-500">Địa chỉ:</span><span className="font-medium">{contract.customerAddress || "—"}</span></p>
              <p className="flex items-center gap-2"><FaIdCard className="text-gray-400 w-4" /><span className="text-gray-500">CCCD:</span><span className="font-medium">{contract.customerNationalId || "—"}</span></p>
              <p className="flex items-center gap-2"><FaIdCard className="text-gray-400 w-4" /><span className="text-gray-500">GPLX:</span><span className="font-medium">{contract.customerDrivingLicense || "—"}</span></p>
              {/* License verification */}
              {contract.customerLicense && (
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2 text-xs">
                  <FaIdCard className="text-gray-400" />
                  <span>Xác minh: </span>
                  {contract.customerLicense.licenseVerificationStatus === "verified" ? (
                    <span className="text-green-600 font-medium">✓ Đã xác minh</span>
                  ) : contract.customerLicense.licenseVerificationStatus === "rejected" ? (
                    <span className="text-red-600 font-medium">✗ Từ chối</span>
                  ) : (
                    <span className="text-yellow-600 font-medium">⏳ Chưa xác minh</span>
                  )}
                </div>
              )}
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
            <div className="flex justify-between text-sm py-2 border-b border-gray-50"><span className="text-gray-600">Đơn giá thuê / ngày</span><span className="font-semibold">{formatCurrency(contract.dailyRate)}</span></div>
            <div className="flex justify-between text-sm py-2 border-b border-gray-50"><span className="text-gray-600">Số ngày thuê</span><span className="font-semibold">{contract.totalDays} ngày</span></div>
            {contract.appliedDiscount > 0 && (
              <div className="flex justify-between text-sm py-2 border-b border-gray-50"><span className="text-gray-600">Giảm giá</span><span className="font-semibold text-green-600">- {formatCurrency(contract.appliedDiscount)}</span></div>
            )}
            <div className="flex justify-between text-sm py-2 border-b border-gray-50"><span className="text-gray-600">Tiền đặt cọc</span><span className="font-semibold text-orange-600">{formatCurrency(contract.depositAmount)}</span></div>
            <div className="flex justify-between items-center py-3 bg-blue-50 -mx-5 px-5 rounded-lg mt-2">
              <span className="font-bold text-blue-900 text-base">TỔNG CỘNG</span>
              <span className="font-bold text-blue-900 text-xl">{formatCurrency(contract.totalFare)}</span>
            </div>
          </div>
        </div>

        {/* Điều khoản */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><FaFileContract className="text-indigo-600" /> ĐIỀU KHOẢN HỢP ĐỒNG</h3>
            {isDraft && !editingTerms && (
              <button onClick={() => { setEditedTerms(contract.termsAndConditions || ""); setEditingTerms(true); }}
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800">
                <FaEdit /> Chỉnh sửa
              </button>
            )}
          </div>
          {editingTerms ? (
            <div>
              <textarea value={editedTerms} onChange={e => setEditedTerms(e.target.value)} rows={20}
                className="w-full border border-gray-300 rounded-lg p-4 font-mono text-sm focus:ring-2 focus:ring-indigo-500" />
              <div className="flex gap-2 mt-3 justify-end">
                <button onClick={() => setEditingTerms(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button>
                <button onClick={handleSaveTerms} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1"><FaSave /> Lưu</button>
              </div>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg max-h-[500px] overflow-y-auto leading-relaxed font-sans">
              {contract.termsAndConditions || "Chưa có điều khoản"}
            </pre>
          )}
        </div>

        {/* Chữ ký */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
            <FaSignature className="text-indigo-600" /> CHỮ KÝ CÁC BÊN
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div className={`rounded-xl p-5 border text-center ${contract.signedBySupplier ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
              <p className="font-bold text-sm text-gray-700 mb-1">BÊN A - BÊN CHO THUÊ (Bạn)</p>
              <p className="text-xs text-gray-500 mb-3">(Ký và ghi rõ họ tên)</p>
              <SignatureDisplay signature={contract.supplierSignature} label={contract.supplierName || "Chủ xe"} signed={contract.signedBySupplier} />
              {contract.signedBySupplier && <p className="text-xs text-green-600 mt-2 font-medium">✓ Đã ký điện tử</p>}
              {canSign && (
                <button onClick={() => setShowSignModal(true)}
                  className="mt-3 w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm rounded-lg hover:from-indigo-700 hover:to-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 font-semibold">
                  <FaSignature /> Ký hợp đồng
                </button>
              )}
            </div>
            <div className={`rounded-xl p-5 border text-center ${contract.signedByCustomer ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
              <p className="font-bold text-sm text-gray-700 mb-1">BÊN B - BÊN THUÊ (Khách hàng)</p>
              <p className="text-xs text-gray-500 mb-3">(Ký và ghi rõ họ tên)</p>
              <SignatureDisplay signature={contract.customerSignature} label={contract.customerName || "Khách hàng"} signed={contract.signedByCustomer} />
              {contract.signedByCustomer && <p className="text-xs text-green-600 mt-2 font-medium">✓ Đã ký điện tử</p>}
            </div>
          </div>
        </div>

        {/* Thanh toán */}
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
                <div className="col-span-2"><p className="text-gray-500">Mã giao dịch</p><p className="font-mono text-xs">{contract.paymentInfo.transactionId}</p></div>
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

      {/* Signature Modal */}
      <SignatureModal isOpen={showSignModal} onClose={() => setShowSignModal(false)} onSave={handleSign}
        title="Ký hợp đồng điện tử" signerLabel="Chữ ký chủ xe (Supplier)" loading={signing} />
    </motion.div>
  );
};

// ── Generate Contract from Order ───────────────────────────────────────────
const GenerateContractPanel = ({ onGenerated }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getSupplierOrders();
        // Only show confirmed bookings without contracts
        const confirmed = (res.data || res || []).filter(o => {
          const statusName = (o.status?.statusName || o.statusName || "").toLowerCase();
          return statusName === "confirmed" || statusName === "approved";
        });
        setOrders(confirmed);
      } catch (err) {
        toast.error("Lỗi tải đơn hàng");
      } finally { setLoading(false); }
    })();
  }, []);

  const handleGenerate = async (bookingId) => {
    try {
      setGenerating(bookingId);
      const res = await generateContract(bookingId);
      if (res.success) {
        toast.success(res.message || "Tạo hợp đồng thành công!");
        setOrders(prev => prev.filter(o => (o.bookingId || o.id) !== bookingId));
        if (onGenerated) onGenerated();
      } else toast.error(res.message || "Lỗi tạo hợp đồng");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Lỗi tạo hợp đồng");
    } finally { setGenerating(null); }
  };

  if (loading) return <div className="flex justify-center py-10"><FaSync className="animate-spin text-2xl text-indigo-500" /></div>;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
        <FaFileContract className="text-indigo-600" /> Tạo hợp đồng cho đơn đã duyệt
      </h3>
      {orders.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">Không có đơn hàng nào sẵn sàng tạo hợp đồng</p>
      ) : (
        <div className="space-y-3">
          {orders.map(o => {
            const id = o.bookingId || o.id;
            return (
              <div key={id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-800">Booking #{id}</span>
                  <span className="text-sm text-gray-500 ml-3">
                    {o.carName || o.car?.model || ""} • {o.customerName || o.customer?.fullName || ""}
                  </span>
                </div>
                <button onClick={() => handleGenerate(id)} disabled={generating === id}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-1">
                  <FaFileContract /> {generating === id ? "Đang tạo..." : "Tạo hợp đồng"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
const SupplierContractManagement = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewContractId, setViewContractId] = useState(null);

  const loadContracts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getSupplierContracts();
      if (res.success) setContracts(res.data || []);
    } catch (err) {
      toast.error("Lỗi tải danh sách hợp đồng");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadContracts(); }, [loadContracts]);

  if (viewContractId) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl shadow-xl p-8">
        <ContractDetail contractId={viewContractId} onBack={() => { setViewContractId(null); loadContracts(); }} />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-xl p-8">
      <GenerateContractPanel onGenerated={loadContracts} />
      <ContractList contracts={contracts} loading={loading} onView={setViewContractId} onRefresh={loadContracts} />
    </motion.div>
  );
};

export default SupplierContractManagement;
