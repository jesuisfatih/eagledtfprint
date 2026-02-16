'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Design Approval Portal (Customer Facing)
 * Allows customers to review and approve/reject their designs.
 */
export default function DesignApprovalPage() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10800'}/api/v1/penpot/public/projects/${id}`);
        if (!res.ok) throw new Error('Design project not found or expired.');
        setProject(await res.json());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [id]);

  const handleAction = async (action: 'approve' | 'reject') => {
    setActionLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10800'}/api/v1/penpot/public/projects/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'reject' ? JSON.stringify({ notes: 'Rejected by customer' }) : undefined
      });

      if (res.ok) {
        setSuccess(action === 'approve' ? 'Design approved! We are starting production.' : 'Design rejected. Our team will contact you.');
        setProject({ ...project, status: action === 'approve' ? 'APPROVED' : 'REJECTED' });
      } else {
        alert('Failed to process action. Please try again.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="spinner-apple" />
      <p className="mt-4 text-gray-500 font-medium">Loading your design...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-20 text-center">
      <div className="text-red-500 text-6xl mb-6">⚠️</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Oops! Something went wrong</h1>
      <p className="text-gray-600 max-w-sm">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 z-30">
        <div className="flex items-center gap-12">
           <span className="text-xl font-extrabold tracking-tight text-black">EAGLE <span className="text-blue-600">ENGINE</span></span>
           <div className="h-6 w-px bg-gray-200" />
           <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">{project?.merchantName}</span>
        </div>
        <div className="flex items-center gap-4">
           {project?.status === 'APPROVED' ? (
             <div className="px-4 py-1.5 bg-green-50 text-green-600 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 border border-green-100">
               <div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Approved
             </div>
           ) : project?.status === 'REJECTED' ? (
             <div className="px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 border border-red-100">
               <div className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Rejected
             </div>
           ) : (
             <div className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-100 animate-pulse">
               Pending Your Approval
             </div>
           )}
        </div>
      </header>

      <main className="pt-16 flex flex-col h-[calc(100vh)]">
        {/* Penpot Iframe */}
        <div className="flex-1 bg-gray-100 relative overflow-hidden group">
           {project?.viewUrl ? (
             <iframe
               src={project.viewUrl}
               className="w-full h-full border-none"
               allow="fullscreen"
             />
           ) : (
             <div className="flex items-center justify-center h-full text-gray-400">
               Preview not available for this design.
             </div>
           )}

           {/* Hover Prompt */}
           <div className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-black/80 text-white text-xs font-medium rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
             Click and drag to explore the design
           </div>
        </div>

        {/* Action Bar */}
        {success ? (
          <div className="p-8 bg-black text-white flex items-center justify-between animate-in slide-in-from-bottom duration-500">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-xl">✓</div>
                <div>
                   <h3 className="font-bold text-lg">{success}</h3>
                   <p className="text-gray-400 text-sm">You can close this window safely.</p>
                </div>
             </div>
             <button className="px-6 py-2 border border-gray-700 rounded-full hover:bg-gray-900 transition-colors">Order Status</button>
          </div>
        ) : !['APPROVED', 'REJECTED'].includes(project?.status) ? (
          <div className="p-8 bg-white border-t border-gray-100 flex items-center justify-between">
             <div>
                <h3 className="font-extrabold text-xl text-black">{project?.title || 'Design Review'}</h3>
                <p className="text-gray-500 text-sm">Please review the dimensions and quality before approving.</p>
             </div>
             <div className="flex gap-4">
                <button
                  onClick={() => handleAction('reject')}
                  disabled={actionLoading}
                  className="px-8 py-3 rounded-full font-bold text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all border border-gray-200 disabled:opacity-50"
                >
                  Reject & Request Edit
                </button>
                <button
                  onClick={() => handleAction('approve')}
                  disabled={actionLoading}
                  className="px-12 py-3 bg-black text-white rounded-full font-extrabold shadow-xl hover:bg-blue-600 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-3"
                >
                  {actionLoading ? <div className="spinner-apple sm white" /> : 'Approve for Print'}
                </button>
             </div>
          </div>
        ) : (
           <div className="p-6 bg-gray-50 text-center text-gray-500 text-sm border-t border-gray-100">
              This design has already been processed. Status: <span className="font-bold">{project.status}</span>
           </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .spinner-apple {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(0,0,0,0.1);
          border-top-color: #000;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .spinner-apple.sm { width: 16px; height: 16px; border-width: 2px; }
        .spinner-apple.white { border-top-color: #fff; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
