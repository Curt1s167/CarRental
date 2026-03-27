import React, { useState, useEffect, useCallback } from 'react';
import { FaMoneyBillWave, FaSync, FaCheckCircle, FaTimesCircle, FaClock, FaUser, FaFileContract } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { getAdminRefundRequests, respondToRefundRequest } from '@/services/api';

const formatCurrency = (v) => Number(v || 0).toLocaleString('vi-VN') + ' VNĐ';
const formatDate = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
};

const RefundManagement = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [responding, setResponding] = useState(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getAdminRefundRequests();
            setRequests(Array.isArray(data) ? data : []);
        } catch (err) {
            toast.error('Lỗi tải danh sách yêu cầu hoàn tiền');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleRespond = async (id, response) => {
        const action = response === 'approved' ? 'chấp thuận' : 'từ chối';
        if (!window.confirm(`Bạn có chắc chắn muốn ${action} yêu cầu hoàn tiền này?`)) return;
        
        try {
            setResponding(id);
            const reason = response === 'rejected' ? window.prompt('Nhập lý do từ chối:') : null;
            await respondToRefundRequest(id, response, reason);
            toast.success(`Đã ${action} yêu cầu hoàn tiền`);
            loadData();
        } catch (err) {
            toast.error(err?.message || `Lỗi ${action} yêu cầu`);
        } finally {
            setResponding(null);
        }
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-3 rounded-full">
                        <FaMoneyBillWave className="text-orange-600 text-2xl" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Quản lý Hoàn tiền</h2>
                        <p className="text-gray-500 text-sm">Xem và phê duyệt yêu cầu hoàn tiền từ khách hàng</p>
                    </div>
                </div>
                <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition">
                    <FaSync className={loading ? 'animate-spin' : ''} /> Làm mới
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <FaSync className="animate-spin text-3xl text-orange-500" />
                </div>
            ) : requests.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <FaMoneyBillWave className="mx-auto text-5xl mb-4 opacity-30" />
                    <p className="text-lg">Không có yêu cầu hoàn tiền nào đang chờ</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map(r => (
                        <div key={r.refundRequestId} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="font-mono text-sm bg-gray-100 px-3 py-1 rounded-lg font-medium">
                                            #{r.refundRequestId}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${statusColors[r.overallStatus] || 'bg-gray-100 text-gray-500'}`}>
                                            {r.overallStatus === 'pending' ? <FaClock /> : r.overallStatus === 'approved' ? <FaCheckCircle /> : <FaTimesCircle />}
                                            {r.overallStatus === 'pending' ? 'Chờ duyệt' : r.overallStatus === 'approved' ? 'Đã duyệt' : 'Bị từ chối'}
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                                        <div>
                                            <p className="text-gray-500 flex items-center gap-1"><FaUser className="text-xs" /> Khách hàng</p>
                                            <p className="font-semibold">{r.customerName || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 flex items-center gap-1"><FaUser className="text-xs" /> Chủ xe</p>
                                            <p className="font-semibold">{r.supplierName || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 flex items-center gap-1"><FaFileContract className="text-xs" /> Hợp đồng</p>
                                            <p className="font-semibold font-mono">{r.contractCode || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 flex items-center gap-1"><FaMoneyBillWave className="text-xs" /> Số tiền hoàn</p>
                                            <p className="font-bold text-orange-600">{formatCurrency(r.refundAmount)}</p>
                                        </div>
                                    </div>

                                    <div className="text-sm mb-4">
                                        <p className="text-gray-500">Lý do:</p>
                                        <p className="text-gray-700 italic">{r.reason || 'Không nêu lý do'}</p>
                                    </div>

                                    {/* Approval status */}
                                    <div className="flex items-center gap-4 text-xs">
                                        <span className={`px-2 py-1 rounded ${statusColors[r.customerApproval]}`}>
                                            KH: {r.customerApproval}
                                        </span>
                                        <span className={`px-2 py-1 rounded ${statusColors[r.supplierApproval]}`}>
                                            Chủ xe: {r.supplierApproval}
                                        </span>
                                        <span className={`px-2 py-1 rounded ${statusColors[r.adminApproval]}`}>
                                            Admin: {r.adminApproval}
                                        </span>
                                        <span className="text-gray-400 ml-auto">{formatDate(r.createdAt)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            {r.overallStatus === 'pending' && r.adminApproval === 'pending' && (
                                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                                    <button
                                        onClick={() => handleRespond(r.refundRequestId, 'approved')}
                                        disabled={responding === r.refundRequestId}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50"
                                    >
                                        <FaCheckCircle /> Accept
                                    </button>
                                    <button
                                        onClick={() => handleRespond(r.refundRequestId, 'rejected')}
                                        disabled={responding === r.refundRequestId}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition font-semibold disabled:opacity-50"
                                    >
                                        <FaTimesCircle /> Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RefundManagement;
