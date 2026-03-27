import React, { useState, useEffect } from 'react';
import { getSupplierRefundRequests, respondToRefundRequest } from '@/services/api';
import { toast } from 'react-toastify';
import { FaUndoAlt, FaCheckCircle, FaTimesCircle, FaClock, FaFileContract } from 'react-icons/fa';
import { motion } from 'framer-motion';

const statusBadge = (status) => {
  switch (status) {
    case 'approved':
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700"><FaCheckCircle /> Đã duyệt</span>;
    case 'rejected':
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700"><FaTimesCircle /> Từ chối</span>;
    default:
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700"><FaClock /> Chờ duyệt</span>;
  }
};

const SupplierRefundManagement = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await getSupplierRefundRequests();
      setRequests(res.data || []);
    } catch {
      toast.error('Không thể tải danh sách yêu cầu hoàn tiền');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleRespond = async (id, response) => {
    const reason = response === 'rejected'
      ? prompt('Nhập lý do từ chối:')
      : null;
    if (response === 'rejected' && reason === null) return;

    try {
      setResponding(id);
      await respondToRefundRequest(id, response, reason || '');
      toast.success(response === 'approved' ? 'Đã chấp nhận yêu cầu hoàn tiền' : 'Đã từ chối yêu cầu hoàn tiền');
      fetchRequests();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setResponding(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl p-8"
    >
      <div className="flex items-center mb-6">
        <div className="bg-orange-100 p-3 rounded-full mr-4">
          <FaUndoAlt className="text-orange-600 text-2xl" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Yêu cầu hoàn tiền</h2>
          <p className="text-gray-600">Quản lý các yêu cầu hoàn tiền từ khách hàng</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Đang tải...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Không có yêu cầu hoàn tiền nào</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Khách hàng</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Hợp đồng</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Số tiền</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Lý do</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">KH</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Chủ xe</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Admin</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Tổng</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {requests.map((r) => (
                <tr key={r.refundRequestId} className="hover:bg-blue-50 transition">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{r.customerName}</td>
                  <td className="px-4 py-3 text-sm text-blue-600 flex items-center gap-1">
                    <FaFileContract /> {r.contractCode || `#${r.contractId}`}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-700">
                    {Number(r.refundAmount).toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{r.reason || '—'}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(r.customerApproval)}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(r.supplierApproval)}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(r.adminApproval)}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(r.overallStatus)}</td>
                  <td className="px-4 py-3 text-center">
                    {r.supplierApproval === 'pending' ? (
                      <div className="flex gap-2 justify-center">
                        <button
                          disabled={responding === r.refundRequestId}
                          onClick={() => handleRespond(r.refundRequestId, 'approved')}
                          className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
                        >
                          Chấp nhận
                        </button>
                        <button
                          disabled={responding === r.refundRequestId}
                          onClick={() => handleRespond(r.refundRequestId, 'rejected')}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
                        >
                          Từ chối
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">Đã phản hồi</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

export default SupplierRefundManagement;
