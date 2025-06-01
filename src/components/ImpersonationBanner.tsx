import React from 'react';
import { Button } from '@/components/ui/button';
import { UserX, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const ImpersonationBanner: React.FC = () => {
  const { isImpersonating, impersonatedProfile, stopImpersonation } = useAuth();

  if (!isImpersonating || !impersonatedProfile) {
    return null;
  }

  return (
    <div className="bg-yellow-600 border-b border-yellow-500 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <User className="h-5 w-5 text-yellow-100" />
          <span className="text-yellow-100 font-medium">
            You are viewing as: <strong>{impersonatedProfile.discord_username || 'User'}</strong>
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={stopImpersonation}
          className="bg-yellow-700 border-yellow-600 text-yellow-100 hover:bg-yellow-800 hover:text-white"
        >
          <UserX className="h-4 w-4 mr-2" />
          Exit Impersonation
        </Button>
      </div>
    </div>
  );
};

export default ImpersonationBanner;