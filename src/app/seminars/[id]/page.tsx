'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULTS, DATE_CONFIG, ROUTES, VALIDATION_RULES, SEMINAR_STATUS } from '@/config/constants';
import type { Session, SeminarStatus } from '@/types';
import { createClient } from '@/utils/supabase/client';
import { 
  Edit, 
  BarChart3, 
  Tag, 
  Calendar, 
  Clock, 
  MapPin, 
  BookOpen, 
  Lightbulb, 
  X,
  ArrowLeft,
  Users,
  CheckSquare,
  UserPlus,
  ClockIcon,
  CheckCircle,
  XCircle,
  Trash2,
  ChevronDown,
  Settings,
  Circle,
  FolderOpen,
  ExternalLink
} from 'lucide-react';
  import { DateTimePicker } from '@/components/ui/date-time-picker';
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
  import { Spinner } from '@/components/ui/spinner';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog";

const categoryTags = ['기초', '백엔드', '프론트엔드', 'AI'];

interface SeminarData {
  id: string;
  title: string;
  description: string;
  capacity: number;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  semester: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
  startDate: string;
  endDate: string | null;
  location: string | null;
  external_url: string | null;
  tags: string[];
  status: string;
  applicationStart: string;
  applicationEnd: string;
  enrollments: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  currentUserEnrollment: {
    status: 'pending' | 'approved' | 'rejected';
    applied_at: string;
  } | null;
  sessions: Session[];
  createdAt: string;
  updatedAt: string;
}

