'use client';

import { useAuth } from '@/components/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Shield,
  ScrollText,
  LogOut,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: '总览', icon: LayoutDashboard },
  { href: '/groups', label: '群组管理', icon: MessageSquare },
  { href: '/admins', label: '代理管理', icon: Shield },
  { href: '/events', label: '事件日志', icon: ScrollText },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="flex h-screen bg-[#F8F9FA]">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col bg-[#1A1A2E] text-white transition-all duration-300',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-[#06C755] flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm whitespace-nowrap">LINE 群管理</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-[#06C755]/20 text-[#06C755]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User info & collapse */}
        <div className="border-t border-white/10 p-3 space-y-2">
          {!collapsed && user && (
            <div className="px-2 py-1">
              <p className="text-sm font-medium truncate">{user.display_name}</p>
              <p className="text-xs text-white/40">
                {user.role === 'super_admin' ? '超级管理员' : '代理'}
              </p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors flex-1"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>退出登录</span>}
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
