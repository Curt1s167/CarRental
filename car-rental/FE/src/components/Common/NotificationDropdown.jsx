import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBell, FaCheck, FaTimes, FaCheckCircle, FaTimesCircle, FaFileContract, FaMoneyBillWave } from 'react-icons/fa';
import { toast } from 'react-toastify';
import {
    getNotifications,
    markAllNotificationsRead,
    getUnreadNotificationCount,
    rejectContract,
    signContract,
    respondToRefundRequest
} from '@/services/api';

const NotificationDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [respondingId, setRespondingId] = useState(null);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const fetchNotifications = useCallback(async () => {
        try {
            const data = await getNotifications();
            setNotifications(Array.isArray(data) ? data : []);
        } catch {
            // silent
        }
    }, []);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const count = await getUnreadNotificationCount();
            setUnreadCount(typeof count === 'number' ? count : 0);
        } catch {
            // silent
        }
    }, []);

    // Poll every 30s
    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    // Fetch full list when dropdown opens
    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen, fetchNotifications]);

    // Click outside to close
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsRead();
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch {
            toast.error('Không thể đánh dấu đã đọc');
        }
    };

    const handleContractAction = async (notification, action) => {
        if (!notification.entityId) return;
        setRespondingId(notification.notificationId);
        try {
            if (action === 'accept') {
                // Navigate to contract signing page
                navigate(`/contract-signing/${notification.entityId}`);
                setIsOpen(false);
            } else {
                await rejectContract(notification.entityId, 'Từ chối bởi người dùng');
                toast.success('Đã từ chối hợp đồng');
                fetchNotifications();
                fetchUnreadCount();
            }
        } catch (err) {
            toast.error(err.message || 'Thao tác thất bại');
        } finally {
            setRespondingId(null);
        }
    };

    const handleRefundAction = async (notification, action) => {
        if (!notification.entityId) return;
        setRespondingId(notification.notificationId);
        try {
            await respondToRefundRequest(notification.entityId, action === 'accept' ? 'approved' : 'rejected');
            toast.success(action === 'accept' ? 'Đã chấp thuận hoàn tiền' : 'Đã từ chối hoàn tiền');
            fetchNotifications();
            fetchUnreadCount();
        } catch (err) {
            toast.error(err.message || 'Thao tác thất bại');
        } finally {
            setRespondingId(null);
        }
    };

    const getIcon = (actionType) => {
        switch (actionType) {
            case 'contract_sign_request':
            case 'contract_active':
            case 'contract_rejected':
                return <FaFileContract className="text-blue-500" />;
            case 'refund_approval_request':
            case 'refund_approved':
            case 'refund_rejected':
                return <FaMoneyBillWave className="text-green-500" />;
            default:
                return <FaBell className="text-gray-400" />;
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return 'Vừa xong';
        if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
        return `${Math.floor(diff / 86400)} ngày trước`;
    };

    const renderActions = (notification) => {
        const { actionType, notificationId } = notification;
        const isResponding = respondingId === notificationId;

        if (actionType === 'contract_sign_request') {
            return (
                <div className="flex items-center gap-2 mt-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleContractAction(notification, 'accept'); }}
                        disabled={isResponding}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                        <FaCheck className="text-[10px]" /> Xem & Ký
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleContractAction(notification, 'reject'); }}
                        disabled={isResponding}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-200 transition-all disabled:opacity-50"
                    >
                        <FaTimes className="text-[10px]" /> Từ chối
                    </button>
                </div>
            );
        }

        if (actionType === 'refund_approval_request') {
            return (
                <div className="flex items-center gap-2 mt-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleRefundAction(notification, 'accept'); }}
                        disabled={isResponding}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-all disabled:opacity-50"
                    >
                        <FaCheckCircle className="text-[10px]" /> Accept
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleRefundAction(notification, 'reject'); }}
                        disabled={isResponding}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-200 transition-all disabled:opacity-50"
                    >
                        <FaTimesCircle className="text-[10px]" /> Reject
                    </button>
                </div>
            );
        }

        if (actionType === 'contract_active') {
            return (
                <div className="mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-lg">
                        <FaCheckCircle className="text-[10px]" /> Đã ký hoàn tất
                    </span>
                </div>
            );
        }

        if (actionType === 'refund_approved') {
            return (
                <div className="mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-lg">
                        <FaCheckCircle className="text-[10px]" /> Hoàn tiền đã được duyệt
                    </span>
                </div>
            );
        }

        if (actionType === 'refund_rejected' || actionType === 'contract_rejected') {
            return (
                <div className="mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-lg">
                        <FaTimesCircle className="text-[10px]" /> Đã bị từ chối
                    </span>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative flex items-center text-gray-700 hover:text-blue-600 transition-all duration-300 p-2 rounded-xl hover:bg-blue-50 group"
            >
                <FaBell className="text-lg" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-blue-100 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <h3 className="font-bold text-gray-900 text-base">Thông báo</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                            >
                                Đánh dấu tất cả đã đọc
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[420px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <FaBell className="text-3xl mb-3 opacity-30" />
                                <p className="text-sm">Không có thông báo nào</p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n.notificationId}
                                    className={`px-5 py-4 border-b border-gray-50 hover:bg-blue-50/50 transition-colors cursor-pointer ${
                                        !n.isRead ? 'bg-blue-50/30' : ''
                                    }`}
                                    onClick={() => {
                                        if (n.entityType === 'contract' && n.entityId) {
                                            navigate(`/contract-signing/${n.entityId}`);
                                            setIsOpen(false);
                                        }
                                    }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 flex-shrink-0">
                                            {getIcon(n.actionType)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm leading-relaxed ${!n.isRead ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                                                {n.message}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">{formatTime(n.createdAt)}</p>
                                            {renderActions(n)}
                                        </div>
                                        {!n.isRead && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
