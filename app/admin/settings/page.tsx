'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminSettings() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '', // Will be loaded from API
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [userName, setUserName] = useState<string>(''); // Display name
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<string>('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Fetch user information
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const user = await response.json();
          setFormData(prev => ({ ...prev, username: user.username }));
          setUserName(user.name || user.username);
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    };
    fetchUserInfo();
  }, []);

  // Check password strength
  useEffect(() => {
    if (!formData.newPassword) {
      setPasswordStrength('');
      return;
    }

    let strength = '약함';
    let strengthLevel = 0;

    // Length check
    if (formData.newPassword.length >= 8) strengthLevel++;
    if (formData.newPassword.length >= 12) strengthLevel++;

    // Character type checks
    if (/[a-z]/.test(formData.newPassword)) strengthLevel++;
    if (/[A-Z]/.test(formData.newPassword)) strengthLevel++;
    if (/[0-9]/.test(formData.newPassword)) strengthLevel++;
    if (/[^a-zA-Z0-9]/.test(formData.newPassword)) strengthLevel++;

    if (strengthLevel <= 2) strength = '약함';
    else if (strengthLevel <= 4) strength = '보통';
    else strength = '강함';

    setPasswordStrength(strength);
  }, [formData.newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setMessage({ type: 'error', text: '모든 필드를 입력해주세요.' });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' });
      return;
    }

    if (formData.newPassword.length < 6) {
      setMessage({ type: 'error', text: '비밀번호는 최소 6자 이상이어야 합니다.' });
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setMessage({ type: 'error', text: '새 비밀번호는 현재 비밀번호와 달라야 합니다.' });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessage({ type: 'success', text: '비밀번호가 성공적으로 변경되었습니다.' });

        // Clear form (keep username)
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));

        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setMessage({
          type: 'error',
          text: result.error === 'Current password is incorrect'
            ? '현재 비밀번호가 올바르지 않습니다.'
            : result.error || '비밀번호 변경에 실패했습니다.'
        });
      }
    } catch (error) {
      console.error('Password change error:', error);
      setMessage({ type: 'error', text: '서버 오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case '약함': return 'text-red-600';
      case '보통': return 'text-yellow-600';
      case '강함': return 'text-green-600';
      default: return 'text-gray-400';
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">시스템 설정</h1>
        <p className="text-gray-600 mt-2">관리자 계정 보안 설정을 관리합니다.</p>
      </div>

      {/* Security Info */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg mb-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">🔐 보안 안내</h2>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 비밀번호는 최소 6자 이상, 권장 12자 이상입니다.</li>
          <li>• 대소문자, 숫자, 특수문자를 조합하면 더 안전합니다.</li>
          <li>• 정기적으로 비밀번호를 변경하는 것을 권장합니다.</li>
          <li>• 비밀번호 변경 후 다시 로그인해야 합니다.</li>
        </ul>
      </div>

      {/* Password Change Form */}
      <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
        <h2 className="text-xl font-semibold mb-6">관리자 비밀번호 변경</h2>

        {message && (
          <div className={`p-4 rounded-lg mb-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <p className="font-medium">
              {message.type === 'success' ? '✅' : '❌'} {message.text}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Name (readonly) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사용자 이름
            </label>
            <input
              type="text"
              value={userName}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              사용자명: {formData.username}
            </p>
          </div>

          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              현재 비밀번호
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="현재 비밀번호를 입력하세요"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswords.current ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              새 비밀번호
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="새 비밀번호를 입력하세요 (최소 6자)"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswords.new ? '🙈' : '👁️'}
              </button>
            </div>
            {formData.newPassword && (
              <p className={`text-sm mt-1 ${getPasswordStrengthColor()}`}>
                비밀번호 강도: {passwordStrength}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              새 비밀번호 확인
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="새 비밀번호를 다시 입력하세요"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswords.confirm ? '🙈' : '👁️'}
              </button>
            </div>
            {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <p className="text-sm text-red-600 mt-1">
                비밀번호가 일치하지 않습니다.
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </form>
      </div>

      {/* Additional Security Settings (Future) */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">추가 보안 설정</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <div>
              <p className="font-medium text-gray-900">2단계 인증</p>
              <p className="text-xs">추가 보안을 위한 2단계 인증 설정</p>
            </div>
            <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
              준비 중
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <div>
              <p className="font-medium text-gray-900">로그인 기록</p>
              <p className="text-xs">최근 로그인 기록 확인</p>
            </div>
            <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
              준비 중
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <div>
              <p className="font-medium text-gray-900">세션 만료 시간</p>
              <p className="text-xs">자동 로그아웃 시간 설정</p>
            </div>
            <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
              준비 중
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}