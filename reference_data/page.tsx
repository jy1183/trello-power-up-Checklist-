'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ExternalLink, RefreshCw, ChevronRight, Trello, Bell, Link, Clock, CheckSquare, Plus, MessageCircle, AlignLeft, Send, Paperclip } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

const TRELLO_BOARDS = [
  { id: 'zHDWraQl', name: '동천동', url: 'https://trello.com/b/zHDWraQl' },
  { id: 'yFCQoAY5', name: '기타', url: 'https://trello.com/b/yFCQoAY5' },
  { id: 'XOH8XjzB', name: '준비', url: 'https://trello.com/b/XOH8XjzB' },
  { id: 'p4hR5CFc', name: '법인', url: 'https://trello.com/b/p4hR5CFc' },
];

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0.3 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? '-100%' : '100%', opacity: 0.3 }),
};

export default function Home() {
  const [currentPage, setCurrentPage] = useState(0);
  const [slideDirection, setSlideDirection] = useState(0);
  const [news, setNews] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [overdueTodos, setOverdueTodos] = useState<any[]>([]);
  const [showChecklist, setShowChecklist] = useState(false);
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingNotices, setLoadingNotices] = useState(false);
  const [loadingTodos, setLoadingTodos] = useState(true);
  const [selectedBoardIdx, setSelectedBoardIdx] = useState(2);
  const [boardData, setBoardData] = useState<any>(null);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // New Modal states
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [commentText, setCommentText] = useState('');
  
  // New Add Card states
  const [addingCardListId, setAddingCardListId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  
  // Comment Edit states
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  
  // Description Toggle & Checklist Add
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [addingChecklistId, setAddingChecklistId] = useState<string | null>(null);
  const [newCheckItemName, setNewCheckItemName] = useState('');

  useEffect(() => { fetchNews(); fetchTodos(); fetchNotices(); }, []);

  // Click outside to close notification dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showNotifications && notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const navigateTo = useCallback((page: number) => {
    setSlideDirection(page > currentPage ? 1 : -1);
    setCurrentPage(page);
    if (page === 1) {
      if (!boardData) fetchBoardData(TRELLO_BOARDS[selectedBoardIdx].id);
      fetchActivity(TRELLO_BOARDS[selectedBoardIdx].id);
    }
  }, [currentPage, boardData, selectedBoardIdx]);

  // Keyboard navigation + ESC to close checklist
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showChecklist) { setShowChecklist(false); return; }
      if (showChecklist) return;
      if (e.key === 'ArrowRight' && currentPage === 0) navigateTo(1);
      if (e.key === 'ArrowLeft' && currentPage === 1) navigateTo(0);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, showChecklist, navigateTo]);

  // Shift+wheel navigation
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!e.shiftKey || showChecklist) return;
      e.preventDefault();
      if (e.deltaY > 0 && currentPage === 0) navigateTo(1);
      if (e.deltaY < 0 && currentPage === 1) navigateTo(0);
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [currentPage, showChecklist, navigateTo]);

  const fetchBoardData = async (boardId: string) => {
    setLoadingBoard(true);
    try { const res = await fetch('/api/trello/board?boardId=' + boardId); const data = await res.json(); if (data.lists) setBoardData(data); }
    catch (e) { console.error('Failed to fetch board data:', e); }
    finally { setLoadingBoard(false); }
  };
  const switchBoard = (idx: number) => {
    setSelectedBoardIdx(idx);
    fetchBoardData(TRELLO_BOARDS[idx].id);
    fetchActivity(TRELLO_BOARDS[idx].id);
  };

  const fetchActivity = async (boardId: string) => {
    setLoadingActivity(true);
    try { const res = await fetch('/api/trello/activity?boardId=' + boardId + '&limit=30'); const data = await res.json(); if (data.actions) setActivityData(data.actions); }
    catch (e) { console.error(e); } finally { setLoadingActivity(false); }
  };

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try { const res = await fetch('/api/trello/notifications?limit=25'); const data = await res.json(); if (data.notifications) { setNotifications(data.notifications); setUnreadCount(data.unreadCount || 0); } }
    catch (e) { console.error(e); } finally { setLoadingNotifications(false); }
  };
  const markNotificationsRead = async () => {
    try { await fetch('/api/trello/notifications', { method: 'PUT' }); setUnreadCount(0); setNotifications(prev => prev.map(n => ({ ...n, unread: false }))); }
    catch (e) { console.error(e); }
  };
  const getNotificationText = (n: any) => {
    const m: Record<string, string> = { commentCard:'댓글', addedToCard:'카드에 추가됨', removedFromCard:'카드에서 제거됨', addedToBoard:'보드에 추가됨', addAttachmentToCard:'첨부파일 추가', changeCard:'카드 변경', updateCheckItemStateOnCard:'체크리스트 변경', createdCard:'카드 생성', moveCardToBoard:'카드 이동', mentionedOnCard:'멘션됨', addedMemberToCard:'멤버 추가' };
    return m[n.type] || n.type;
  };
  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '방금'; if (mins < 60) return mins + '분 전';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + '시간 전';
    return Math.floor(hours / 24) + '일 전';
  };
  const getActivityText = (a: any) => {
    const m: Record<string, string> = { createCard:'카드 생성', updateCard:'카드 수정', moveCardFromBoard:'카드 이동', moveCardToBoard:'카드 이동', addMemberToCard:'멤버 추가', removeMemberFromCard:'멤버 제거', commentCard:'댓글', addChecklistToCard:'체크리스트 추가', updateCheckItemStateOnCard:'체크아이템', addAttachmentToCard:'첨부', deleteCard:'카드 삭제', createList:'리스트 생성', updateList:'리스트 수정' };
    return m[a.type] || a.type;
  };

  const fetchNews = async () => { setLoadingNews(true); try { const res = await fetch('/api/news'); const data = await res.json(); if (data.articles) setNews(data.articles); } catch (e) { console.error(e); } finally { setLoadingNews(false); } };
  const fetchNotices = async () => { setLoadingNotices(true); try { const res = await fetch('/api/lh'); const data = await res.json(); if (data.notices) setNotices(data.notices); } catch (e) { console.error(e); } finally { setLoadingNotices(false); } };
  const fetchTodos = async () => {
    setLoadingTodos(true);
    try {
      const res = await fetch('/api/trello/checklists?days=13&overdue=true');
      const data = await res.json();
      if (data.tasks) setTodos(data.tasks);
      if (data.overdueTasks) setOverdueTodos(data.overdueTasks);
    } catch (e) { console.error(e); } finally { setLoadingTodos(false); }
  };
  const openChecklistView = () => { fetchTodos(); setShowChecklist(true); };
  const openTrelloPopup = (url: string) => { const w = window.screen.width * 0.7; const h = window.screen.height * 0.7; const l = (window.screen.width - w) / 2; const t = (window.screen.height - h) / 2; window.open(url, '_blank', 'width=' + w + ',height=' + h + ',left=' + l + ',top=' + t + ',scrollbars=yes,resizable=yes'); };

  const openCardModal = async (cardId: string) => {
    setSelectedCardId(cardId);
    setLoadingCard(true);
    setCardDetails(null);
    setCommentText('');
    try {
      const res = await fetch(`/api/trello/card?cardId=${cardId}`);
      const data = await res.json();
      setCardDetails(data);
    } catch (e) { console.error('Failed to fetch card:', e); }
    finally { setLoadingCard(false); }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedCardId) return;
    try {
      await fetch('/api/trello/card/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: selectedCardId, text: commentText })
      });
      setCommentText('');
      // Reload card details
      const res = await fetch(`/api/trello/card?cardId=${selectedCardId}`);
      const data = await res.json();
      setCardDetails(data);
      fetchActivity(TRELLO_BOARDS[selectedBoardIdx].id); // Refresh activity
    } catch (e) { console.error('Failed to add comment', e); }
  };

  const handleEditComment = async (actionId: string) => {
    if (!editingCommentText.trim() || !selectedCardId) return;
    try {
      await fetch('/api/trello/card/comment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, text: editingCommentText })
      });
      setEditingCommentId(null);
      setEditingCommentText('');
      const res = await fetch(`/api/trello/card?cardId=${selectedCardId}`);
      const data = await res.json();
      setCardDetails(data);
    } catch (e) { console.error('Failed to edit comment', e); }
  };

  const handleOneDriveAttach = () => {
    if (typeof (window as any).OneDrive === 'undefined') {
      alert('OneDrive 스크립트가 아직 로드되지 않았습니다.');
      return;
    }
    (window as any).OneDrive.open({
      clientId: "f05fbc59-1d18-49f4-a6c3-d2315266af5b",
      action: "query",
      multiSelect: false,
      advanced: { redirectUri: window.location.origin },
      success: async function (files: any) {
        if (files && files.value && files.value.length > 0) {
          const file = files.value[0];
          try {
            await fetch('/api/trello/card/attachment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cardId: selectedCardId, name: file.name, url: file.webUrl })
            });
            const res = await fetch(`/api/trello/card?cardId=${selectedCardId}`);
            const data = await res.json();
            setCardDetails(data);
          } catch (e) { console.error('Failed to attach OneDrive file', e); }
        }
      },
      cancel: function () { console.log('OneDrive picker cancelled'); },
      error: function (e: any) { console.error('OneDrive picker error', e); alert('OneDrive 연동 오류: ' + (e?.message || JSON.stringify(e))); }
    });
  };

  const handleAddCard = async (listId: string) => {
    if (!newCardTitle.trim()) return;
    try {
      await fetch('/api/trello/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idList: listId, name: newCardTitle })
      });
      setAddingCardListId(null);
      setNewCardTitle('');
      fetchBoardData(TRELLO_BOARDS[selectedBoardIdx].id); // Refresh board
    } catch (e) { console.error('Failed to add card', e); }
  };

  const handleAddCheckItem = async (checklistId: string) => {
    if (!newCheckItemName.trim()) return;
    try {
      await fetch('/api/trello/checklists/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklistId, name: newCheckItemName })
      });
      setAddingChecklistId(null);
      setNewCheckItemName('');
      if (selectedCardId) {
        const res = await fetch(`/api/trello/card?cardId=${selectedCardId}`);
        const data = await res.json();
        setCardDetails(data);
      }
    } catch (e) { console.error('Failed to add check item', e); }
  };

  const handleDeleteCheckItem = async (checklistId: string, itemId: string) => {
    if (!confirm('항목을 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/trello/checklists/item?checklistId=${checklistId}&itemId=${itemId}`, {
        method: 'DELETE'
      });
      if (selectedCardId) {
        const res = await fetch(`/api/trello/card?cardId=${selectedCardId}`);
        const data = await res.json();
        setCardDetails(data);
      }
    } catch (e) { console.error('Failed to delete check item', e); }
  };

  const handleCheck = async (taskId: string, cardId: string, currentState: string) => {
    const newState = currentState === 'complete' ? 'incomplete' : 'complete';
    const updateTask = (t: any) => t.id === taskId ? { ...t, state: newState } : t;
    setTodos(prev => prev.map(updateTask));
    
    // Optimistic update for modal cardDetails
    if (cardDetails && cardDetails.id === cardId) {
      setCardDetails((prev: any) => {
        if (!prev || !prev.checklists) return prev;
        const newChecklists = prev.checklists.map((cl: any) => ({
          ...cl,
          checkItems: cl.checkItems.map((item: any) => item.id === taskId ? { ...item, state: newState } : item)
        }));
        return { ...prev, checklists: newChecklists };
      });
    }

    try { await fetch('/api/trello/checklists', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId, itemId: taskId, state: newState }) }); }
    catch (e) { 
      console.error(e); 
      const revertTask = (t: any) => t.id === taskId ? { ...t, state: currentState } : t; 
      setTodos(prev => prev.map(revertTask)); 
      if (cardDetails && cardDetails.id === cardId) {
        setCardDetails((prev: any) => {
          if (!prev || !prev.checklists) return prev;
          const newChecklists = prev.checklists.map((cl: any) => ({
            ...cl,
            checkItems: cl.checkItems.map((item: any) => item.id === taskId ? { ...item, state: currentState } : item)
          }));
          return { ...prev, checklists: newChecklists };
        });
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, task: any) => { e.dataTransfer.setData('task', JSON.stringify(task)); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = async (e: React.DragEvent, targetDayOffset: number) => {
    e.preventDefault(); const taskJson = e.dataTransfer.getData('task'); if (!taskJson) return;
    const task = JSON.parse(taskJson); if (task.dayIndex === targetDayOffset) return;
    const currentDue = new Date(task.due); const today = new Date(); today.setHours(0, 0, 0, 0);
    const newDate = new Date(today); newDate.setDate(today.getDate() + targetDayOffset);
    newDate.setHours(currentDue.getHours() || 12, currentDue.getMinutes() || 0, 0);
    const newDueIso = newDate.toISOString();
    const updateTask = (t: any) => t.id === task.id ? { ...t, dayIndex: targetDayOffset, due: newDueIso } : t;
    setTodos(prev => prev.map(updateTask));
    try { await fetch('/api/trello/checklists', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId: task.cardId, itemId: task.id, dueDate: newDueIso }) }); }
    catch (err) { console.error(err); setTodos(prev => prev.map(t => t.id === task.id ? task : t)); }
  };

  const getDayName = (offset: number) => {
    const dates = ['일', '월', '화', '수', '목', '금', '토'];
    const d = new Date(); d.setDate(d.getDate() + offset);
    if (offset === 0) return '오늘 (' + (d.getMonth() + 1) + '/' + d.getDate() + ')';
    return dates[d.getDay()] + ' (' + (d.getMonth() + 1) + '/' + d.getDate() + ')';
  };
  const labelColor = (color: string) => {
    const map: Record<string, string> = { green:'bg-emerald-100 text-emerald-700 border-emerald-200', yellow:'bg-amber-100 text-amber-700 border-amber-200', orange:'bg-orange-100 text-orange-700 border-orange-200', red:'bg-red-100 text-red-700 border-red-200', purple:'bg-purple-100 text-purple-700 border-purple-200', blue:'bg-blue-100 text-blue-700 border-blue-200', sky:'bg-sky-100 text-sky-700 border-sky-200', lime:'bg-lime-100 text-lime-700 border-lime-200', pink:'bg-pink-100 text-pink-700 border-pink-200', black:'bg-slate-200 text-slate-700 border-slate-300' };
    return map[color] || 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col">
      <AnimatePresence initial={false} custom={slideDirection} mode="popLayout">
        {currentPage === 0 && (
          <motion.main key="dashboard" custom={slideDirection} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ type: 'tween', duration: 0.35, ease: 'easeInOut' }} className="dashboard-container relative h-full w-full">
            <header className="dashboard-header flex justify-between items-center px-4">
              <div className="w-24"></div>
              <h1 className="dashboard-title m-0">WELLASSET BOARD</h1>
              <button onClick={() => navigateTo(1)} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-sky-50 border border-sky-200 text-sky-600 hover:bg-sky-100 hover:border-sky-300 transition-all shadow-sm">
                <Trello size={15} /> 트렐로 보드 <ChevronRight size={14} />
              </button>
            </header>
            <div className="dashboard-grid-v2">
              <section className="glass-card news-area">
                <div className="card-header"><h2 className="card-title">부동산 뉴스</h2><div className="text-xs text-slate-400">bdsplanet</div></div>
                <div className="card-content">
                  {loadingNews ? <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-300"></div></div> : <ul>{news.map((item, idx) => (<li key={idx} className="news-item"><a href={item.link} target="_blank" rel="noopener noreferrer" className="news-link">{item.title}</a><span className="news-meta">{item.media}</span></li>))}</ul>}
                </div>
              </section>
              <section className="glass-card calendar-area">
                <div className="card-header"><h2 className="card-title">스케줄</h2></div>
                <div className="card-content p-0 overflow-hidden relative">
                  <iframe src="https://calendar.google.com/calendar/embed?src=e1l3et8im3hak9mnto6r64da64%40group.calendar.google.com&ctz=Asia%2FSeoul&mode=AGENDA" style={{ border: 0, width: "100%", height: "100%", position: 'absolute', top: 0, left: 0 }} frameBorder="0" scrolling="no"></iframe>
                </div>
              </section>
              <section className="glass-card lh-area">
                <div className="card-header">
                  <h2 className="card-title"><a href="https://apply.lh.or.kr/lhapply/apply/pch/list.do?mi=1076" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">LH 매입공고</a></h2>
                  <button className="refresh-btn text-xs bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded text-slate-600" onClick={fetchNotices} disabled={loadingNotices}>{loadingNotices ? '...' : '새로고침'}</button>
                </div>
                <div className="card-content">
                  {notices.length === 0 && !loadingNotices ? <div className="flex h-full items-center justify-center"><p className="text-slate-500 text-sm">데이터가 없습니다.</p></div> : (
                    <table className="lh-table"><thead><tr><th className="w-14">상태</th><th>공고명</th><th className="w-20">공고일</th><th className="w-20">마감일</th></tr></thead><tbody>
                      {notices.map((notice, idx) => (<tr key={idx}><td><span className={`text-[10px] px-1.5 py-0.5 rounded ${notice.state.includes('접수') || notice.state.includes('공고') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{notice.state}</span></td><td className="lh-title-cell"><a href={notice.link} target="_blank" rel="noopener noreferrer">{notice.title}</a></td><td className="text-xs text-slate-400">{notice.noticeDate}</td><td className="text-xs text-slate-400">{notice.deadline}</td></tr>))}
                    </tbody></table>
                  )}
                  {loadingNotices && notices.length === 0 && <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-300"></div></div>}
                </div>
              </section>
            </div>
          </motion.main>
        )}

        {currentPage === 1 && (
          <motion.main key="trello-board" custom={slideDirection} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ type: 'tween', duration: 0.35, ease: 'easeInOut' }} className="h-full w-full flex flex-col" style={{ padding: '1.5rem', maxWidth: '100%', margin: '0 auto' }}>
            <header className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => navigateTo(0)} className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-sky-500 transition-colors"><ArrowLeft size={15} /> 대시보드</button>
                <h1 className="text-xl font-extrabold text-slate-700 tracking-tight">{boardData?.boardName || '트렐로 보드'}</h1>
                {boardData?.boardUrl && <a href={boardData.boardUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-sky-500 transition-colors" title="트렐로에서 열기"><ExternalLink size={14} /></a>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={openChecklistView} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100 hover:border-blue-400 shadow-sm">
                  <CheckSquare size={13} /> 체크리스트
                </button>
                <div className="w-px h-5 bg-slate-200 mx-1"></div>
                {TRELLO_BOARDS.map((board, idx) => (<button key={board.id} onClick={() => switchBoard(idx)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedBoardIdx === idx ? 'bg-sky-50 border-sky-300 text-sky-600 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>{board.name}</button>))}
                <div className="relative" ref={notificationRef}>
                  <button onClick={() => { if (!showNotifications) fetchNotifications(); setShowNotifications(!showNotifications); }} className="relative p-1.5 rounded-full text-slate-400 hover:text-sky-500 hover:bg-sky-50 transition-all" title="알림">
                    <Bell size={18} />
                    {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-1">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                  </button>
                  {showNotifications && (
                    <div className="absolute top-10 right-0 w-[380px] max-h-[500px] bg-white rounded-xl border border-slate-200 shadow-xl z-50 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
                        <h3 className="text-[17px] font-bold text-slate-700">알림</h3>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && <button onClick={markNotificationsRead} className="text-[13px] text-sky-500 hover:text-sky-700 font-semibold transition-colors">모두 읽음</button>}
                          <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none transition-colors">&times;</button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loadingNotifications ? <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500"></div></div>
                        : notifications.length === 0 ? <div className="text-center py-8 text-slate-400 text-[15px]">알림이 없습니다</div>
                        : notifications.map((n) => (
                          <div key={n.id} className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${n.unread ? 'bg-sky-50/30' : ''}`} onClick={() => { if (n.cardUrl) openTrelloPopup(n.cardUrl); }}>
                            <div className="flex items-start gap-2">
                              {n.unread && <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0 mt-1.5"></span>}
                              <div className={`flex-1 min-w-0 ${!n.unread ? 'pl-4' : ''}`}>
                                <div className="text-[14px] font-bold text-slate-600"><span className="text-sky-600">{getNotificationText(n)}</span>{n.cardName && <span className="text-slate-700"> - {n.cardName}</span>}</div>
                                {n.text && <p className="text-[13px] text-slate-500 mt-0.5 line-clamp-2">{n.text}</p>}
                                <div className="flex items-center gap-2 mt-1">{n.boardName && <span className="text-[12px] text-slate-400">{n.boardName}</span>}<span className="text-[12px] text-slate-300">{getTimeAgo(n.date)}</span></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => { fetchBoardData(TRELLO_BOARDS[selectedBoardIdx].id); fetchActivity(TRELLO_BOARDS[selectedBoardIdx].id); }} disabled={loadingBoard} className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-sky-500 hover:border-sky-300 transition-all disabled:opacity-40" title="새로고침"><RefreshCw size={14} className={loadingBoard ? 'animate-spin' : ''} /></button>
              </div>
            </header>
            <div className="flex-1 overflow-hidden min-h-0 relative flex gap-4">
              <div className="flex-1 overflow-x-auto overflow-y-hidden">
                {loadingBoard && !boardData ? (
                  <div className="flex items-center justify-center h-full"><div className="flex flex-col items-center gap-3"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500"></div><span className="text-sm text-slate-400 font-medium">보드 로딩 중...</span></div></div>
                ) : boardData?.lists ? (
                  <div className="flex gap-4 h-full pb-2" style={{ minWidth: boardData.lists.length * 280 + 'px' }}>
                    {boardData.lists.map((list: any) => (
                      <div key={list.id} className="kanban-list flex flex-col rounded-xl border border-slate-200 bg-slate-50/80 w-[272px] shrink-0 overflow-hidden">
                        <div className="px-3 py-2.5 border-b border-slate-200 bg-white/60">
                          <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-700 truncate">{list.name}</h3><span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{list.cards.length}</span></div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                          {list.cards.map((card: any) => (
                            <div key={card.id} className="kanban-card bg-white rounded-lg border border-slate-150 shadow-sm hover:shadow-md hover:border-sky-200 transition-all cursor-pointer group" onClick={() => openCardModal(card.id)}>
                              {card.labels && card.labels.length > 0 && <div className="flex flex-wrap gap-1 px-3 pt-2.5">{card.labels.map((label: any) => <span key={label.id} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${labelColor(label.color)}`} title={label.name}>{label.name || '   '}</span>)}</div>}
                              <div className="px-3 py-2 overflow-hidden">
                                <p className="text-[13px] font-semibold text-slate-700 leading-snug group-hover:text-sky-600 transition-colors" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                  {card.isUrl && card.displayName !== card.name ? (
                                    <span className="flex items-start gap-1"><Link size={12} className="shrink-0 mt-0.5 text-slate-400" /><span>{card.displayName}</span></span>
                                  ) : card.isUrl ? (
                                    <span className="flex items-start gap-1 text-[12px] text-slate-500"><Link size={12} className="shrink-0 mt-0.5 text-slate-400" /><span className="line-clamp-2">{card.name}</span></span>
                                  ) : (
                                    <span>{card.displayName || card.name}</span>
                                  )}
                                </p>
                              </div>
                              {(card.due || (card.badges && (card.badges.checkItems > 0 || card.badges.comments > 0 || card.badges.attachments > 0))) && (
                                <div className="px-3 pb-2 flex items-center gap-2 flex-wrap">
                                  {card.due && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${new Date(card.due) < new Date() ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{new Date(card.due).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>}
                                  {card.badges?.checkItems > 0 && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${card.badges.checkItemsChecked === card.badges.checkItems ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>&#10003; {card.badges.checkItemsChecked}/{card.badges.checkItems}</span>}
                                  {card.badges?.comments > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">&#128172; {card.badges.comments}</span>}
                                  {card.badges?.attachments > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">&#128206; {card.badges.attachments}</span>}
                                </div>
                              )}
                            </div>
                          ))}
                          {list.cards.length === 0 && <div className="text-center text-slate-400 text-xs py-6 opacity-50">카드 없음</div>}
                        </div>
                        {/* Add Card Section */}
                        {addingCardListId === list.id ? (
                          <div className="px-3 py-2 bg-slate-100/50 border-t border-slate-200 flex flex-col gap-2">
                            <input autoFocus type="text" value={newCardTitle} onChange={e => setNewCardTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddCard(list.id); }} className="text-[13px] px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-sky-500" placeholder="카드 제목 입력..." />
                            <div className="flex items-center justify-between">
                              <button onClick={() => handleAddCard(list.id)} className="bg-sky-500 hover:bg-sky-600 text-white px-3 py-1 rounded text-xs font-bold transition-colors">추가</button>
                              <button onClick={() => { setAddingCardListId(null); setNewCardTitle(''); }} className="text-slate-500 hover:text-slate-700 text-xs px-2 transition-colors">취소</button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2 border-t border-slate-100 bg-white/40">
                            <button onClick={() => { setAddingCardListId(list.id); setNewCardTitle(''); }} className="w-full py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-200/50 hover:text-slate-700 rounded flex items-center justify-center gap-1.5 transition-colors"><Plus size={14} /> 카드 추가</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : <div className="flex items-center justify-center h-full"><p className="text-slate-400 text-sm">보드를 선택해주세요.</p></div>}
                {loadingBoard && boardData && <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-[1px] z-10"><div className="flex flex-col items-center gap-2"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div><span className="text-xs text-sky-600 font-bold bg-white/80 px-2 py-0.5 rounded shadow-sm">보드 전환 중...</span></div></div>}
              </div>
              {/* Activity Panel */}
              <div className="w-[280px] shrink-0 flex flex-col rounded-xl border border-slate-200 bg-slate-50/80 overflow-hidden">
                <div className="px-3 py-2.5 border-b border-slate-300 bg-slate-200/80 flex items-center justify-between">
                  <h3 className="text-[15px] font-bold text-slate-700 flex items-center gap-1.5"><Clock size={14} /> Activity</h3>
                  <button onClick={() => fetchActivity(TRELLO_BOARDS[selectedBoardIdx].id)} className="text-slate-400 hover:text-sky-500 transition-colors" title="새로고침"><RefreshCw size={12} className={loadingActivity ? 'animate-spin' : ''} /></button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {loadingActivity && activityData.length === 0 ? (
                    <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500"></div></div>
                  ) : activityData.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">활동 내역 없음</div>
                  ) : activityData.map((a) => (
                    <div key={a.id} className="px-3 py-2.5 border-b border-slate-100 hover:bg-white/60 transition-colors">
                      <div className="text-[13px] text-slate-500"><span className="font-bold text-slate-700">{a.memberName}</span> <span className="text-sky-600">{getActivityText(a)}</span></div>
                      {a.cardName && <div className="text-[12px] text-slate-600 mt-0.5 font-semibold truncate cursor-pointer hover:text-sky-600 transition-colors" onClick={() => { if (a.cardId) openCardModal(a.cardId); }}>{a.cardName}</div>}
                      {a.text && <div className="text-[12px] text-slate-400 mt-0.5 line-clamp-2">{a.text}</div>}
                      {a.listAfter && a.listBefore && <div className="text-[11px] text-slate-400 mt-0.5">{a.listBefore} → {a.listAfter}</div>}
                      {a.checkItem && <div className="text-[11px] text-slate-400 mt-0.5">{a.checkItem} ({a.checkItemState === 'complete' ? '완료' : '미완료'})</div>}
                      <div className="text-[11px] text-slate-300 mt-1">{getTimeAgo(a.date)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.main>
        )}
      </AnimatePresence>

      {/* Checklist Modal */}
      {showChecklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowChecklist(false); }}>
          <div className="bg-[#fcfbf7] w-full max-w-[95%] h-[75vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/50 ring-1 ring-black/5">
            <div className="p-5 border-b border-black/5 flex justify-between items-center bg-white/60 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-700 tracking-tight flex items-center gap-2"><CheckSquare size={20} className="text-blue-500" /> 할일 일정 (기한지남 + 오늘 ~ 2주)</h2>
                <button className="refresh-btn text-xs bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded text-slate-600 transition-colors" onClick={fetchTodos} disabled={loadingTodos}>{loadingTodos ? '...' : '새로고침'}</button>
              </div>
              <button onClick={() => setShowChecklist(false)} className="text-slate-400 hover:text-slate-800 text-3xl transition-colors leading-none">&times;</button>
            </div>
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-5 bg-[#f6f5f0] relative min-w-0">
              <div className={`flex gap-4 h-full transition-opacity duration-300 ${loadingTodos ? 'opacity-40' : 'opacity-100'}`} style={{ width: 'max-content' }}>
                {overdueTodos.length > 0 && (
                  <div className="flex flex-col h-full rounded-xl border bg-red-50/30 border-red-200 overflow-hidden w-[260px] shrink-0">
                    <div className="py-2.5 px-3 text-center text-sm font-bold border-b bg-red-100/50 text-red-600 border-red-200 flex items-center justify-center gap-1"><Clock size={13} /> 기한 지남</div>
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                      {overdueTodos.map(task => (
                        <div key={task.id} className={`p-2.5 rounded-lg border shadow-sm transition-all ${task.state === 'complete' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-red-200 hover:border-red-300'}`}>
                          <div className="flex items-start gap-2">
                            <input type="checkbox" checked={task.state === 'complete'} onChange={() => handleCheck(task.id, task.cardId, task.state)} className="mt-1 w-4 h-4 accent-red-500 rounded cursor-pointer" />
                            <div className="flex-1 min-w-0">
                              <button onClick={() => { openCardModal(task.cardId); setShowChecklist(false); }} className={`block text-left w-full text-[13px] font-bold leading-tight hover:text-red-600 transition-colors ${task.state === 'complete' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</button>
                              <div className="text-[11px] text-slate-500 mt-1 truncate" title={task.cardName}>{task.cardName}</div>
                              {task.due && <div className="text-[10px] text-red-500 mt-0.5 font-semibold">{new Date(task.due).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</div>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {Array.from({ length: 14 }, (_, i) => i).map(dayOffset => {
                  const dayTasks = todos.filter(t => t.dayIndex === dayOffset);
                  const isToday = dayOffset === 0;
                  return (
                    <div key={dayOffset} className={`flex flex-col h-full rounded-xl border w-[260px] shrink-0 ${isToday ? 'bg-sky-50/30 border-sky-200' : 'bg-white/40 border-slate-100'} overflow-hidden`} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, dayOffset)}>
                      <div className={`py-2.5 px-3 text-center text-sm font-bold border-b ${isToday ? 'bg-sky-100/50 text-sky-700 border-sky-200' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>{getDayName(dayOffset)}</div>
                      <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                        {dayTasks.map(task => (
                          <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task)} className={`p-2.5 rounded-lg border shadow-sm transition-all cursor-move ${task.state === 'complete' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:border-sky-300'}`}>
                            <div className="flex items-start gap-2">
                              <input type="checkbox" checked={task.state === 'complete'} onChange={() => handleCheck(task.id, task.cardId, task.state)} className="mt-1 w-4 h-4 accent-sky-500 rounded cursor-pointer" />
                              <div className="flex-1 min-w-0">
                                <button onClick={() => { openCardModal(task.cardId); setShowChecklist(false); }} className={`block text-left w-full text-[13px] font-bold leading-tight hover:text-sky-600 transition-colors ${task.state === 'complete' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</button>
                                <div className="text-[11px] text-slate-500 mt-1 truncate" title={task.cardName}>{task.cardName}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {dayTasks.length === 0 && <div className="text-center text-slate-400 text-xs py-4 flex items-center justify-center h-full opacity-50 border-2 border-dashed border-transparent hover:border-slate-300 rounded-lg">가져다 놓기</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {loadingTodos && <div className="absolute inset-0 flex justify-center items-center bg-white/10 backdrop-blur-[1px] z-10"><div className="flex flex-col items-center gap-2"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500"></div><div className="text-xs font-bold text-sky-600 bg-white/80 px-2 py-0.5 rounded shadow-sm">업데이트 중...</div></div></div>}
            </div>
          </div>
        </div>
      )}

      {/* Card Detail Modal */}
      {selectedCardId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setSelectedCardId(null); }}>
          <div className="bg-white w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
            <button onClick={() => setSelectedCardId(null)} className="absolute top-4 right-5 text-slate-400 hover:text-slate-800 text-2xl transition-colors leading-none z-10">&times;</button>
            {loadingCard ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500"></div>
                <span className="text-sm text-slate-400 font-medium">카드 정보 불러오는 중...</span>
              </div>
            ) : cardDetails ? (
              <>
                <div className="p-6 border-b border-slate-100 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Trello size={16} className="text-sky-500" />
                    <span className="text-xs font-bold text-slate-400">IN LIST</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-800 leading-tight pr-8">{cardDetails.name}</h2>
                  {cardDetails.labels && cardDetails.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {cardDetails.labels.map((label: any) => (
                        <span key={label.id} className={`text-[11px] font-bold px-2 py-1 rounded border ${labelColor(label.color)}`}>{label.name || label.color}</span>
                      ))}
                    </div>
                  )}
                  {cardDetails.shortUrl && (
                    <div className="mt-3">
                      <a href={cardDetails.shortUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-sky-500 hover:text-sky-700 hover:underline">
                        <ExternalLink size={12} /> 트렐로에서 열기
                      </a>
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-slate-50">
                  {/* Description */}
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-700 flex items-center gap-2 mb-3"><AlignLeft size={16} /> 설명</h3>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 text-[14px] text-slate-600 leading-relaxed shadow-sm relative">
                      {cardDetails.desc ? (
                        <>
                          <div className={`overflow-hidden prose prose-sm max-w-none transition-all duration-300 ${isDescriptionExpanded ? '' : 'line-clamp-4 max-h-[6rem]'}`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{cardDetails.desc}</ReactMarkdown>
                          </div>
                          {cardDetails.desc.length > 150 && (
                            <button onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className="mt-2 text-sky-500 font-bold text-[12px] hover:underline">
                              {isDescriptionExpanded ? '접기' : '더보기...'}
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-400 italic">설명이 없습니다.</span>
                      )}
                    </div>
                  </div>

                  {/* Attachments */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[15px] font-bold text-slate-700 flex items-center gap-2"><Paperclip size={16} /> 첨부파일</h3>
                      <button onClick={handleOneDriveAttach} className="text-[12px] bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-colors shadow-sm">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.1 9.4c-.4-3.3-3.2-5.9-6.6-5.9-2.6 0-4.9 1.5-6 3.7-1.1-1.1-2.9-1.5-4.5-.8C.8 7.3 0 8.6 0 10c0 2.2 1.8 4 4 4h15c2.2 0 4-1.8 4-4 0-2.1-1.7-3.9-3.9-4.6z"/></svg>
                        OneDrive 파일 첨부
                      </button>
                    </div>
                    {cardDetails.attachments && cardDetails.attachments.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {cardDetails.attachments.slice().sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4).map((att: any) => (
                          <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg hover:border-sky-300 hover:shadow-sm transition-all group">
                            <div className="w-8 h-8 rounded bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                              <Link size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-semibold text-slate-700 truncate group-hover:text-sky-600">{att.name}</div>
                              <div className="text-[11px] text-slate-400">첨부파일</div>
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[13px] text-slate-400 italic text-center py-4 bg-slate-100/50 rounded-xl border border-slate-200 border-dashed">첨부파일이 없습니다.</div>
                    )}
                  </div>

                  {/* Checklists */}
                  {cardDetails.checklists && cardDetails.checklists.length > 0 && (
                    <div>
                      {cardDetails.checklists.map((cl: any) => {
                        const total = cl.checkItems.length;
                        const completed = cl.checkItems.filter((i: any) => i.state === 'complete').length;
                        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                        return (
                          <div key={cl.id} className="mb-6 last:mb-0">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-[15px] font-bold text-slate-700 flex items-center gap-2"><CheckSquare size={16} /> {cl.name}</h3>
                              <span className="text-[12px] font-bold text-slate-400">{percent}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 rounded-full mb-3 overflow-hidden">
                              <div className="h-full bg-sky-500 rounded-full transition-all duration-300" style={{ width: `${percent}%` }}></div>
                            </div>
                            <div className="space-y-1.5 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                              {cl.checkItems.map((item: any) => (
                                <div key={item.id} className={`group flex items-start gap-2.5 p-2 rounded hover:bg-slate-50 transition-colors ${item.state === 'complete' ? 'opacity-60' : ''}`}>
                                  <input type="checkbox" checked={item.state === 'complete'} onChange={() => handleCheck(item.id, cardDetails.id, item.state)} className="mt-1 w-4 h-4 accent-sky-500 rounded cursor-pointer shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-[14px] leading-tight ${item.state === 'complete' ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}`}>{item.name}</p>
                                  </div>
                                  <button onClick={() => handleDeleteCheckItem(cl.id, item.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all px-1 text-[16px] leading-none" title="삭제">&times;</button>
                                </div>
                              ))}
                              {addingChecklistId === cl.id ? (
                                <div className="p-2 border-t border-slate-100 flex flex-col gap-2">
                                  <input autoFocus type="text" value={newCheckItemName} onChange={e => setNewCheckItemName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddCheckItem(cl.id); }} className="w-full text-[13px] px-2 py-1.5 border border-slate-300 rounded focus:border-sky-400 outline-none" placeholder="항목 이름..." />
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => setAddingChecklistId(null)} className="text-[11px] px-2 py-1 text-slate-500 hover:bg-slate-100 rounded">취소</button>
                                    <button onClick={() => handleAddCheckItem(cl.id)} className="text-[11px] px-3 py-1 bg-sky-500 text-white hover:bg-sky-600 rounded">추가</button>
                                  </div>
                                </div>
                              ) : (
                                <button onClick={() => { setAddingChecklistId(cl.id); setNewCheckItemName(''); }} className="w-full text-left px-3 py-2 text-[12px] font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded transition-colors flex items-center gap-1.5"><Plus size={13} /> 항목 추가</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Comments */}
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-700 flex items-center gap-2 mb-3"><MessageCircle size={16} /> 댓글</h3>
                    <div className="flex flex-col gap-2 mb-4 relative">
                      <textarea value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }} className="w-full p-3 pr-12 text-[14px] border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 resize-none shadow-sm" placeholder="여기에 댓글을 작성하세요..." rows={2} />
                      <button onClick={handleAddComment} disabled={!commentText.trim()} className="absolute right-2 bottom-2 p-1.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:bg-slate-300 transition-colors"><Send size={16} /></button>
                    </div>
                    <div className="space-y-4">
                      {cardDetails.actions?.filter((a: any) => a.type === 'commentCard').map((comment: any) => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-[13px] shrink-0 uppercase">{comment.memberCreator.fullName.charAt(0)}</div>
                          <div className="flex-1 bg-white p-3 rounded-xl rounded-tl-none border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2"><span className="text-[13px] font-bold text-slate-700">{comment.memberCreator.fullName}</span><span className="text-[11px] text-slate-400">{getTimeAgo(comment.date)}</span></div>
                              <button onClick={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.data.text); }} className="text-[11px] text-slate-400 hover:text-sky-500 transition-colors">수정</button>
                            </div>
                            {editingCommentId === comment.id ? (
                              <div className="mt-2 flex flex-col gap-2">
                                <textarea value={editingCommentText} onChange={e => setEditingCommentText(e.target.value)} className="w-full p-2 text-[13px] border border-slate-200 rounded focus:border-sky-400 outline-none resize-none" rows={2} />
                                <div className="flex gap-2 justify-end">
                                  <button onClick={() => setEditingCommentId(null)} className="text-[11px] px-2 py-1 text-slate-500 hover:bg-slate-100 rounded">취소</button>
                                  <button onClick={() => handleEditComment(comment.id)} className="text-[11px] px-3 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded">저장</button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-[14px] text-slate-600 leading-relaxed prose prose-sm max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{comment.data.text}</ReactMarkdown>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {(!cardDetails.actions || cardDetails.actions.filter((a: any) => a.type === 'commentCard').length === 0) && <p className="text-[13px] text-slate-400 italic text-center py-4 bg-slate-100/50 rounded-xl border border-slate-200 border-dashed">아직 댓글이 없습니다.</p>}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">데이터를 불러오지 못했습니다.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
