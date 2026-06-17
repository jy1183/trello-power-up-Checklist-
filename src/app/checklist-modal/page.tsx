'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';
import { CheckSquare, Clock, RefreshCw, Search, MessageSquare, Tag, AlignLeft, Paperclip, ExternalLink, Send, Plus, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

export default function ChecklistModal() {
  const [todos, setTodos] = useState<any[]>([]);
  const [overdueTodos, setOverdueTodos] = useState<any[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(true);

  const [trello, setTrello] = useState<any>(null);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityLimit, setActivityLimit] = useState(30);
  const [hasMoreActivity, setHasMoreActivity] = useState(true);
  const [loadingMoreActivity, setLoadingMoreActivity] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Card Modal states
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [addingChecklistId, setAddingChecklistId] = useState<string | null>(null);
  const [newCheckItemName, setNewCheckItemName] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // New Checklist Item Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalDayOffset, setAddModalDayOffset] = useState<number | null>(null);
  const [addModalItemName, setAddModalItemName] = useState('');
  const [addModalBoards, setAddModalBoards] = useState<any[]>([]);
  const [selectedAddBoardId, setSelectedAddBoardId] = useState('');
  const [selectedAddBoardUrl, setSelectedAddBoardUrl] = useState('');
  const [cardAddMode, setCardAddMode] = useState<'existing' | 'new'>('existing');
  const [addModalLists, setAddModalLists] = useState<any[]>([]);
  const [selectedAddListId, setSelectedAddListId] = useState('');
  const [addModalCards, setAddModalCards] = useState<any[]>([]);
  const [selectedAddCardId, setSelectedAddCardId] = useState('');
  const [submittingChecklist, setSubmittingChecklist] = useState(false);
  const [loadingAddModalData, setLoadingAddModalData] = useState(false);

  const openAddModal = async (dayOffset: number) => {
    setAddModalDayOffset(dayOffset);
    setIsAddModalOpen(true);
    setAddModalItemName('');
    setSelectedAddBoardId('');
    setSelectedAddBoardUrl('');
    setCardAddMode('existing');
    setAddModalLists([]);
    setSelectedAddListId('');
    setAddModalCards([]);
    setSelectedAddCardId('');
    setLoadingAddModalData(true);
    try {
      const res = await fetch('/api/trello/boards');
      const data = await res.json();
      if (data.boards) {
        setAddModalBoards(data.boards);
      }
    } catch (e) {
      console.error('Failed to fetch boards:', e);
    } finally {
      setLoadingAddModalData(false);
    }
  };

  const handleAddBoardChange = async (boardId: string) => {
    setSelectedAddBoardId(boardId);
    setSelectedAddListId('');
    setSelectedAddCardId('');
    setAddModalLists([]);
    setAddModalCards([]);
    
    const board = addModalBoards.find(b => b.id === boardId);
    let boardUrl = '';
    if (board) {
      boardUrl = board.url;
      setSelectedAddBoardUrl(board.url);
    }

    if (!boardId) return;

    if (cardAddMode === 'new') {
      if (boardUrl) {
        openCardInTrello(boardUrl);
      }
      setIsAddModalOpen(false);
      return;
    }

    setLoadingAddModalData(true);
    try {
      const res = await fetch(`/api/trello/boards?boardId=${boardId}`);
      const data = await res.json();
      if (data.lists) {
        setAddModalLists(data.lists);
      }
    } catch (e) {
      console.error('Failed to fetch lists:', e);
    } finally {
      setLoadingAddModalData(false);
    }
  };

  const handleAddListChange = async (listId: string) => {
    setSelectedAddListId(listId);
    setSelectedAddCardId('');
    setAddModalCards([]);

    if (!listId) return;

    setLoadingAddModalData(true);
    try {
      const res = await fetch(`/api/trello/lists?listId=${listId}`);
      const data = await res.json();
      if (data.cards) {
        setAddModalCards(data.cards);
      }
    } catch (e) {
      console.error('Failed to fetch cards:', e);
    } finally {
      setLoadingAddModalData(false);
    }
  };

  const handleModeChange = async (mode: 'existing' | 'new') => {
    setCardAddMode(mode);
    if (mode === 'new') {
      if (selectedAddBoardUrl) {
        openCardInTrello(selectedAddBoardUrl);
      }
      setIsAddModalOpen(false);
      return;
    }
    if (mode === 'existing' && selectedAddBoardId && addModalLists.length === 0) {
      setLoadingAddModalData(true);
      try {
        const res = await fetch(`/api/trello/boards?boardId=${selectedAddBoardId}`);
        const data = await res.json();
        if (data.lists) {
          setAddModalLists(data.lists);
        }
      } catch (e) {
        console.error('Failed to fetch lists:', e);
      } finally {
        setLoadingAddModalData(false);
      }
    }
  };

  const handleAddChecklistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addModalItemName.trim() || !selectedAddBoardId) return;

    if (cardAddMode === 'new') {
      if (selectedAddBoardUrl) {
        openCardInTrello(selectedAddBoardUrl);
      }
      setIsAddModalOpen(false);
      return;
    }

    if (!selectedAddCardId) return;

    setSubmittingChecklist(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(today);
      if (addModalDayOffset !== null) {
        targetDate.setDate(today.getDate() + addModalDayOffset);
      }
      targetDate.setHours(12, 0, 0, 0);
      const dueIso = targetDate.toISOString();

      const res = await fetch('/api/trello/checklists/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: selectedAddCardId,
          name: addModalItemName.trim(),
          due: dueIso
        })
      });
      const data = await res.json();
      if (res.ok) {
        setIsAddModalOpen(false);
        fetchTodos();
        fetchActivity();
      } else {
        alert('추가 실패: ' + (data.details || data.error));
      }
    } catch (err: any) {
      console.error('Error submitting checklist item:', err);
      alert('에러 발생: ' + err.message);
    } finally {
      setSubmittingChecklist(false);
    }
  };



  const fetchActivity = async (boardId?: string, customLimit?: number, isMore = false) => {
    if (isMore) {
      setLoadingMoreActivity(true);
    } else {
      setLoadingActivity(true);
    }
    try { 
      const limitVal = customLimit || activityLimit;
      const url = boardId ? `/api/trello/activity?boardId=${boardId}&limit=${limitVal}` : `/api/trello/activity?limit=${limitVal}`;
      const res = await fetch(url); 
      const data = await res.json(); 
      if (data.actions) {
        setActivityData(data.actions);
        if (data.actions.length < limitVal) {
          setHasMoreActivity(false);
        } else {
          setHasMoreActivity(true);
        }
      } 
    }
    catch (e) { console.error(e); } 
    finally { 
      setLoadingActivity(false);
      setLoadingMoreActivity(false);
    }
  };

  const handleRefreshActivity = () => {
    setActivityLimit(30);
    setHasMoreActivity(true);
    fetchActivity(undefined, 30);
  };

  const handleLoadMoreActivity = () => {
    const newLimit = activityLimit + 30;
    setActivityLimit(newLimit);
    fetchActivity(undefined, newLimit, true);
  };

  const openCardModal = async (cardId: string) => {
    setSelectedCardId(cardId);
    setLoadingCard(true);
    setCardDetails(null);
    setCommentText('');
    setIsDescriptionExpanded(false);
    try {
      const res = await fetch(`/api/trello/card?cardId=${cardId}`);
      const data = await res.json();
      setCardDetails(data);
    } catch (e) {
      console.error('Failed to fetch card:', e);
    } finally {
      setLoadingCard(false);
    }
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
      // Reload card
      const res = await fetch(`/api/trello/card?cardId=${selectedCardId}`);
      const data = await res.json();
      setCardDetails(data);
      fetchActivity();
    } catch (e) {
      console.error('Failed to add comment', e);
    }
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

  const labelColor = (color: string) => {
    const map: Record<string, string> = { 
      green:'bg-emerald-100 text-emerald-700 border-emerald-200', 
      yellow:'bg-amber-100 text-amber-700 border-amber-200', 
      orange:'bg-orange-100 text-orange-700 border-orange-200', 
      red:'bg-red-100 text-red-700 border-red-200', 
      purple:'bg-purple-100 text-purple-700 border-purple-200', 
      blue:'bg-blue-100 text-blue-700 border-blue-200', 
      sky:'bg-sky-100 text-sky-700 border-sky-200', 
      lime:'bg-lime-100 text-lime-700 border-lime-200', 
      pink:'bg-pink-100 text-pink-700 border-pink-200', 
      black:'bg-slate-200 text-slate-700 border-slate-300' 
    };
    return map[color] || 'bg-slate-100 text-slate-600 border-slate-200';
  };

  useEffect(() => {
    fetchTodos();
    const initT = () => {
      if ((window as any).TrelloPowerUp) {
        const t = (window as any).TrelloPowerUp.iframe();
        setTrello(t);
        try {
          t.updateModal({ fullscreen: true });
        } catch (e) {
          console.error('Failed to force fullscreen modal:', e);
        }
        // By default, fetch integrated activity from all boards
        fetchActivity();
      }
    };
    if ((window as any).TrelloPowerUp) {
      initT();
    } else {
      const interval = setInterval(() => {
        if ((window as any).TrelloPowerUp) {
          initT();
          clearInterval(interval);
        }
      }, 100);
      setTimeout(() => clearInterval(interval), 5000);
    }
  }, []);

  const fetchTodos = async () => {
    setLoadingTodos(true);
    try {
      const res = await fetch('/api/trello/checklists?days=13&overdue=true');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || 'Unknown server error');
      }
      if (data.tasks) setTodos(data.tasks);
      if (data.overdueTasks) setOverdueTodos(data.overdueTasks);
    } catch (e: any) { 
      console.error(e); 
      alert('서버 에러 원인: ' + e.message);
    } finally { setLoadingTodos(false); }
  };

  const handleCheck = async (taskId: string, cardId: string, currentState: string) => {
    const newState = currentState === 'complete' ? 'incomplete' : 'complete';
    const updateTask = (t: any) => t.id === taskId ? { ...t, state: newState } : t;
    setTodos(prev => prev.map(updateTask));
    setOverdueTodos(prev => prev.map(updateTask));
    
    try { 
      await fetch('/api/trello/checklists', { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ cardId, itemId: taskId, state: newState }) 
      }); 
    } catch (err: any) {
      console.error('Error updating task:', err);
      if (err.response && err.response.data) {
        console.error('Detailed API Error:', err.response.data);
      }
      const revertTask = (t: any) => t.id === taskId ? { ...t, state: currentState } : t; 
      setTodos(prev => prev.map(revertTask)); 
      setOverdueTodos(prev => prev.map(revertTask));
    }
  };

  const openCardInTrello = (cardUrl: string) => {
    // Attempt to force a small popup window. 
    // Modern browsers sometimes ignore these unless 'popup=yes' or specific features are used.
    const width = 1100;
    const height = 800;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const features = `width=${width},height=${height},left=${left},top=${top},popup=yes,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`;
    
    const newWindow = window.open(cardUrl, '_blank', features);
    if (newWindow) {
      newWindow.focus();
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
    setTodos(prev => {
      if (prev.some(t => t.id === task.id)) return prev.map(updateTask);
      return [...prev, { ...task, dayIndex: targetDayOffset, due: newDueIso }];
    });
    if (task.dayIndex === -1) {
      setOverdueTodos(prev => prev.filter(t => t.id !== task.id));
    }
    try { await fetch('/api/trello/checklists', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId: task.cardId, itemId: task.id, dueDate: newDueIso }) }); }
    catch (err) { 
      console.error(err); 
      if (task.dayIndex === -1) {
        setOverdueTodos(prev => [...prev, task]);
        setTodos(prev => prev.filter(t => t.id !== task.id));
      } else {
        setTodos(prev => prev.map(t => t.id === task.id ? task : t)); 
      }
    }
  };

  const getDayName = (offset: number) => {
    const dates = ['일', '월', '화', '수', '목', '금', '토'];
    const d = new Date(); d.setDate(d.getDate() + offset);
    if (offset === 0) return '오늘 (' + (d.getMonth() + 1) + '/' + d.getDate() + ')';
    return dates[d.getDay()] + ' (' + (d.getMonth() + 1) + '/' + d.getDate() + ')';
  };

  const getActivityText = (a: any) => {
    switch(a.type) {
      case 'createCard': return `카드 생성`;
      case 'updateCard': 
        if (a.listBefore && a.listAfter) return `이동: ${a.listBefore} → ${a.listAfter}`;
        return `카드 수정`;
      case 'updateCheckItemStateOnCard':
        return a.checkItemState === 'complete' ? `체크 완료: ${a.checkItem}` : `체크 해제: ${a.checkItem}`;
      case 'commentCard': return `댓글 추가`;
      case 'addAttachmentToCard': return `첨부파일 추가`;
      case 'addMemberToCard': return `멤버 추가`;
      default: return `활동: ${a.type}`;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '방금'; if (mins < 60) return mins + '분 전';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + '시간 전';
    return Math.floor(hours / 24) + '일 전';
  };

  const filteredTodos = todos.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.cardName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMember = !selectedMemberId || (t.members && t.members.some((m: any) => m.id === selectedMemberId));
    return matchesSearch && matchesMember;
  });

  const filteredOverdue = overdueTodos.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.cardName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMember = !selectedMemberId || (t.members && t.members.some((m: any) => m.id === selectedMemberId));
    return matchesSearch && matchesMember;
  });

  // Extract unique members from all tasks for filter
  const allMembers = Array.from(new Set([
    ...todos.flatMap(t => t.members || []),
    ...overdueTodos.flatMap(t => t.members || [])
  ].map(m => m.id))).map(id => {
    const member = [...todos, ...overdueTodos].flatMap(t => t.members || []).find(m => m.id === id);
    return member;
  });

  return (
    <div className="w-full h-full overflow-hidden flex flex-col bg-[#fcfbf7]">
      <Script src="https://p.trellocdn.com/power-up.min.js" strategy="beforeInteractive" />
      <div className="p-4 border-b border-black/5 flex justify-between items-center bg-white/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="검색..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-slate-100 hover:bg-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-100 border-none rounded-full text-sm w-[180px] transition-all outline-none"
            />
          </div>

          {allMembers.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-100/60 p-1.5 rounded-full border border-black/5 shadow-inner">
              <button
                onClick={() => setSelectedMemberId(null)}
                className={`w-7 h-7 rounded-full text-[10px] font-extrabold transition-all border flex items-center justify-center shrink-0 shadow-sm ${!selectedMemberId ? 'bg-sky-500 border-sky-600 text-white shadow-sm ring-2 ring-sky-100' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              >
                ALL
              </button>
              <div className="flex items-center gap-1 overflow-x-auto max-w-[400px] no-scrollbar">
                {allMembers.map((m: any) => {
                  if (!m) return null;
                  const isSelected = selectedMemberId === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMemberId(isSelected ? null : m.id)}
                      className={`w-7 h-7 rounded-full border flex items-center justify-center text-[9px] font-bold overflow-hidden transition-all shrink-0 hover:scale-105 active:scale-95 ${isSelected ? 'border-sky-500 ring-2 ring-sky-100 scale-105 shadow-sm bg-white' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      title={m.fullName}
                    >
                      {m.avatarUrl ? (
                        <img src={`${m.avatarUrl}/30.png`} alt={m.fullName} className="w-full h-full object-cover" />
                      ) : (
                        m.fullName.charAt(0)
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button className="text-xs bg-slate-200 hover:bg-slate-300 px-4 py-1.5 rounded-full text-slate-600 font-bold transition-all flex items-center gap-1.5" onClick={() => { fetchTodos(); handleRefreshActivity(); }} disabled={loadingTodos}>
            <RefreshCw size={13} className={loadingTodos ? 'animate-spin' : ''} /> {loadingTodos ? '로딩 중' : '새로고침'}
          </button>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-5 bg-[#f6f5f0] relative min-w-0 custom-scrollbar">
        <div className={`flex gap-4 h-full transition-opacity duration-300 ${loadingTodos ? 'opacity-40' : 'opacity-100'}`} style={{ width: 'max-content' }}>
          {filteredOverdue.length > 0 && (
            <div className="flex flex-col h-full rounded-xl border bg-red-50/30 border-red-200 overflow-hidden w-[260px] shrink-0">
              <div className="py-2.5 px-3 text-center text-sm font-bold border-b bg-red-100/50 text-red-600 border-red-200 flex items-center justify-center gap-1"><Clock size={13} /> 기한 지남 ({filteredOverdue.length})</div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                {filteredOverdue.map(task => (
                  <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task)} className={`p-2.5 rounded-lg border shadow-sm transition-all cursor-move ${task.state === 'complete' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-red-200 hover:border-red-300'}`}>
                    <div className="flex items-start gap-2">
                      <input type="checkbox" checked={task.state === 'complete'} onChange={() => handleCheck(task.id, task.cardId, task.state)} className="mt-1 w-4 h-4 accent-red-500 rounded cursor-pointer" />
                      <div className="flex-1 min-w-0 relative pb-5">
                        <button onClick={() => openCardInTrello(task.cardUrl)} className={`block text-left w-full text-[13px] font-bold leading-tight hover:text-red-600 transition-colors ${task.state === 'complete' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</button>
                        <div className="text-[11px] text-slate-500 truncate max-w-[170px] mt-1" title={task.cardName}>{task.cardName}</div>
                        {task.due && <div className="text-[10px] text-red-500 mt-1 font-semibold">{new Date(task.due).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</div>}
                        
                        {/* 오른쪽 아래에 해당 체크리스트 담당자 아이콘 표시 */}
                        {task.members && task.members.length > 0 && (
                          <div className="absolute right-0 bottom-0 flex">
                            {task.members.map((m: any) => (
                              <div key={m.id} className="w-5 h-5 rounded-full border border-white bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 overflow-hidden shadow-sm" title={m.fullName}>
                                {m.avatarUrl ? <img src={`${m.avatarUrl}/30.png`} alt={m.fullName} className="w-full h-full object-cover" /> : m.fullName.charAt(0)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Array.from({ length: 14 }, (_, i) => i).map(dayOffset => {
            const dayTasks = filteredTodos.filter(t => t.dayIndex === dayOffset);
            const isToday = dayOffset === 0;
            return (
              <div key={dayOffset} className={`flex flex-col h-full rounded-xl border w-[260px] shrink-0 ${isToday ? 'bg-sky-50/30 border-sky-200' : 'bg-white/40 border-slate-100'} overflow-hidden`} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, dayOffset)}>
                <div className={`py-2.5 px-3 text-center text-sm font-bold border-b ${isToday ? 'bg-sky-100/50 text-sky-700 border-sky-200' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>{getDayName(dayOffset)} ({dayTasks.length})</div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar" onDoubleClick={() => openAddModal(dayOffset)}>
                  {dayTasks.map(task => (
                    <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task)} onDoubleClick={(e) => e.stopPropagation()} className={`p-2.5 rounded-lg border shadow-sm transition-all cursor-move ${task.state === 'complete' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:border-sky-300'}`}>
                      <div className="flex items-start gap-2">
                        <input type="checkbox" checked={task.state === 'complete'} onChange={() => handleCheck(task.id, task.cardId, task.state)} className="mt-1 w-4 h-4 accent-sky-500 rounded cursor-pointer" />
                        <div className="flex-1 min-w-0 relative pb-5">
                          <button onClick={() => openCardInTrello(task.cardUrl)} className={`block text-left w-full text-[13px] font-bold leading-tight hover:text-sky-600 transition-colors ${task.state === 'complete' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</button>
                          <div className="text-[11px] text-slate-500 truncate max-w-[170px] mt-1" title={task.cardName}>{task.cardName}</div>
                          
                          {/* 오른쪽 아래에 해당 체크리스트 담당자 아이콘 표시 */}
                          {task.members && task.members.length > 0 && (
                            <div className="absolute right-0 bottom-0 flex">
                              {task.members.map((m: any) => (
                                <div key={m.id} className="w-5 h-5 rounded-full border border-white bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 overflow-hidden shadow-sm" title={m.fullName}>
                                  {m.avatarUrl ? <img src={`${m.avatarUrl}/30.png`} alt={m.fullName} className="w-full h-full object-cover" /> : m.fullName.charAt(0)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {dayTasks.length === 0 && <div className="text-center text-slate-400 text-xs py-4 flex items-center justify-center h-full opacity-50 border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-lg cursor-pointer" onDoubleClick={() => openAddModal(dayOffset)}>가져다 놓기 (더블클릭하여 추가)</div>}
                </div>
              </div>
            );
          })}
        </div>
        {loadingTodos && <div className="absolute inset-0 flex justify-center items-center bg-white/10 backdrop-blur-[1px] z-10"><div className="flex flex-col items-center gap-2"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500"></div><div className="text-xs font-bold text-sky-600 bg-white/80 px-2 py-0.5 rounded shadow-sm">업데이트 중...</div></div></div>}
        </div>
        
        {/* Activity Panel */}
        <div className="w-[336px] shrink-0 border-l border-slate-200 bg-slate-50 flex flex-col">
          <div className="py-2.5 px-3 border-b bg-slate-200/80 border-slate-200 flex items-center justify-between">
            <h3 className="text-[17px] font-bold text-slate-700 flex items-center gap-1.5"><Clock size={16} /> 통합 Activity</h3>
            <button onClick={handleRefreshActivity} className="text-slate-400 hover:text-sky-500 transition-colors" title="새로고침">
              <RefreshCw size={14} className={loadingActivity ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar relative">
            {loadingActivity && activityData.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-400"></div></div>
            ) : activityData.length === 0 ? (
              <div className="text-center text-slate-400 text-[14px] py-10">최근 활동 내역이 없습니다.</div>
            ) : (
              <>
                {activityData.map((a) => (
                  <div key={a.id} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm transition-hover hover:border-slate-300">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[12px] font-bold text-slate-600 overflow-hidden">
                          {a.memberName ? a.memberName.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span className="text-[14px] font-bold text-slate-700">{a.memberName}</span>
                      </div>
                      <div className="text-[12px] text-slate-400 font-medium">
                        {getTimeAgo(a.date)}
                      </div>
                    </div>
                    <div className="text-[14px] text-sky-600 font-medium mb-1">{getActivityText(a)}</div>
                    <div className="text-[12px] text-slate-400 mb-1">{a.boardName}</div>
                    {a.cardName && (
                      <button 
                        onClick={() => openCardInTrello(a.cardUrl)}
                        className="text-[13px] text-slate-500 hover:text-blue-600 text-left w-full truncate flex items-center gap-1 mt-1 font-semibold transition-colors"
                      >
                        <Tag size={12} /> {a.cardName}
                      </button>
                    )}
                    {a.text && (
                      <div className="text-[13px] text-slate-500 mt-1.5 bg-slate-50 p-2 rounded border border-slate-100 flex items-start gap-1">
                        <MessageSquare size={12} className="mt-0.5 shrink-0 text-slate-400" />
                        <span className="italic whitespace-pre-wrap break-all w-full leading-normal">{a.text}</span>
                      </div>
                    )}
                  </div>
                ))}
                {hasMoreActivity && (
                  <div className="pt-1 pb-2">
                    <button 
                      onClick={handleLoadMoreActivity}
                      disabled={loadingMoreActivity}
                      className="w-full py-2 bg-white hover:bg-slate-50 text-slate-500 hover:text-sky-600 border border-slate-200 hover:border-sky-200 rounded-lg text-[14px] font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer outline-none"
                    >
                      {loadingMoreActivity ? (
                        <>
                          <RefreshCw size={14} className="animate-spin text-sky-500" />
                          불러오는 중...
                        </>
                      ) : (
                        '더보기'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Checklist Item Modal Popup */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden flex flex-col transition-all transform scale-100">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-800">신규 체크리스트 추가</h3>
                {addModalDayOffset !== null && (
                  <p className="text-xs text-sky-600 font-semibold mt-0.5">
                    목표 날짜: {getDayName(addModalDayOffset)}
                  </p>
                )}
              </div>
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleAddChecklistSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
              {/* Select Board */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600">보드 선택</label>
                <select 
                  required
                  value={selectedAddBoardId}
                  onChange={(e) => handleAddBoardChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-sky-500 rounded-lg text-sm transition-all outline-none cursor-pointer font-medium"
                >
                  <option value="">보드를 선택하세요</option>
                  {addModalBoards.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Card Mode Selection */}
              {selectedAddBoardId && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-600">카드 추가 방식</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => handleModeChange('existing')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${cardAddMode === 'existing' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      기존 카드 선택
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeChange('new')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${cardAddMode === 'new' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      신규 카드 생성
                    </button>
                  </div>
                </div>
              )}

              {/* Mode-specific Fields */}
              {selectedAddBoardId && cardAddMode === 'existing' && (
                <div className="space-y-3 pt-1 border-t border-dashed border-slate-100">
                  {/* Select List */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600">리스트 선택</label>
                    <select 
                      required
                      value={selectedAddListId}
                      onChange={(e) => handleAddListChange(e.target.value)}
                      disabled={addModalLists.length === 0}
                      className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-sky-500 rounded-lg text-sm transition-all outline-none cursor-pointer font-medium disabled:opacity-60"
                    >
                      <option value="">리스트를 선택하세요</option>
                      {addModalLists.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Select Card */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600">카드 선택</label>
                    <select 
                      required
                      value={selectedAddCardId}
                      onChange={(e) => setSelectedAddCardId(e.target.value)}
                      disabled={addModalCards.length === 0}
                      className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-sky-500 rounded-lg text-sm transition-all outline-none cursor-pointer font-medium disabled:opacity-60"
                    >
                      <option value="">카드를 선택하세요</option>
                      {addModalCards.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Item Name (할 일 이름) */}
                  {selectedAddCardId && (
                    <div className="space-y-1.5 pt-3 border-t border-dashed border-slate-100">
                      <label className="block text-xs font-bold text-slate-600">할 일 이름</label>
                      <input 
                        type="text" 
                        required
                        placeholder="해야 할 체크리스트 항목명을 입력하세요" 
                        value={addModalItemName}
                        onChange={(e) => setAddModalItemName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-sky-500 rounded-lg text-sm transition-all outline-none focus:ring-2 focus:ring-sky-100 font-medium"
                      />
                    </div>
                  )}
                </div>
              )}

              {selectedAddBoardId && cardAddMode === 'new' && (
                <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-sky-700 text-xs font-medium leading-relaxed">
                  💡 <strong>'보드로 이동'</strong>을 누르면 새 창에서 해당 Trello 보드가 열립니다. 보드에서 카드를 자유롭게 생성하고 체크리스트 항목을 관리하실 수 있습니다.
                </div>
              )}
            </form>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-all"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAddChecklistSubmit}
                disabled={submittingChecklist || loadingAddModalData || !addModalItemName.trim() || !selectedAddBoardId || (cardAddMode === 'existing' && !selectedAddCardId)}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm disabled:shadow-none"
              >
                {submittingChecklist ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    저장 중
                  </>
                ) : cardAddMode === 'new' ? (
                  '보드로 이동'
                ) : (
                  '추가하기'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
