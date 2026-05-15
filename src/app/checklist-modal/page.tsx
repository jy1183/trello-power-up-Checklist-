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



  const fetchActivity = async (boardId?: string) => {
    setLoadingActivity(true);
    try { 
      const url = boardId ? `/api/trello/activity?boardId=${boardId}&limit=30` : '/api/trello/activity?limit=30';
      const res = await fetch(url); 
      const data = await res.json(); 
      if (data.actions) setActivityData(data.actions); 
    }
    catch (e) { console.error(e); } 
    finally { setLoadingActivity(false); }
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
    // Open in a small popup window to focus on the card and maintain checklist state
    const width = 850;
    const height = 950;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    window.open(
      cardUrl, 
      'TrelloCardPopup', 
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`
    );
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
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#fcfbf7]">
      <Script src="https://p.trellocdn.com/power-up.min.js" strategy="beforeInteractive" />
      <div className="p-4 border-b border-black/5 flex justify-between items-center bg-white/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold text-slate-700 tracking-tight flex items-center gap-2"><CheckSquare size={20} className="text-blue-500" /> 통합 체크리스트</h2>
          
          <div className="flex items-center gap-2">
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
              <select 
                value={selectedMemberId || ''} 
                onChange={(e) => setSelectedMemberId(e.target.value || null)}
                className="bg-slate-100 hover:bg-slate-200 py-1.5 px-4 rounded-full text-sm outline-none transition-all cursor-pointer font-medium text-slate-600 appearance-none border-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">전체 멤버</option>
                {allMembers.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.fullName}</option>
                ))}
              </select>
            )}
          </div>

          <button className="text-xs bg-slate-200 hover:bg-slate-300 px-4 py-1.5 rounded-full text-slate-600 font-bold transition-all flex items-center gap-1.5" onClick={() => { fetchTodos(); fetchActivity(); }} disabled={loadingTodos}>
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
                      <div className="flex-1 min-w-0">
                        <button onClick={() => openCardInTrello(task.cardUrl)} className={`block text-left w-full text-[13px] font-bold leading-tight hover:text-red-600 transition-colors ${task.state === 'complete' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</button>
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="text-[11px] text-slate-500 truncate max-w-[140px]" title={task.cardName}>{task.cardName}</div>
                          {task.members && task.members.length > 0 && (
                            <div className="flex -space-x-1.5">
                              {task.members.map((m: any) => (
                                <div key={m.id} className="w-5 h-5 rounded-full border border-white bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 overflow-hidden" title={m.fullName}>
                                  {m.avatarUrl ? <img src={`${m.avatarUrl}/30.png`} alt={m.fullName} className="w-full h-full object-cover" /> : m.fullName.charAt(0)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {task.due && <div className="text-[10px] text-red-500 mt-1 font-semibold">{new Date(task.due).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</div>}
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
                <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                  {dayTasks.map(task => (
                    <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task)} className={`p-2.5 rounded-lg border shadow-sm transition-all cursor-move ${task.state === 'complete' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:border-sky-300'}`}>
                      <div className="flex items-start gap-2">
                        <input type="checkbox" checked={task.state === 'complete'} onChange={() => handleCheck(task.id, task.cardId, task.state)} className="mt-1 w-4 h-4 accent-sky-500 rounded cursor-pointer" />
                        <div className="flex-1 min-w-0">
                          <button onClick={() => openCardInTrello(task.cardUrl)} className={`block text-left w-full text-[13px] font-bold leading-tight hover:text-sky-600 transition-colors ${task.state === 'complete' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</button>
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="text-[11px] text-slate-500 truncate max-w-[140px]" title={task.cardName}>{task.cardName}</div>
                            {task.members && task.members.length > 0 && (
                              <div className="flex -space-x-1.5">
                                {task.members.map((m: any) => (
                                  <div key={m.id} className="w-5 h-5 rounded-full border border-white bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 overflow-hidden" title={m.fullName}>
                                    {m.avatarUrl ? <img src={`${m.avatarUrl}/30.png`} alt={m.fullName} className="w-full h-full object-cover" /> : m.fullName.charAt(0)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
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
        
        {/* Activity Panel */}
        <div className="w-[280px] shrink-0 border-l border-slate-200 bg-slate-50 flex flex-col">
          <div className="py-2.5 px-3 border-b bg-slate-200/80 border-slate-200 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-slate-700 flex items-center gap-1.5"><Clock size={14} /> 통합 Activity</h3>
            <button onClick={() => fetchActivity()} className="text-slate-400 hover:text-sky-500 transition-colors" title="새로고침">
              <RefreshCw size={12} className={loadingActivity ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar relative">
            {loadingActivity && activityData.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-400"></div></div>
            ) : activityData.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-10">최근 활동 내역이 없습니다.</div>
            ) : activityData.map((a) => (
              <div key={a.id} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm transition-hover hover:border-slate-300">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 overflow-hidden">
                      {a.memberName ? a.memberName.charAt(0).toUpperCase() : '?'}
                    </div>
                    <span className="text-[12px] font-bold text-slate-700">{a.memberName}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {getTimeAgo(a.date)}
                  </div>
                </div>
                <div className="text-[12px] text-sky-600 font-medium mb-1">{getActivityText(a)}</div>
                <div className="text-[10px] text-slate-400 mb-1">{a.boardName}</div>
                {a.cardName && (
                  <button 
                    onClick={() => openCardInTrello(a.cardUrl)}
                    className="text-[11px] text-slate-500 hover:text-blue-600 text-left w-full truncate flex items-center gap-1 mt-1 font-semibold transition-colors"
                  >
                    <Tag size={10} /> {a.cardName}
                  </button>
                )}
                {a.text && (
                  <div className="text-[11px] text-slate-400 mt-1.5 bg-slate-50 p-1.5 rounded flex items-start gap-1">
                    <MessageSquare size={10} className="mt-0.5 shrink-0" />
                    <span className="line-clamp-2 italic">{a.text}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card Detail Modal Overlay */}
      {selectedCardId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4" onClick={(e) => { if (e.target === e.currentTarget) setSelectedCardId(null); }}>
          <div className="bg-white w-full max-w-2xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative border border-white/20">
            <button onClick={() => setSelectedCardId(null)} className="absolute top-5 right-6 text-slate-400 hover:text-slate-800 transition-colors z-10 p-1 hover:bg-slate-100 rounded-full">
              <X size={24} />
            </button>
            
            {loadingCard ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
                <span className="text-sm text-slate-400 font-bold tracking-tight">카드 정보를 불러오는 중...</span>
              </div>
            ) : cardDetails ? (
              <>
                <div className="p-8 pb-6 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50 shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag size={14} className="text-sky-500" />
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Card Details</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 leading-tight pr-10">{cardDetails.name}</h2>
                  
                  {cardDetails.labels && cardDetails.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {cardDetails.labels.map((label: any) => (
                        <span key={label.id} className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-sm ${labelColor(label.color)}`}>
                          {label.name || label.color}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {cardDetails.shortUrl && (
                    <div className="mt-4">
                      <a href={cardDetails.shortUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[12px] font-bold text-sky-500 hover:text-sky-700 transition-colors bg-sky-50 px-3 py-1.5 rounded-full border border-sky-100">
                        <ExternalLink size={12} /> 트렐로 원본 보기
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-[#fcfcfc]">
                  {/* Description */}
                  <section>
                    <h3 className="text-[14px] font-black text-slate-700 flex items-center gap-2 mb-4 uppercase tracking-wider"><AlignLeft size={16} className="text-slate-400" /> 설명</h3>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 text-[14px] text-slate-600 leading-relaxed shadow-sm relative">
                      {cardDetails.desc ? (
                        <>
                          <div className={`overflow-hidden prose prose-sm max-w-none prose-slate transition-all duration-300 ${isDescriptionExpanded ? '' : 'line-clamp-6 max-h-[9rem]'}`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{cardDetails.desc}</ReactMarkdown>
                          </div>
                          {cardDetails.desc.length > 200 && (
                            <button onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className="mt-3 text-sky-500 font-black text-[12px] hover:text-sky-700 transition-colors flex items-center gap-1">
                              {isDescriptionExpanded ? '간략히 보기' : '전체 보기...'}
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-400 italic font-medium">설명이 비어있습니다.</span>
                      )}
                    </div>
                  </section>

                  {/* Attachments */}
                  {cardDetails.attachments && cardDetails.attachments.length > 0 && (
                    <section>
                      <h3 className="text-[14px] font-black text-slate-700 flex items-center gap-2 mb-4 uppercase tracking-wider"><Paperclip size={16} className="text-slate-400" /> 첨부파일</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {cardDetails.attachments.slice().sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((att: any) => (
                          <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-sky-300 hover:shadow-md transition-all group">
                            <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                              <Paperclip size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-bold text-slate-700 truncate group-hover:text-sky-600 transition-colors">{att.name}</div>
                              <div className="text-[11px] text-slate-400 font-medium">파일 첨부됨</div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Checklists */}
                  {cardDetails.checklists && cardDetails.checklists.length > 0 && (
                    <section>
                      <h3 className="text-[14px] font-black text-slate-700 flex items-center gap-2 mb-4 uppercase tracking-wider"><CheckSquare size={16} className="text-slate-400" /> 체크리스트</h3>
                      <div className="space-y-6">
                        {cardDetails.checklists.map((cl: any) => {
                          const total = cl.checkItems.length;
                          const completed = cl.checkItems.filter((i: any) => i.state === 'complete').length;
                          const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                          return (
                            <div key={cl.id} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-[14px] font-bold text-slate-700">{cl.name}</h4>
                                <span className="text-[11px] font-black text-sky-500 bg-white px-2 py-0.5 rounded-full border border-sky-100">{percent}%</span>
                              </div>
                              <div className="h-2 w-full bg-slate-200 rounded-full mb-4 overflow-hidden border border-slate-300/30">
                                <div className="h-full bg-sky-500 rounded-full transition-all duration-500 ease-out shadow-sm" style={{ width: `${percent}%` }}></div>
                              </div>
                              <div className="space-y-1">
                                {cl.checkItems.map((item: any) => (
                                  <div key={item.id} className={`group flex items-start gap-3 p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all ${item.state === 'complete' ? 'opacity-50' : ''}`}>
                                    <input type="checkbox" checked={item.state === 'complete'} onChange={() => handleCheck(item.id, cardDetails.id, item.state)} className="mt-1 w-4 h-4 accent-sky-500 rounded border-slate-300 cursor-pointer shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-[13.5px] leading-tight ${item.state === 'complete' ? 'line-through text-slate-400' : 'text-slate-700 font-bold'}`}>{item.name}</p>
                                    </div>
                                    <button onClick={() => handleDeleteCheckItem(cl.id, item.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all px-1.5" title="삭제"><X size={14}/></button>
                                  </div>
                                ))}
                                {addingChecklistId === cl.id ? (
                                  <div className="mt-3 p-3 bg-white rounded-xl border border-sky-200 shadow-sm flex flex-col gap-2">
                                    <input autoFocus type="text" value={newCheckItemName} onChange={e => setNewCheckItemName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddCheckItem(cl.id); }} className="w-full text-[13px] px-3 py-2 border border-slate-200 rounded-lg focus:border-sky-400 outline-none transition-colors" placeholder="항목 내용을 입력하세요..." />
                                    <div className="flex justify-end gap-2">
                                      <button onClick={() => setAddingChecklistId(null)} className="text-[11px] px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg font-bold transition-colors">취소</button>
                                      <button onClick={() => handleAddCheckItem(cl.id)} className="text-[11px] px-4 py-1.5 bg-sky-500 text-white hover:bg-sky-600 rounded-lg font-bold shadow-sm transition-colors">추가하기</button>
                                    </div>
                                  </div>
                                ) : (
                                  <button onClick={() => { setAddingChecklistId(cl.id); setNewCheckItemName(''); }} className="w-full text-left px-3 py-2 mt-2 text-[12px] font-bold text-slate-400 hover:text-sky-600 hover:bg-white rounded-xl transition-all flex items-center gap-2"><Plus size={14} /> 항목 추가</button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* Comments */}
                  <section>
                    <h3 className="text-[14px] font-black text-slate-700 flex items-center gap-2 mb-4 uppercase tracking-wider"><MessageSquare size={16} className="text-slate-400" /> 댓글</h3>
                    <div className="flex flex-col gap-3 mb-6 relative">
                      <textarea value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }} className="w-full p-4 pr-14 text-[14px] border border-slate-200 rounded-2xl bg-white focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50 shadow-sm resize-none transition-all" placeholder="의견을 남겨보세요..." rows={2} />
                      <button onClick={handleAddComment} disabled={!commentText.trim()} className="absolute right-3 bottom-3 p-2 bg-sky-500 text-white rounded-xl hover:bg-sky-600 disabled:opacity-30 disabled:bg-slate-300 transition-all shadow-md active:scale-95"><Send size={18} /></button>
                    </div>
                    <div className="space-y-4">
                      {cardDetails.actions?.filter((a: any) => a.type === 'commentCard').map((comment: any) => (
                        <div key={comment.id} className="flex gap-4">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-black text-slate-500 text-[12px] shrink-0 uppercase border border-white shadow-sm">{comment.memberCreator.fullName.charAt(0)}</div>
                          <div className="flex-1 bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-black text-slate-700">{comment.memberCreator.fullName}</span>
                                <span className="text-[11px] font-bold text-slate-300">{getTimeAgo(comment.date)}</span>
                              </div>
                              <button onClick={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.data.text); }} className="text-[11px] font-bold text-slate-400 hover:text-sky-500 transition-colors">수정</button>
                            </div>
                            {editingCommentId === comment.id ? (
                              <div className="mt-3 flex flex-col gap-2">
                                <textarea autoFocus value={editingCommentText} onChange={e => setEditingCommentText(e.target.value)} className="w-full p-3 text-[13px] border border-sky-100 rounded-xl focus:border-sky-400 outline-none resize-none bg-sky-50/30" rows={2} />
                                <div className="flex gap-2 justify-end">
                                  <button onClick={() => setEditingCommentId(null)} className="text-[11px] font-bold px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg">취소</button>
                                  <button onClick={() => handleEditComment(comment.id)} className="text-[11px] font-bold px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg shadow-sm">저장하기</button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-[14px] text-slate-600 leading-relaxed prose prose-sm max-w-none prose-slate">
                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{comment.data.text}</ReactMarkdown>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {(!cardDetails.actions || cardDetails.actions.filter((a: any) => a.type === 'commentCard').length === 0) && (
                        <div className="text-[13px] text-slate-400 italic text-center py-10 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">첫 번째 댓글을 남겨보세요.</div>
                      )}
                    </div>
                  </section>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10 text-center">
                <Tag size={48} className="mb-4 opacity-10" />
                <p className="font-bold">데이터를 불러오지 못했습니다.</p>
                <button onClick={() => openCardModal(selectedCardId!)} className="mt-4 text-sky-500 font-bold hover:underline">다시 시도</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
