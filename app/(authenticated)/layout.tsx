'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  UserCircleIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ArrowLeftOnRectangleIcon,
  Cog6ToothIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import "react-big-calendar/lib/css/react-big-calendar.css";

const baseNavLinks = [
  { name: 'Edit Profile', href: '/profile/edit', icon: UserCircleIcon },
  { 
    name: 'Book A Session',
    href: '/book', 
    icon: BuildingStorefrontIcon, 
    isPrimaryCTA: true,
  },
];

const adminNavLinks = [
  { name: 'Admin Dashboard', href: '/admin/dashboard', icon: Cog6ToothIcon, isPrimaryCTA: false },
  { name: 'My Schedule', href: '/admin/schedule', icon: CalendarDaysIcon, isPrimaryCTA: false },
  { name: 'Invite Admin', href: '/admin/invite', icon: UserPlusIcon, isPrimaryCTA: false },
];

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAdmin, loading, logout } = useAuth(); // Using isAdmin from context
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Combine links based on admin status
  const profileNavLinks = isAdmin ? [...baseNavLinks, ...adminNavLinks] : baseNavLinks;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background text-foreground">
        Loading...
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className={`bg-background text-foreground flex`}>
      <aside
        className={`min-h-screen bg-slate-100/80 backdrop-blur-md shadow-lg transition-all duration-300 ease-in-out flex flex-col space-y-4 p-4 
                    ${sidebarOpen ? 'w-64' : 'w-20'}`}
      >
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-foreground/70 hover:text-accent-pink hover:bg-accent-pink/10 rounded-md self-end mb-4 md:mb-6"
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? (
            <ChevronDoubleLeftIcon className="h-6 w-6" />
          ) : (
            <ChevronDoubleRightIcon className="h-6 w-6" />
          )}
        </button>

        <nav className="flex-grow">
          <ul className="space-y-2">
            {profileNavLinks.map((item) => {
              const isActive = (pathname && pathname === item.href) || 
                               (pathname && item.href === '/book' && pathname.startsWith('/book')) ||
                               (pathname && item.href === '/admin/dashboard' && pathname.startsWith('/admin/dashboard')) ||
                               (pathname && item.href === '/admin/schedule' && pathname.startsWith('/admin/schedule')) ||
                               (pathname && item.href === '/admin/invite' && pathname.startsWith('/admin/invite'));
              
              let linkClasses = `flex items-center space-x-3 p-3 rounded-lg transition-colors duration-150 ${!sidebarOpen ? 'justify-center' : ''}`;
              let iconClasses = `h-6 w-6`;
              let textClasses = `font-medium text-sm font-logo whitespace-nowrap`;

              if (item.isPrimaryCTA) {
                linkClasses += ' bg-accent-green text-white hover:bg-accent-green/90 shadow-sm';
                if (isActive) linkClasses += ' ring-2 ring-white/50';
                iconClasses += ' text-white';
              } else {
                linkClasses += isActive 
                  ? ' bg-accent-blue text-white shadow-md' 
                  : ' text-foreground/70 hover:bg-accent-yellow/30 hover:text-foreground';
                iconClasses += isActive ? ' text-white' : ' text-accent-pink';
              }

              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={linkClasses}
                    title={!sidebarOpen ? item.name : undefined}
                  >
                    <item.icon className={iconClasses} />
                    {sidebarOpen && <span className={textClasses}>{item.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <button
            onClick={handleLogout}
            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors duration-150 w-full 
                        text-foreground/70 hover:bg-accent-red/20 hover:text-accent-red 
                        ${!sidebarOpen ? 'justify-center' : ''}`}
            title={!sidebarOpen ? 'Logout' : undefined}
        >
            <ArrowLeftOnRectangleIcon className="h-6 w-6 text-accent-red/80" />
            {sidebarOpen && <span className="font-medium text-sm font-logo whitespace-nowrap">Logout</span>}
        </button>
      </aside>

      <main className="flex-1 p-6 md:p-10">
        {children}
      </main>
    </div>
  );
} 