export default function SeminarDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();
  const { user, isAdmin } = useAuth();

  // State for seminar data
  const [seminarData, setSeminarData] = useState<SeminarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<{
    title: string;
    description: string;
    capacity: number;
    location: string;
    startDate: string;
    endDate: string;
    applicationStart: string;
    applicationEnd: string;

    tags: string[];
  } | null>(null);

  // Session management states
  const [newSession, setNewSession] = useState<{
    title: string;
    description: string;
    date: string;
    duration_minutes: number;
    location: string;
    external_url: string;
  }>({ title: '', description: '', date: '', duration_minutes: DEFAULTS.sessionDuration, location: '', external_url: '' });

  const [newTag, setNewTag] = useState('');
  const [addingSession, setAddingSession] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Evidence submission states
  const [submittingEvidence, setSubmittingEvidence] = useState(false);
  const [evidenceData, setEvidenceData] = useState<{
    folderId: string;
    folderName: string;
    googleDriveLink: string;
    fileCount: number;
  } | null>(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);

  // Edit session states
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editSessionData, setEditSessionData] = useState<{
    title: string;
    description: string;
    date: string;
    duration_minutes: number;
    location: string;
    external_url?: string;
  }>({ title: '', description: '', date: '', duration_minutes: DEFAULTS.sessionDuration, location: '', external_url: '' });
  const [updatingSession, setUpdatingSession] = useState(false);

  // Status management states
  const [changingStatus, setChangingStatus] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const canManage = isAdmin || (user?.id === seminarData?.owner.id);

  // Calculate capacity rate for progress bar
  const capacityRate = useMemo(() => {
    if (!seminarData || seminarData.capacity <= 0) return 0;
    return Math.min((seminarData.enrollments.approved / seminarData.capacity) * 100, 100);
  }, [seminarData]);

  // Check if owner can delete seminar with approved users
  // Allow deletion if there's only 1 approved user (assuming it's the owner)
  const canDeleteWithApprovedUsers = useMemo(() => {
    if (!seminarData || !user) return false;
    
    // If owner is the current user and there's only 1 approved user, allow deletion
    const isOwner = seminarData.owner.id === user.id;
    const hasOnlyOneApprovedUser = seminarData.enrollments.approved === 1;
    
    return isOwner && hasOnlyOneApprovedUser;
  }, [seminarData, user]);

  // Helper function to get seminar status info
  const getStatusInfo = (status: string) => {
    const statusKey = status as keyof typeof SEMINAR_STATUS.labels;
    const label = SEMINAR_STATUS.labels[statusKey] || status;
    const colors = SEMINAR_STATUS.colors[statusKey] || SEMINAR_STATUS.colors.draft;
    
    return { label, colors };
  };

  // Helper function to get auth token
  const getAuthToken = async () => {
            const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  // Load seminar data
  useEffect(() => {
    if (!id) return;

    let mounted = true;

    const loadSeminarData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // With SSR pattern, authentication is handled automatically by middleware
        const response = await fetch(`/api/seminars/${id}`, {
          headers: {
          'Content-Type': 'application/json',
        }
        });
        
        if (!mounted) return;
        
        if (!response.ok) {
          throw new Error('Failed to load seminar data');
        }

        const data: SeminarData = await response.json();
        
        if (mounted) {
          setSeminarData(data);
          
          // Initialize edit data
          setEditData({
            title: data.title,
            description: data.description,
            capacity: data.capacity,
            location: data.location || '',
            startDate: data.startDate,
            endDate: data.endDate || '',
            applicationStart: data.applicationStart,
            applicationEnd: data.applicationEnd,
            tags: [...data.tags]
          });
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'An error occurred');
          console.error('Error loading seminar:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSeminarData();

    return () => {
      mounted = false;
    };
  }, [id]);

  // Close status dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showStatusDropdown && !(event.target as Element)?.closest('.status-dropdown-container')) {
        setShowStatusDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStatusDropdown]);

  // Helper function to refresh seminar data
  const refreshSeminarData = async () => {
    try {
      // With SSR pattern, authentication is handled automatically by middleware
      const response = await fetch(`/api/seminars/${id}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh seminar data');
      }

      const data: SeminarData = await response.json();
      setSeminarData(data);
      
      // Update edit data with new dates but keep other edits
      setEditData(prev => prev ? {
        ...prev,
        startDate: data.startDate,
        endDate: data.endDate || ''
      } : null);
    } catch (err) {
      console.error('Error refreshing seminar:', err);
    }
  };

  // Submit evidence to Google Drive
  const handleSubmitEvidence = async () => {
    if (!id || !user?.id) return;

    try {
      setSubmittingEvidence(true);
      console.log('📤 Submitting evidence for seminar:', id);

      const response = await fetch(`/api/seminars/${id}/evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit evidence');
      }

      const data = await response.json();
      setEvidenceData(data.data);
      setShowEvidenceModal(true);
      console.log('✅ Evidence folder created/updated:', data.data);
    } catch (err) {
      console.error('❌ Error submitting evidence:', err);
      alert(err instanceof Error ? err.message : 'Failed to submit evidence');
    } finally {
      setSubmittingEvidence(false);
    }
  };

  const [uploadingFile, setUploadingFile] = useState(false);

  const handleUploadFile = async (file: File | null) => {
    if (!id || !user?.id || !file) return;

    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/seminars/${id}/evidence/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Upload API error response:', err);
        throw new Error(err?.error ? `${err.error}${err.details ? `: ${err.details}` : ''}` : 'Upload failed');
      }

      const result = await res.json();
      // Update evidenceData count and show modal
      setEvidenceData(prev => prev ? { ...prev, fileCount: result.data.fileCount } : prev);
      // Open uploaded file in new tab
      if (result.data.fileLink) {
        window.open(result.data.fileLink, '_blank');
      }
      alert('업로드 완료');
    } catch (err: any) {
      console.error('❌ Error uploading file:', err);
      // Show detailed message when available
      const message = err?.message || (err?.error ? `${err.error}${err.details ? `: ${err.details}` : ''}` : '업로드 실패');
      alert(message);
    } finally {
      setUploadingFile(false);
    }
  };

  // Save seminar data
  const handleSave = async () => {
    if (!editData || !seminarData) return;

    try {
      setSaving(true);
      if (!user?.id) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/seminars/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editData.title,
          description: editData.description,
          capacity: editData.capacity,
          location: editData.location || null,
          applicationStart: editData.applicationStart,
          applicationEnd: editData.applicationEnd,
          tags: editData.tags
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update seminar');
      }

      // Update local state
      setSeminarData(prev => prev ? {
        ...prev,
        title: editData.title,
        description: editData.description,
        capacity: editData.capacity,
        location: editData.location,
        startDate: prev.startDate, // Keep existing startDate
        endDate: prev.endDate, // Keep existing endDate
        applicationStart: editData.applicationStart,
        applicationEnd: editData.applicationEnd,
        tags: editData.tags
      } : null);

      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
      console.error('Error saving seminar:', err);
    } finally {
      setSaving(false);
    }
  };

  // Edit session functions
  const handleEditSession = (session: Session) => {
    setEditingSession(session);
    // Use the stored date as-is for editing
    setEditSessionData({
      title: session.title,
      description: session.description || '',
      date: session.date, // Use stored date directly
      duration_minutes: session.duration_minutes,
      location: session.location || '',
      external_url: session.external_url || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdateSession = async () => {
    if (!editingSession || !seminarData) return;

    try {
      setUpdatingSession(true);
      setError('');

      const response = await fetch(`/api/seminars/${seminarData.id}/sessions/${editingSession.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editSessionData.title,
          description: editSessionData.description,
          date: editSessionData.date,
          duration_minutes: editSessionData.duration_minutes,
          location: editSessionData.location,
          external_url: editSessionData.external_url,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refresh seminar data by triggering a re-fetch
      const refreshResponse = await fetch(`/api/seminars/${seminarData.id}`);
      if (refreshResponse.ok) {
        const refreshedData = await refreshResponse.json();
        setSeminarData(refreshedData);
      }
      
      // Reset form and close modal - no success message needed
      setEditingSession(null);
      setEditSessionData({ title: '', description: '', date: '', duration_minutes: DEFAULTS.sessionDuration, location: '', external_url: '' });
      setEditDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update session');
      console.error('Error updating session:', err);
    } finally {
      setUpdatingSession(false);
    }
  };

  // Add session
  const handleAddSession = async () => {
    if (!newSession.title || !newSession.date) return;

    try {
      setAddingSession(true);
      if (!user?.id) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/seminars/${id}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
      title: newSession.title,
          description: newSession.description || null,
      date: newSession.date,
          duration_minutes: newSession.duration_minutes,
          location: newSession.location || null,
          external_url: newSession.external_url || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const newSessionData: Session = await response.json();
      
      // Update local state
      setSeminarData(prev => prev ? {
        ...prev,
                        sessions: [...prev.sessions, newSessionData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      } : null);

      // Reset form
      setNewSession({ title: '', description: '', date: '', duration_minutes: DEFAULTS.sessionDuration, location: '', external_url: '' });

      // Refresh seminar data to get updated start/end dates
      await refreshSeminarData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add session');
      console.error('Error adding session:', err);
    } finally {
      setAddingSession(false);
    }
  };

  // Delete session
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('이 세션을 삭제하시겠습니까?')) return;

    try {
      if (!user?.id) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/seminars/${id}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      // Update local state
      setSeminarData(prev => prev ? {
        ...prev,
        sessions: prev.sessions.filter(s => s.id !== sessionId)
      } : null);

      // Refresh seminar data to get updated start/end dates
      await refreshSeminarData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
      console.error('Error deleting session:', err);
    }
  };

  // Delete seminar
  const handleDeleteSeminar = async () => {
    if (!seminarData || !user?.id) return;

    try {
      setDeleting(true);

      const response = await fetch(`/api/seminars/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete seminar');
      }

      const result = await response.json();
      console.log('Seminar deleted successfully:', result.deletedSeminar?.title);

      // Redirect to seminars list after successful deletion
      router.push(ROUTES.seminars);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete seminar');
      console.error('Error deleting seminar:', err);
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus: SeminarStatus) => {
    if (!seminarData || !user?.id || changingStatus) return;

    try {
      setChangingStatus(true);
      setShowStatusDropdown(false);

      const response = await fetch(`/api/seminars/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update seminar status');
      }

      // Update local state
      setSeminarData(prev => prev ? {
        ...prev,
        status: newStatus
      } : null);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
      console.error('Error updating seminar status:', err);
    } finally {
      setChangingStatus(false);
    }
  };

  // Handle enrollment
  const handleEnroll = () => {
    if (!user) {
      router.push(ROUTES.login + `?redirect=${encodeURIComponent(ROUTES.seminarDetail(id || ''))}`);
      return;
    }
    if (!seminarData || seminarData.enrollments.approved >= seminarData.capacity) return;
    
    // TODO: Implement enrollment API call
    console.log('Enrollment feature to be implemented');
  };

  // Tag management
  const handleAddTag = () => {
    if (!editData) return;
    const tag = newTag.trim();
    if (!tag) return;
    if (editData.tags.length >= VALIDATION_RULES.seminar.maxTags) return;
    if (editData.tags.includes(tag)) return;
    
    setEditData(prev => prev ? { ...prev, tags: [...prev.tags, tag] } : null);
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    if (!editData) return;
    setEditData(prev => prev ? { ...prev, tags: prev.tags.filter(t => t !== tag) } : null);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
                    <LoadingSpinner />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !seminarData) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <p className="text-destructive mb-4">{error || '세미나를 찾을 수 없습니다.'}</p>
            <Button onClick={() => router.push(ROUTES.seminars)}>목록으로 돌아가기</Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{seminarData.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-secondary text-foreground">
                {seminarData.semester.name}
              </span>
              
              {/* Status Badge with Optional Dropdown */}
              {canManage ? (
                <div className="relative status-dropdown-container">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    disabled={changingStatus}
                    className={`
                      gap-1 text-xs font-medium
                      ${getStatusInfo(seminarData.status).colors.bg} 
                      ${getStatusInfo(seminarData.status).colors.text}
                      ${getStatusInfo(seminarData.status).colors.border}
                      ${getStatusInfo(seminarData.status).colors.darkBg}
                      ${getStatusInfo(seminarData.status).colors.darkText}
                      hover:opacity-80 disabled:opacity-50
                    `}
                  >
                    <Circle className="w-2 h-2 fill-current" />
                    {changingStatus ? '변경 중...' : getStatusInfo(seminarData.status).label}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                  
                  {/* Status Dropdown */}
                  {showStatusDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-10 min-w-32">
                      {SEMINAR_STATUS.order.map((status) => (
                        <Button
                          key={status}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(status)}
                          disabled={changingStatus}
                          className={`
                            w-full justify-start px-3 py-2 text-xs h-auto
                            first:rounded-t-lg last:rounded-b-lg gap-2
                            ${seminarData.status === status ? 'bg-muted' : ''}
                          `}
                        >
                          <Circle 
                            className={`
                              w-2 h-2 fill-current
                              ${getStatusInfo(status).colors.text}
                            `}
                          />
                          {getStatusInfo(status).label}
                          {seminarData.status === status && <span className="text-muted-foreground">(현재)</span>}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <span className={`
                  inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border
                  ${getStatusInfo(seminarData.status).colors.bg} 
                  ${getStatusInfo(seminarData.status).colors.text}
                  ${getStatusInfo(seminarData.status).colors.border}
                  ${getStatusInfo(seminarData.status).colors.darkBg}
                  ${getStatusInfo(seminarData.status).colors.darkText}
                `}>
                  <Circle className="w-2 h-2 fill-current" />
                  {getStatusInfo(seminarData.status).label}
                </span>
              )}
              
              <div className="flex flex-wrap gap-1">
                {seminarData.tags.map(tag => (
                  <Badge key={tag} variant="secondary">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <Button variant="outline" onClick={() => router.push(ROUTES.seminars)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              목록으로
            </Button>
            {canManage && (
              <>
                <Button variant="outline" onClick={() => router.push(`/seminars/${id}/edit`)}>
                  <Edit className="w-4 h-4 mr-2" />
                  세미나 수정
                </Button>
                <Button variant="outline" onClick={() => router.push(`/seminars/${id}/enrollments`)}>
                  <Users className="w-4 h-4 mr-2" />
                  신청 관리
                </Button>
                <Button variant="outline" onClick={() => router.push(`/seminars/${id}/attendance`)}>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  출석 관리
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleSubmitEvidence}
                  disabled={submittingEvidence}
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  {submittingEvidence ? '로딩 중...' : '증빙자료 업로드'}
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleting ? '삭제 중...' : '세미나 삭제'}
                </Button>
              </>
            )}
            {/* Show attendance button for enrolled members */}
            {user && seminarData.currentUserEnrollment?.status === 'approved' && !canManage && (
              <Button variant="outline" onClick={() => router.push(`/seminars/${id}/attendance`)}>
                <BarChart3 className="w-4 h-4 mr-2" />
                내 출석 현황
              </Button>
            )}
            {seminarData.currentUserEnrollment ? (
              // 이미 신청한 사용자 - 모든 신청은 승인 대기
              seminarData.currentUserEnrollment.status === 'pending' ? (
                <Button variant="secondary" disabled>
                  <ClockIcon className="w-4 h-4 mr-2" />
                  승인 대기중
                </Button>
              ) : seminarData.currentUserEnrollment.status === 'approved' ? (
                <Button variant="outline" disabled>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  수강중
                </Button>
              ) : (
                <Button variant="destructive" disabled>
                  <XCircle className="w-4 h-4 mr-2" />
                  신청 거절
                </Button>
              )
            ) : seminarData.enrollments.approved < seminarData.capacity ? (
              // 신청하지 않았고 정원이 남은 경우 - 승인 방식 안내
              <div className="flex flex-col gap-2">
                <Button onClick={handleEnroll}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  신청하기
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  신청 후 세미나 개설자의 승인을 받아야 합니다
                </p>
              </div>
            ) : (
              // 정원 마감
              <Button variant="secondary" disabled>
                <XCircle className="w-4 h-4 mr-2" />
                정원 마감
              </Button>
            )}
          </div>
        </div>

        {/* Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Description Card */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">세미나 설명</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {isEditing && editData ? (
                  <Textarea
                    value={editData.description}
                    onChange={e => setEditData(prev => prev ? { ...prev, description: e.target.value } : null)}
                    className="min-h-40 resize-none"
                    placeholder="세미나에 대한 자세한 설명을 작성해주세요..."
                  />
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {seminarData.description || '설명이 아직 작성되지 않았습니다.'}
                    </p>
                    {seminarData.external_url && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">참고 링크:</p>
                        <a 
                          href={seminarData.external_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline break-all"
                        >
                          {seminarData.external_url}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Category Tags Section */}
                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Tag className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-medium text-foreground">카테고리 태그</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(isEditing && editData ? editData.tags : seminarData.tags).map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                        <Tag className="w-3 h-3" />
                        {tag}
                        {canManage && isEditing && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-1 h-4 w-4 text-muted-foreground hover:text-foreground"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </Badge>
                    ))}
                  </div>
                  {canManage && isEditing && (
                    <>
                      <div className="mt-3 flex gap-2">
                        <Input
                          value={newTag}
                          onChange={e => setNewTag(e.target.value)}
                          placeholder="#태그 추가"
                          className="flex-1"
                        />
                        <Button variant="outline" onClick={handleAddTag}>추가</Button>
                      </div>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {categoryTags.map(ct => (
                          <Button
                            key={ct}
                            variant="secondary"
                            size="sm"
                            onClick={() => { setNewTag(ct); }}
                          >
                            #{ct}
                          </Button>
                        ))}
                      </div>
                    </>
                  )}
                </div>


              </CardContent>
            </Card>
          </div>

          {/* Info Cards */}
          <div className="space-y-4">
            {/* Enrollment Status Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm">신청 현황</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-foreground">
                    {seminarData.enrollments.approved}
                  </span>
                  <span className="text-sm text-muted-foreground">/ {seminarData.capacity}명</span>
                </div>
                <Progress 
                  value={Math.min(capacityRate, 100)} 
                  className={`h-3 ${
                    seminarData.enrollments.approved >= seminarData.capacity 
                      ? '[&>div]:bg-gradient-to-r [&>div]:from-red-500 [&>div]:to-red-600' 
                      : '[&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-primary'
                  }`}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>대기: {seminarData.enrollments.pending}명</span>
                  <span>{Math.round(capacityRate)}% 달성</span>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm">일정 정보</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Seminar Duration */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">세미나 기간</span>
                  </div>
                  {isEditing && editData ? (
                    <div className="space-y-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Input
                              type="date"
                              value={editData.startDate}
                              readOnly
                              className="bg-muted text-muted-foreground cursor-not-allowed"
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>세션 날짜에 따라 자동 계산</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Input
                              type="date"
                              value={editData.endDate}
                              readOnly
                              className="bg-muted text-muted-foreground cursor-not-allowed"
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>세션 날짜에 따라 자동 계산</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ) : (
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <div className="text-sm font-medium text-foreground">
                        {seminarData.startDate 
                          ? new Date(seminarData.startDate).toLocaleDateString('ko-KR', { 
                              year: 'numeric', month: 'long', day: 'numeric' 
                            }) 
                          : '시작일 미정'}
                      </div>
                      <div className="text-xs text-muted-foreground my-1">~</div>
                      <div className="text-sm font-medium text-foreground">
                        {seminarData.endDate 
                          ? new Date(seminarData.endDate).toLocaleDateString('ko-KR', { 
                              year: 'numeric', month: 'long', day: 'numeric' 
                            }) 
                          : '종료일 미정'}
                      </div>
                    </div>
                  )}
                  {isEditing && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-2 rounded-md">
                      <Lightbulb className="w-3 h-3" />
                      세션 일정에 따라 자동 업데이트됩니다
                    </div>
                  )}
                </div>

                {/* Application Period */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <UserPlus className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">신청 기간</span>
                  </div>
                  {isEditing && editData ? (
                    <div className="space-y-2">
                      <Input
                        type="datetime-local"
                        value={editData.applicationStart.slice(0, 16)}
                        onChange={e => setEditData(prev => prev ? { ...prev, applicationStart: e.target.value } : null)}
                      />
                      <Input
                        type="datetime-local"
                        value={editData.applicationEnd.slice(0, 16)}
                        onChange={e => setEditData(prev => prev ? { ...prev, applicationEnd: e.target.value } : null)}
                      />
                    </div>
                  ) : (
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <div className="text-sm text-foreground">
                        {seminarData.applicationStart 
                          ? new Date(seminarData.applicationStart).toLocaleDateString('ko-KR', { 
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                            }) 
                          : '미정'}
                      </div>
                      <div className="text-xs text-muted-foreground my-1">부터</div>
                      <div className="text-sm text-foreground">
                        {seminarData.applicationEnd 
                          ? new Date(seminarData.applicationEnd).toLocaleDateString('ko-KR', { 
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                            }) 
                          : '미정'}
                      </div>
                      <div className="text-xs text-muted-foreground">까지</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Location & Instructor Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm">장소 및 담당자</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Location */}
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">장소</span>
                  {isEditing && editData ? (
                    <Input
                      value={editData.location}
                      onChange={e => setEditData(prev => prev ? { ...prev, location: e.target.value } : null)}
                      placeholder="장소를 입력하세요"
                    />
                  ) : (
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
                      <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium text-foreground">
                        {seminarData.location || '장소 미정'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Instructor */}
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">담당자</span>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {seminarData.owner.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {seminarData.owner.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {seminarData.owner.email}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>



        {/* Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>회차별 관리</CardTitle>
            <CardDescription>
              각 회차의 날짜, 주제, 학습 내용 기록
              <br />
              <span className="text-xs text-muted-foreground">
                                  <Lightbulb className="w-3 h-3 inline mr-1" />
                  세미나 시작/종료 날짜는 세션 날짜에 따라 자동으로 계산됩니다
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {seminarData.sessions
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((s, index) => (
                <div key={s.id} className="border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{index + 1}회차</span>
                        <h3 className="font-medium text-foreground">{s.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(s.date).toLocaleDateString('ko-KR', { 
                            year: 'numeric',
                            month: 'long', 
                            day: 'numeric'
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {new Date(s.date).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {s.duration_minutes}분
                        </span>
                        {s.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {s.location}
                          </span>
                        )}
                      </div>
                      {s.external_url && (
                        <div className="mt-2">
                          <a 
                            href={s.external_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline break-all"
                          >
                            📎 참고 링크
                          </a>
                        </div>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex gap-2">
                        <Dialog open={editDialogOpen && editingSession?.id === s.id} onOpenChange={setEditDialogOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditSession(s)}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              수정
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{index + 1}회차 수정</DialogTitle>
                              <DialogDescription>
                                세션 정보를 수정하세요. 모든 변경사항은 즉시 반영됩니다.
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4 py-4">
                              {/* 첫 번째 행: 주제와 날짜 */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="edit-session-title">주제 *</Label>
                                  <Input
                                    id="edit-session-title"
                                    placeholder="회차 주제를 입력하세요"
                                    value={editSessionData.title}
                                    onChange={e => setEditSessionData(v => ({ ...v, title: e.target.value }))}
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>날짜 및 시간 *</Label>
                                  <DateTimePicker
                                    date={editSessionData.date ? new Date(editSessionData.date) : undefined}
                                    onSelect={(date) => {
                                      if (date) {
                                        // Store the selected date as-is (Korean local time)
                                        setEditSessionData(v => ({ ...v, date: date.toISOString() }));
                                      } else {
                                        setEditSessionData(v => ({ ...v, date: '' }));
                                      }
                                    }}
                                    placeholder="날짜와 시간을 선택하세요"
                                  />
                                </div>
                              </div>

                              {/* 두 번째 행: 지속시간과 장소 */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>지속 시간 *</Label>
                                  <Select
                                    value={editSessionData.duration_minutes.toString()}
                                    onValueChange={(value) => setEditSessionData(v => ({ ...v, duration_minutes: Number(value) }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="지속 시간 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: 16 }, (_, i) => {
                                        const minutes = (i + 1) * 30;
                                        const hours = Math.floor(minutes / 60);
                                        const remainingMinutes = minutes % 60;
                                        const label = hours > 0 
                                          ? `${hours}시간${remainingMinutes > 0 ? ` ${remainingMinutes}분` : ''}`
                                          : `${minutes}분`;
                                        return (
                                          <SelectItem key={minutes} value={minutes.toString()}>
                                            {label}
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>장소</Label>
                                  <Input
                                    placeholder="장소를 입력하세요 (선택)"
                                    value={editSessionData.location}
                                    onChange={e => setEditSessionData(v => ({ ...v, location: e.target.value }))}
                                  />
                                </div>
                              </div>

                              {/* 세 번째 행: 설명 */}
                              <div className="space-y-2">
                                <Label>학습 내용</Label>
                                <Textarea
                                  placeholder="이번 회차에서 다룰 내용을 설명해주세요 (선택)"
                                  value={editSessionData.description}
                                  onChange={e => setEditSessionData(v => ({ ...v, description: e.target.value }))}
                                  rows={3}
                                />
                              </div>

                              {/* 네 번째 행: 참고 링크 */}
                              <div className="space-y-2">
                                <Label>참고 링크 (선택사항)</Label>
                                <Input
                                  type="url"
                                  placeholder="https://example.com"
                                  value={editSessionData.external_url || ''}
                                  onChange={e => setEditSessionData(v => ({ ...v, external_url: e.target.value }))}
                                />
                              </div>

                              {/* 버튼 영역 */}
                              <div className="flex justify-end space-x-2 pt-4 border-t">
                                <Button 
                                  variant="outline" 
                                  disabled={updatingSession}
                                  onClick={() => setEditDialogOpen(false)}
                                >
                                  취소
                                </Button>
                                <Button 
                                  onClick={handleUpdateSession}
                                  disabled={updatingSession || !editSessionData.title || !editSessionData.date}
                                  className="min-w-24"
                                >
                                  {updatingSession ? (
                                    <>
                                      <Spinner className="w-4 h-4 mr-2" />
                                      수정 중...
                                    </>
                                  ) : (
                                    '수정 완료'
                                  )}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleDeleteSession(s.id)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          삭제
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {seminarData.sessions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>등록된 회차가 없습니다</p>
                </div>
              )}

                                              {canManage && (
                  <div className="mt-6">
                    <Separator className="mb-6" />
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">새 회차 추가</h3>
                    
                    <div className="space-y-4">
                      {/* 첫 번째 행: 주제와 날짜 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="session-title">주제 *</Label>
                    <Input
                            id="session-title"
                            placeholder="회차 주제를 입력하세요"
                      value={newSession.title}
                      onChange={e => setNewSession(v => ({ ...v, title: e.target.value }))}
                    />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="session-datetime">날짜 및 시간 *</Label>
                          <DateTimePicker
                            date={newSession.date ? new Date(newSession.date) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                // Store the selected date as-is (Korean local time)
                                setNewSession(v => ({ ...v, date: date.toISOString() }));
                              } else {
                                setNewSession(v => ({ ...v, date: '' }));
                              }
                            }}
                            placeholder="날짜와 시간을 선택하세요"
                          />
                        </div>
                      </div>

                      {/* 두 번째 행: 지속시간과 장소 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="session-duration">지속 시간 *</Label>
                          <Select
                            value={newSession.duration_minutes.toString()}
                            onValueChange={(value) => setNewSession(v => ({ ...v, duration_minutes: Number(value) }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="지속 시간 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {/* 30분부터 8시간까지 30분 단위 */}
                              {Array.from({ length: 16 }, (_, i) => {
                                const minutes = (i + 1) * 30;
                                const hours = Math.floor(minutes / 60);
                                const remainingMinutes = minutes % 60;
                                const label = hours > 0 
                                  ? `${hours}시간${remainingMinutes > 0 ? ` ${remainingMinutes}분` : ''}`
                                  : `${minutes}분`;
                                return (
                                  <SelectItem key={minutes} value={minutes.toString()}>
                                    {label}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="session-location">장소</Label>
                    <Input
                            id="session-location"
                            placeholder="장소를 입력하세요 (선택)"
                      value={newSession.location}
                      onChange={e => setNewSession(v => ({ ...v, location: e.target.value }))}
                    />
                        </div>
                      </div>

                      {/* 세 번째 행: 설명 */}
                      <div className="space-y-2">
                        <Label htmlFor="session-description">학습 내용</Label>
                        <Textarea
                          id="session-description"
                          placeholder="이번 회차에서 다룰 내용을 설명해주세요 (선택)"
                      value={newSession.description}
                      onChange={e => setNewSession(v => ({ ...v, description: e.target.value }))}
                          rows={3}
                    />
                  </div>

                      {/* 네 번째 행: 참고 링크 */}
                      <div className="space-y-2">
                        <Label htmlFor="session-external-url">참고 링크 (선택사항)</Label>
                        <Input
                          id="session-external-url"
                          type="url"
                          placeholder="https://example.com"
                          value={newSession.external_url}
                          onChange={e => setNewSession(v => ({ ...v, external_url: e.target.value }))}
                        />
                      </div>

                      {/* 추가 버튼 */}
                      <div className="flex justify-end pt-2">
                    <Button 
                      onClick={handleAddSession} 
                      disabled={addingSession || !newSession.title || !newSession.date}
                          className="min-w-24"
                        >
                          {addingSession ? (
                            <>
                              <Spinner className="w-4 h-4 mr-2" />
                              추가 중...
                            </>
                          ) : (
                            '회차 추가'
                          )}
                    </Button>
                      </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Evidence Submission Modal */}
        {showEvidenceModal && evidenceData && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-lg max-w-2xl w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">증빙자료 폴더 생성 완료</h3>
                  <p className="text-sm text-muted-foreground">Google Drive에 폴더가 생성되었습니다</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">세미나명</p>
                      <p className="font-medium text-foreground">{evidenceData.folderName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">폴더에 있는 파일</p>
                      <p className="font-medium text-foreground">{evidenceData.fileCount}개</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    className="flex-1"
                    onClick={() => window.open(evidenceData.googleDriveLink, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Google Drive에서 열기
                  </Button>
                </div>

                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">직접 업로드</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        if (!f) return;
                        handleUploadFile(f);
                      }}
                    />
                    <Button
                      onClick={() => {
                        const input = document.querySelector('input[type=file]') as HTMLInputElement | null;
                        if (input && input.files && input.files[0]) {
                          handleUploadFile(input.files[0]);
                        } else {
                          alert('업로드할 파일을 선택하세요');
                        }
                      }}
                      disabled={uploadingFile}
                    >
                      {uploadingFile ? '업로드 중...' : '업로드'}
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">📝 다음 단계:</p>
                  <ol className="text-xs text-foreground space-y-1">
                    <li>1. Google Drive 폴더에 접근합니다</li>
                    <li>2. 활동 증빙 사진을 업로드합니다</li>
                    <li>3. 파일이 자동으로 동기화됩니다</li>
                  </ol>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => setShowEvidenceModal(false)}
                  className="flex-1"
                >
                  닫기
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-lg max-w-md w-full p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">세미나 삭제 확인</h3>
                  <p className="text-sm text-muted-foreground">이 작업은 되돌릴 수 없습니다.</p>
                </div>
              </div>
              
              <div className="space-y-3">
                                 <p className="text-sm text-foreground">
                   <strong>&quot;{seminarData?.title}&quot;</strong> 세미나를 완전히 삭제하시겠습니까?
                 </p>
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-xs text-destructive font-medium mb-2">⚠️ 삭제되는 데이터:</p>
                  <ul className="text-xs text-destructive space-y-1">
                    <li>• 세미나 정보 및 설정</li>
                    <li>• 모든 세션 및 출석 기록</li>
                    <li>• 모든 신청자 및 수강생 정보</li>
                  </ul>
                </div>
                {seminarData?.enrollments.approved > 0 && !isAdmin && !canDeleteWithApprovedUsers && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-xs">
                      다른 승인된 수강생이 있는 세미나입니다. 관리자에게 문의하세요.
                    </AlertDescription>
                  </Alert>
                )}
                {seminarData?.enrollments.approved > 0 && canDeleteWithApprovedUsers && !isAdmin && (
                  <Alert>
                    <AlertDescription className="text-xs">
                      ✅ 승인된 수강생이 본인뿐이므로 삭제가 가능합니다.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteSeminar}
                  disabled={deleting || (seminarData?.enrollments.approved > 0 && !isAdmin && !canDeleteWithApprovedUsers)}
                  className="flex-1"
                >
                  {deleting ? '삭제 중...' : '삭제 확인'}
                </Button>
                                    </div>
                    </div>
                  </div>
                )}
      </div>
    </MainLayout>
  );
}


