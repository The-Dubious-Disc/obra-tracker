'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useProjectSelection } from '@/contexts/ProjectContext';

type UserRole = 'admin' | 'editor' | 'viewer';

interface UserRoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('viewer');
  const { selectedProjectId, isInitialized } = useProjectSelection();

  useEffect(() => {
    if (!isInitialized) return;
    
    let cancelled = false;

    async function fetchRole() {
      if (!selectedProjectId) {
        if (!cancelled) setRole('viewer');
        return;
      }

      try {
        const res = await fetch(`/api/projects/${selectedProjectId}/membership`);
        if (!res.ok) {
          if (!cancelled) setRole('viewer');
          return;
        }
        const data = await res.json();
        if (!cancelled) setRole(data.rol as UserRole);
      } catch {
        if (!cancelled) setRole('viewer');
      }
    }

    fetchRole();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, isInitialized]);

  return (
    <UserRoleContext.Provider value={{ role, setRole }}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
}
