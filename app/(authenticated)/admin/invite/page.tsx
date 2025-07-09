'use client';

import React from 'react';

const AdminInvitePage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl md:text-4xl font-logo text-accent-green">Invite a New Admin</h1>
      <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-xl">
        <p className="text-foreground/80">
          The form to invite new administrators will be built here. An email will be sent to the specified address with a special link to grant them admin privileges upon signing up.
        </p>
        {/* Placeholder for the future form */}
        <div className="mt-8 p-6 border-2 border-dashed border-slate-300 rounded-lg">
          <p className="text-center text-slate-500 font-medium">Admin Invitation Form - Coming Soon</p>
        </div>
      </div>
    </div>
  );
};

export default AdminInvitePage; 